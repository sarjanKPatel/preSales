import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(request: Request) {
  try {
    const { company, query } = await request.json();

    const startTime = Date.now();

    // Use the standard API for now (Deep Research via Agents SDK coming next)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant. Provide a brief, factual summary based on your knowledge. Keep it under 200 words.",
        },
        {
          role: "user",
          content:
            query ||
            `Provide a brief overview of ${company}, including size, industry, and any recent notable developments.`,
        },
      ],
      max_tokens: 300,
    });

    const duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      summary: response.choices[0].message.content,
      stats: {
        searches: 0, // Will be populated with real Deep Research
        pagesRead: 0,
        duration,
      },
      note: "This is using standard GPT-4. Deep Research integration coming next!",
    });
  } catch (error: unknown) {
    console.error("Deep research test error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to perform research",
      },
      { status: 500 }
    );
  }
}
