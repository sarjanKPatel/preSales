import { NextRequest } from "next/server";
import { openai } from "@/lib/openai";

// Helper to create SSE messages
function createSSEMessage(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Timeout wrapper
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("OpenAI request timed out")),
      ms
    );
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  let writer: WritableStreamDefaultWriter | null = null;
  let stream: TransformStream | null = null;

  try {
    const body = await request.json();
    const { company, industry = "", useCase = "", requirements = "" } = body;

    stream = new TransformStream();
    writer = stream.writable.getWriter();

    // Helper to send progress
    async function sendProgress(
      status: string,
      message: string,
      modelUsed: string
    ) {
      await writer!.write(
        encoder.encode(
          createSSEMessage({
            type: "progress",
            status,
            message,
            metadata: {
              modelUsed,
              timestamp: new Date().toISOString(),
              company,
              industry,
              useCase,
            },
          })
        )
      );
    }

    await sendProgress(
      "started",
      `Starting Deep Research for ${company}...`,
      "pending"
    );
    await sendProgress(
      "researching",
      `Attempting to use Deep Research model...`,
      "o3-deep-research"
    );

    // Build research input
    const researchInput = `
Company: ${company}
Industry: ${industry}
Use Case: ${useCase}

Research Requirements:
${
  requirements ||
  "Provide comprehensive company analysis including recent news, leadership, technology, and opportunities."
}

Please provide the following sections:
1. Company Overview
2. Industry Analysis
3. Use Case Fit
4. Implementation Strategy
5. ROI Estimation
6. Risk Assessment
7. Competitive Advantage
8. Recommendations
`;

    let modelUsed = "o3-deep-research";
    let responseData: any = null;
    let fallback = false;

    try {
      // Try Deep Research model with timeout
      const response = await withTimeout(
        openai.responses.create({
          model: "o3-deep-research",
          input: researchInput,
          tools: [
            { type: "web_search_preview" },
            { type: "code_interpreter", container: { type: "auto" } },
          ],
        }),
        60000
      );

      // Parse Deep Research response
      responseData = parseDeepResearchResponse(response, {
        company,
        industry,
        useCase,
        modelUsed,
      });
    } catch (err: any) {
      // Fallback to GPT-4 Turbo
      fallback = true;
      modelUsed = "gpt-4-turbo-preview";
      await sendProgress(
        "fallback",
        "Deep Research model not available or timed out. Using GPT-4 Turbo as fallback...",
        modelUsed
      );
      try {
        const fallbackResponse = await withTimeout(
          openai.chat.completions.create({
            model: modelUsed,
            messages: [
              {
                role: "system",
                content:
                  "You are a business research analyst. Provide detailed, structured analysis based on your knowledge. Note when information might be outdated.",
              },
              {
                role: "user",
                content: researchInput,
              },
            ],
            temperature: 0.3,
            max_tokens: 4000,
          }),
          60000
        );
        responseData = parseGPT4Response(fallbackResponse, {
          company,
          industry,
          useCase,
          modelUsed,
        });
      } catch (fallbackErr: any) {
        // Both models failed
        await writer!.write(
          encoder.encode(
            createSSEMessage({
              type: "error",
              message:
                fallbackErr.message ||
                "Both Deep Research and GPT-4 Turbo failed",
              details: fallbackErr.stack || String(fallbackErr),
              metadata: {
                modelUsed,
                timestamp: new Date().toISOString(),
                company,
                industry,
                useCase,
              },
            })
          )
        );
        await writer!.close();
        return new Response(stream.readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
    }

    // Send complete event
    await writer!.write(
      encoder.encode(
        createSSEMessage({
          type: "complete",
          results: responseData,
          metadata: {
            modelUsed,
            timestamp: new Date().toISOString(),
            company,
            industry,
            useCase,
            fallback,
          },
        })
      )
    );
    await writer!.close();
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    // Top-level error
    if (writer) {
      await writer.write(
        new TextEncoder().encode(
          createSSEMessage({
            type: "error",
            message: error.message || "Unknown error in Deep Research API",
            details: error.stack || String(error),
            metadata: {
              timestamp: new Date().toISOString(),
            },
          })
        )
      );
      await writer.close();
    }
    return new Response(stream?.readable ?? null, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      status: 500,
    });
  }
}

// --- Parsing Functions ---

function parseDeepResearchResponse(response: any, meta: any) {
  // The Responses API returns an output array with a final message
  const output = response.output || [];
  const messageObj = output.find((item: any) => item.type === "message");
  const text = messageObj?.content?.[0]?.text || "";
  return parseSections(text, meta, "o3-deep-research");
}

function parseGPT4Response(response: any, meta: any) {
  const text = response.choices?.[0]?.message?.content || "";
  return parseSections(text, meta, "gpt-4-turbo-preview");
}

function parseSections(text: string, meta: any, model: string) {
  // Extract 8 sections by headers
  const sectionHeaders = [
    "Company Overview",
    "Industry Analysis",
    "Use Case Fit",
    "Implementation Strategy",
    "ROI Estimation",
    "Risk Assessment",
    "Competitive Advantage",
    "Recommendations",
  ];
  const result: Record<string, string> = {};
  let current = "";
  let buffer: string[] = [];
  for (const line of text.split("\n")) {
    const header = sectionHeaders.find((h) =>
      line.trim().toLowerCase().startsWith(h.toLowerCase())
    );
    if (header) {
      if (current) result[current] = buffer.join("\n").trim();
      current = header;
      buffer = [];
    } else if (current) {
      buffer.push(line);
    }
  }
  if (current) result[current] = buffer.join("\n").trim();
  return {
    ...result,
    fullText: text,
    metadata: {
      ...meta,
      modelUsed: model,
      timestamp: new Date().toISOString(),
    },
  };
}
