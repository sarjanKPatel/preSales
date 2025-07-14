import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST() {
  try {
    // Test basic OpenAI connection
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: 'Say "OpenAI connection successful!" in a friendly way.',
        },
      ],
      max_tokens: 50,
    });

    return NextResponse.json({
      success: true,
      message: completion.choices[0].message.content,
      model: completion.model,
    });
  } catch (error: unknown) {
    console.error("OpenAI test error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to OpenAI",
      },
      { status: 500 }
    );
  }
}
