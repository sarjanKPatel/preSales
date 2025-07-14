import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(request: Request) {
  try {
    const { company, contact } = await request.json();

    // For now, use GPT-4 to simulate the checklist
    // Real Deep Research implementation will come next
    const prompt = `Create a pre-demo checklist for ${company}.
Contact: ${contact.name} (${contact.title})
Demo Date: ${contact.demoDate}

Provide a realistic but brief assessment including:
1. Company overview (2-3 sentences)
2. Recent news (1-2 items)
3. 3-4 key executives
4. 4-5 technologies they likely use
5. 2-3 recent initiatives
6. 3-4 potential pain points
7. 2-3 competitors they might use
8. Budget indicators
9. 3-4 demo focus recommendations

Format as JSON matching this structure:
{
  "companyOverview": "string",
  "recentNews": "string",
  "keyExecutives": { "name": "title" },
  "technologyStack": ["tech1", "tech2"],
  "recentInitiatives": ["initiative1"],
  "potentialPainPoints": ["pain1"],
  "competitorUsage": ["competitor1"],
  "budgetIndicators": "string",
  "recommendedDemoFocus": ["focus1"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a pre-sales research assistant. Provide realistic, detailed information.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const checklist = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json({
      success: true,
      checklist,
      note: "Generated with GPT-4. Deep Research version will include real web data!",
    });
  } catch (error: unknown) {
    console.error("Pre-demo checklist error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate checklist",
      },
      { status: 500 }
    );
  }
}
