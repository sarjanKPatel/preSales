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
    const { company, requirements } = body;

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
              status: "initializing",
              message: `Starting Deep Research for ${company}...`,
              searchCount: 0,
              pagesRead: 0,
            })
          )
        );

        // Build the research input
        const researchInput = `
Company: ${company}

Research Requirements:
${
  requirements ||
  "Provide comprehensive company analysis including recent news, leadership, technology, and opportunities."
}

Please provide:
1. Company overview with latest information
2. Recent news and developments (focus on 2024-2025)
3. Current leadership team with actual names and titles
4. Technology stack and digital infrastructure
5. Business challenges and pain points
6. Opportunities for AI/automation solutions
7. Specific recommendations for engagement

Include specific facts, figures, and recent events. Cite sources where possible.
`;

        try {
          // Use the RESPONSES API for Deep Research
          const response = await openai.responses.create({
            model: "o3-deep-research",
            input: researchInput,
            tools: [
              { type: "web_search_preview" },
              { type: "code_interpreter", container: { type: "auto" } },
            ],
          });

          // Track progress by monitoring the output array
          let searchCount = 0;
          const pagesRead = 0;

          // Process intermediate steps
          for (const item of response.output) {
            if (item.type === "web_search_call") {
              searchCount++;
              await writer.write(
                encoder.encode(
                  createSSEMessage({
                    type: "progress",
                    status: "searching",
                    message: `Performing web search...`,
                    searchCount,
                    pagesRead,
                  })
                )
              );
            } else if (item.type === "code_interpreter_call") {
              await writer.write(
                encoder.encode(
                  createSSEMessage({
                    type: "progress",
                    status: "analyzing",
                    message: "Analyzing data...",
                    searchCount,
                    pagesRead,
                  })
                )
              );
            }
          }

          // Get the final message
          const finalMessage = response.output.find(
            (item) => item.type === "message"
          );
          const finalText =
            finalMessage?.content?.[0] && "text" in finalMessage.content[0]
              ? finalMessage.content[0].text
              : "";
          const annotations =
            finalMessage?.content?.[0] &&
            "annotations" in finalMessage.content[0]
              ? finalMessage.content[0].annotations
              : [];

          // Parse the response into structured format
          const structuredResults = parseDeepResearchResponse(finalText, {
            company,
            searchCount,
            pagesRead,
            model: "o3-deep-research",
            annotations,
          });

          // Send completion
          await writer.write(
            encoder.encode(
              createSSEMessage({
                type: "complete",
                results: structuredResults,
              })
            )
          );
        } catch (apiError: unknown) {
          console.error("Deep Research API error:", apiError);

          // Check if it's a model availability issue
          const error = apiError as { code?: string; status?: number };
          if (error.code === "model_not_found" || error.status === 404) {
            // Fallback to GPT-4
            await writer.write(
              encoder.encode(
                createSSEMessage({
                  type: "progress",
                  status: "fallback",
                  message:
                    "Deep Research model not available in your region/account. Using GPT-4 instead.",
                })
              )
            );

            // Use standard chat completions as fallback
            const fallbackResponse = await openai.chat.completions.create({
              model: "gpt-4-turbo-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a business research analyst. Provide detailed analysis based on your training data. Be clear when information might be outdated.",
                },
                {
                  role: "user",
                  content: researchInput,
                },
              ],
              temperature: 0.3,
              max_tokens: 4000,
            });

            const structuredResults = parseDeepResearchResponse(
              fallbackResponse.choices[0].message.content || "",
              {
                company,
                searchCount: 0,
                pagesRead: 0,
                model: "gpt-4-turbo-preview",
                note: "Deep Research not available. Using GPT-4 knowledge base (training data up to April 2024).",
                annotations: [],
              }
            );

            await writer.write(
              encoder.encode(
                createSSEMessage({
                  type: "complete",
                  results: structuredResults,
                })
              )
            );
          } else {
            throw apiError;
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Research failed";
        const errorDetails =
          error instanceof Error ? error.toString() : String(error);

        await writer.write(
          encoder.encode(
            createSSEMessage({
              type: "error",
              message: errorMessage,
              details: errorDetails,
            })
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Deep research error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to start research";
    const errorDetails =
      error instanceof Error ? error.toString() : String(error);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Enhanced parsing function that handles citations
function parseDeepResearchResponse(
  content: string,
  metadata: {
    company: string;
    searchCount: number;
    pagesRead: number;
    model: string;
    annotations?: Array<{
      title: string;
      url: string;
      start_index?: number;
      end_index?: number;
    }>;
    note?: string;
  }
): {
  companyOverview: string;
  recentDevelopments: string[];
  keyStakeholders: Array<{ name: string; role: string }>;
  technologyStack: string[];
  challenges: string[];
  opportunities: string[];
  recommendations: string[];
  citations: Array<{ title: string; url: string }>;
  fullReport: string;
  metadata: {
    company: string;
    searchCount: number;
    pagesRead: number;
    model: string;
    annotations?: Array<{
      title: string;
      url: string;
      start_index?: number;
      end_index?: number;
    }>;
    note?: string;
    timestamp: string;
  };
} {
  // Extract sections using improved parsing
  const sections = {
    companyOverview: "",
    recentDevelopments: [] as string[],
    keyStakeholders: [] as Array<{ name: string; role: string }>,
    technologyStack: [] as string[],
    challenges: [] as string[],
    opportunities: [] as string[],
    recommendations: [] as string[],
    citations: [] as Array<{ title: string; url: string }>,
  };

  // Split content into lines for parsing
  const lines = content.split("\n");
  let currentSection = "";

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Detect section headers
    if (trimmedLine.match(/company overview|executive summary/i)) {
      currentSection = "overview";
    } else if (
      trimmedLine.match(/recent news|recent developments|latest news/i)
    ) {
      currentSection = "developments";
    } else if (
      trimmedLine.match(/leadership|executives|key stakeholders|team/i)
    ) {
      currentSection = "stakeholders";
    } else if (trimmedLine.match(/technology|tech stack|infrastructure/i)) {
      currentSection = "technology";
    } else if (trimmedLine.match(/challenges|pain points|issues/i)) {
      currentSection = "challenges";
    } else if (trimmedLine.match(/opportunities|recommendations|engagement/i)) {
      currentSection = "opportunities";
    }

    // Parse content based on current section
    if (trimmedLine && !trimmedLine.match(/^#|^\*\*.*\*\*$/)) {
      switch (currentSection) {
        case "overview":
          sections.companyOverview += line + "\n";
          break;

        case "developments":
          if (trimmedLine.match(/^[-•*]|^\d+\./)) {
            sections.recentDevelopments.push(
              trimmedLine.replace(/^[-•*]\s*|\d+\.\s*/, "").trim()
            );
          }
          break;

        case "stakeholders":
          // Parse "Name - Title" or "Name: Title" patterns
          const stakeholderMatch = trimmedLine.match(
            /^[-•*]?\s*([^-:]+)\s*[-:]\s*(.+)$/
          );
          if (stakeholderMatch) {
            sections.keyStakeholders.push({
              name: stakeholderMatch[1].trim(),
              role: stakeholderMatch[2].trim(),
            });
          }
          break;

        case "technology":
          if (trimmedLine.match(/^[-•*]|^\d+\./)) {
            sections.technologyStack.push(
              trimmedLine.replace(/^[-•*]\s*|\d+\.\s*/, "").trim()
            );
          }
          break;

        case "challenges":
          if (trimmedLine.match(/^[-•*]|^\d+\./)) {
            sections.challenges.push(
              trimmedLine.replace(/^[-•*]\s*|\d+\.\s*/, "").trim()
            );
          }
          break;

        case "opportunities":
          if (trimmedLine.match(/^[-•*]|^\d+\./)) {
            sections.recommendations.push(
              trimmedLine.replace(/^[-•*]\s*|\d+\.\s*/, "").trim()
            );
          }
          break;
      }
    }
  }

  // Extract citations if present
  const citationMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
  if (citationMatches) {
    citationMatches.forEach((match) => {
      const [, title, url] = match.match(/\[([^\]]+)\]\(([^)]+)\)/) || [];
      if (title && url) {
        sections.citations.push({ title, url });
      }
    });
  }

  // Add citations from annotations
  const citations =
    metadata.annotations?.map((ann) => ({
      title: ann.title,
      url: ann.url,
      startIndex: ann.start_index,
      endIndex: ann.end_index,
    })) || [];

  return {
    companyOverview: sections.companyOverview,
    recentDevelopments: sections.recentDevelopments,
    keyStakeholders: sections.keyStakeholders,
    technologyStack: sections.technologyStack,
    challenges: sections.challenges,
    opportunities: sections.opportunities,
    recommendations: sections.recommendations,
    citations: [...sections.citations, ...citations],
    fullReport: content,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  };
}
