import { NextRequest } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { company, requirements, useCase } = await request.json();

    // Create comprehensive checklist prompt
    const checklistPrompt = `Create a detailed pre-demo checklist for ${company} based on the following context:

Use Case: ${useCase}
Requirements: ${requirements}

Please provide a structured checklist with the following sections:

1. COMPANY OVERVIEW
- Company size and industry
- Current business model and revenue streams
- Key products/services
- Recent developments or news

2. RECENT NEWS
- Latest announcements, partnerships, or acquisitions
- Industry trends affecting the company
- Financial performance updates (if public)

3. KEY EXECUTIVES
- C-suite executives with names and roles
- Decision makers in relevant departments
- Their backgrounds and priorities

4. TECHNOLOGY STACK
- Current software and tools they use
- Integration requirements
- Digital transformation initiatives
- IT decision-making structure

5. RECENT INITIATIVES
- Ongoing projects or transformations
- Strategic priorities
- Technology adoption plans

6. POTENTIAL PAIN POINTS
- Industry-specific challenges
- Growth or scaling issues
- Technology adoption barriers
- Operational inefficiencies

7. COMPETITOR USAGE
- What competitors might be using
- Market positioning
- Competitive landscape

8. BUDGET INDICATORS
- Company financial health
- Investment in technology
- Budget allocation patterns

9. RECOMMENDED DEMO FOCUS
- Key areas to highlight
- Specific use cases to demonstrate
- Potential objections to address
- Success metrics to discuss

Format each section with clear bullet points and actionable insights.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert sales consultant specializing in pre-demo preparation. Create comprehensive, actionable checklists that help sales teams understand prospects and prepare effective demos.",
        },
        {
          role: "user",
          content: checklistPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const rawOutput = completion.choices[0].message.content || "";

    // Parse the output into structured format
    const structuredChecklist = parseChecklistOutput(rawOutput);

    return new Response(
      JSON.stringify({
        success: true,
        checklist: structuredChecklist,
        metadata: {
          company,
          useCase,
          requirements,
          model: "gpt-4o",
          tokens: completion.usage?.total_tokens,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate checklist";
    console.error("Pre-demo checklist error:", error);
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

// Helper function to parse checklist output
function parseChecklistOutput(text: string): Record<string, unknown> {
  const sections = text.split(/\n(?=\d+\.|\*\*)/);

  const result: Record<string, unknown> = {
    companyOverview: "",
    recentNews: "",
    keyExecutives: {},
    technologyStack: [],
    recentInitiatives: [],
    potentialPainPoints: [],
    competitorUsage: [],
    budgetIndicators: "",
    recommendedDemoFocus: [],
  };

  for (const section of sections) {
    const lowerSection = section.toLowerCase();

    if (lowerSection.includes("company overview")) {
      result.companyOverview = section
        .replace(/^\d+\.\s*company overview\s*/i, "")
        .trim();
    } else if (lowerSection.includes("recent news")) {
      result.recentNews = section
        .replace(/^\d+\.\s*recent news\s*/i, "")
        .trim();
    } else if (lowerSection.includes("key executive")) {
      const items = section
        .split("\n")
        .slice(1)
        .filter((line) => line.trim());
      const executives: Record<string, string> = {};
      items.forEach((item) => {
        const match = item.match(/^[-•]?\s*([^:]+):\s*(.+)$/);
        if (match) {
          executives[match[1].trim()] = match[2].trim();
        }
      });
      result.keyExecutives = executives;
    } else if (lowerSection.includes("technology stack")) {
      const items = section
        .split("\n")
        .slice(1)
        .filter(
          (line) => line.trim().startsWith("-") || line.trim().startsWith("•")
        );
      result.technologyStack = items.map((item) =>
        item.replace(/^[-•]\s*/, "").trim()
      );
    } else if (lowerSection.includes("recent initiative")) {
      const items = section
        .split("\n")
        .slice(1)
        .filter(
          (line) => line.trim().startsWith("-") || line.trim().startsWith("•")
        );
      result.recentInitiatives = items.map((item) =>
        item.replace(/^[-•]\s*/, "").trim()
      );
    } else if (lowerSection.includes("pain point")) {
      const items = section
        .split("\n")
        .slice(1)
        .filter(
          (line) => line.trim().startsWith("-") || line.trim().startsWith("•")
        );
      result.potentialPainPoints = items.map((item) =>
        item.replace(/^[-•]\s*/, "").trim()
      );
    } else if (lowerSection.includes("competitor")) {
      const items = section
        .split("\n")
        .slice(1)
        .filter(
          (line) => line.trim().startsWith("-") || line.trim().startsWith("•")
        );
      result.competitorUsage = items.map((item) =>
        item.replace(/^[-•]\s*/, "").trim()
      );
    } else if (lowerSection.includes("budget indicator")) {
      result.budgetIndicators = section
        .replace(/^\d+\.\s*budget indicator\s*/i, "")
        .trim();
    } else if (lowerSection.includes("recommended demo focus")) {
      const items = section
        .split("\n")
        .slice(1)
        .filter(
          (line) => line.trim().startsWith("-") || line.trim().startsWith("•")
        );
      result.recommendedDemoFocus = items.map((item) =>
        item.replace(/^[-•]\s*/, "").trim()
      );
    }
  }

  return result;
}
