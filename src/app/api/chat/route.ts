import { NextRequest } from "next/server";
import { openai } from "@/lib/openai";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, proposalContext } = await request.json();

    // System prompt for the AI assistant
    const systemPrompt = `You are an AI assistant helping to create sales proposals. 
    You have deep knowledge of sales processes, proposal writing, and business analysis.
    Be helpful, professional, and provide actionable insights.
    ${
      proposalContext
        ? `Context about the proposal: ${JSON.stringify(proposalContext)}`
        : ""
    }`;

    // Get conversation history if available
    let conversationHistory: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }> = [];
    if (sessionId) {
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (!error && messages) {
        conversationHistory = messages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        }));
      }
    }

    // Create the OpenAI request
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-10), // Last 10 messages for context
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0].message.content;

    // Save the AI response to the database
    if (sessionId) {
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: aiResponse,
        metadata: {
          model: "gpt-4o",
          timestamp: new Date().toISOString(),
          tokens: completion.usage?.total_tokens,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: aiResponse,
        metadata: {
          model: "gpt-4o",
          tokens: completion.usage?.total_tokens,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process chat message";
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
