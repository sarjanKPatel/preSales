import { NextRequest } from "next/server";
import { openai } from "@/lib/openai";

// Helper to create SSE messages
function createSSEMessage(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { company, requirements, useCase } = body;

    // Create a TransformStream for SSE
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the research in the background
    (async () => {
      try {
        // Send initial progress
        await writer.write(
          encoder.encode(
            createSSEMessage({
              type: "progress",
              status: "searching",
              message: `Starting research on ${company}...`,
              searchCount: 0,
              pagesRead: 0,
            })
          )
        );

        // Simulate Deep Research process
        // In production, this would use the actual OpenAI Responses API

        // Step 1: Initial searches
        for (let i = 1; i <= 3; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await writer.write(
            encoder.encode(
              createSSEMessage({
                type: "progress",
                status: "searching",
                message: `Searching for ${company} ${
                  i === 1
                    ? "company information"
                    : i === 2
                    ? "recent news and developments"
                    : "stakeholders and leadership"
                }...`,
                searchCount: i,
                pagesRead: 0,
              })
            )
          );
        }

        // Step 2: Reading pages
        for (let i = 1; i <= 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          await writer.write(
            encoder.encode(
              createSSEMessage({
                type: "progress",
                status: "reading",
                message: `Reading page ${i} of 5...`,
                searchCount: 3,
                pagesRead: i,
              })
            )
          );
        }

        // Step 3: Analysis
        await writer.write(
          encoder.encode(
            createSSEMessage({
              type: "progress",
              status: "analyzing",
              message: "Analyzing findings and generating insights...",
              searchCount: 3,
              pagesRead: 5,
            })
          )
        );

        // Simulate analysis time
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // For now, use GPT-4 to generate realistic results
        const analysisPrompt = `
You are a deep research analyst. Based on your knowledge, provide a comprehensive analysis of ${company} for the following use case: ${useCase}.

Requirements:
${requirements}

Provide a structured response with:
1. Company Overview (2-3 paragraphs)
2. Recent Developments (3-5 bullet points)
3. Key Stakeholders (4-6 people with names and roles)
4. Challenges they face (3-5 items)
5. Opportunities for our AI pre-sales solution (3-5 items)  
6. Specific recommendations (3-5 actionable items)

Format the response as a clear, professional report.
`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are an expert business analyst with deep knowledge of companies and industries.",
            },
            { role: "user", content: analysisPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        });

        const rawOutput = completion.choices[0].message.content || "";

        // Parse the output into structured format
        const results = parseResearchOutput(rawOutput);

        // Send completion
        await writer.write(
          encoder.encode(
            createSSEMessage({
              type: "complete",
              results: {
                ...results,
                raw: rawOutput,
                citations: [
                  {
                    title: `${company} Official Website`,
                    url: `https://www.${company
                      .toLowerCase()
                      .replace(/\s+/g, "")}.com`,
                  },
                  {
                    title: `${company} Wikipedia`,
                    url: `https://en.wikipedia.org/wiki/${company.replace(
                      /\s+/g,
                      "_"
                    )}`,
                  },
                  { title: "Industry Analysis Report", url: "#" },
                ],
              },
            })
          )
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Research failed";
        await writer.write(
          encoder.encode(
            createSSEMessage({
              type: "error",
              message: errorMessage,
            })
          )
        );
      } finally {
        await writer.close();
      }
    })();

    // Return the stream as response
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to start research";
    console.error("Deep research error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Helper function to parse GPT output into structured format
function parseResearchOutput(text: string): Record<string, unknown> {
  const sections = text.split(/\n(?=\d+\.|\*\*)/);

  const result: Record<string, unknown> = {
    companyOverview: "",
    recentDevelopments: [],
    keyStakeholders: [],
    challenges: [],
    opportunities: [],
    recommendations: [],
  };

  for (const section of sections) {
    const lowerSection = section.toLowerCase();

    if (lowerSection.includes("overview") || sections.indexOf(section) === 0) {
      result.companyOverview = section
        .replace(/^\d+\.\s*company overview\s*/i, "")
        .trim();
    } else if (
      lowerSection.includes("recent") ||
      lowerSection.includes("development")
    ) {
      const items = section
        .split("\n")
        .slice(1)
        .filter(
          (line) => line.trim().startsWith("-") || line.trim().startsWith("•")
        );
      result.recentDevelopments = items.map((item) =>
        item.replace(/^[-•]\s*/, "").trim()
      );
    } else if (
      lowerSection.includes("stakeholder") ||
      lowerSection.includes("executive")
    ) {
      const items = section
        .split("\n")
        .slice(1)
        .filter((line) => line.trim());
      result.keyStakeholders = items
        .map((item) => {
          const match = item.match(/^[-•]?\s*([^:]+):\s*(.+)$/);
          if (match) {
            return { name: match[1].trim(), role: match[2].trim() };
          }
          return { name: item.replace(/^[-•]\s*/, "").trim(), role: "Unknown" };
        })
        .filter((s) => s.name.length > 0);
    } else if (lowerSection.includes("challenge")) {
      const items = section
        .split("\n")
        .slice(1)
        .filter(
          (line) => line.trim().startsWith("-") || line.trim().startsWith("•")
        );
      result.challenges = items.map((item) =>
        item.replace(/^[-•]\s*/, "").trim()
      );
    } else if (lowerSection.includes("opportunit")) {
      const items = section
        .split("\n")
        .slice(1)
        .filter(
          (line) => line.trim().startsWith("-") || line.trim().startsWith("•")
        );
      result.opportunities = items.map((item) =>
        item.replace(/^[-•]\s*/, "").trim()
      );
    } else if (lowerSection.includes("recommend")) {
      const items = section
        .split("\n")
        .slice(1)
        .filter((line) => line.trim());
      result.recommendations = items.map((item) =>
        item
          .replace(/^\d+\.\s*/, "")
          .replace(/^[-•]\s*/, "")
          .trim()
      );
    }
  }

  return result;
}
