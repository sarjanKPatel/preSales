import { OpenAI } from "openai";
import { z } from "zod";

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  dangerouslyAllowBrowser:
    process.env.NEXT_PUBLIC_ENVIRONMENT === "development", // Only for dev
});

// For production, you'll want to create API routes instead of client-side calls
export const isClientSide = typeof window !== "undefined";

// Agent configurations
export const AGENT_MODELS = {
  DEEP_RESEARCH: "o3-deep-research-2025-06-26",
  DEEP_RESEARCH_MINI: "o4-mini-deep-research-2025-06-26",
  GPT4: "gpt-4o",
  GPT4_MINI: "gpt-4o-mini",
} as const;

// Pre-demo checklist schema
export const PreDemoChecklistSchema = z.object({
  companyOverview: z.string(),
  recentNews: z.string(),
  keyExecutives: z.record(z.string()), // name -> title
  technologyStack: z.array(z.string()),
  recentInitiatives: z.array(z.string()),
  potentialPainPoints: z.array(z.string()),
  competitorUsage: z.array(z.string()),
  budgetIndicators: z.string(),
  recommendedDemoFocus: z.array(z.string()),
});

export type PreDemoChecklist = z.infer<typeof PreDemoChecklistSchema>;

// Lead qualification schema
export const LeadQualificationSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  useCases: z.array(z.string()),
  painPoints: z.array(z.string()),
  budgetRange: z.string().optional(),
  timeline: z.string().optional(),
  decisionMakers: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      influence: z.enum(["high", "medium", "low"]),
    })
  ),
  nextSteps: z.array(z.string()),
});

export type LeadQualification = z.infer<typeof LeadQualificationSchema>;

// Deep Research function using the Responses API
export async function performDeepResearch(
  company: string,
  requirements: string,
  options?: {
    model?: string;
    maxSearches?: number;
    timeout?: number;
  }
) {
  const model = options?.model || AGENT_MODELS.DEEP_RESEARCH_MINI;
  const timeout = options?.timeout || 600000; // 10 minutes default

  // Create the research query
  const query = `
Company: ${company}

Requirements:
${requirements}

Please provide comprehensive research including:
1. Company overview and current status
2. Recent developments and news
3. Technology stack and integrations
4. Key stakeholders and decision makers
5. Potential challenges and pain points
6. Competitive landscape
7. Budget indicators and financial health
8. Recommendations for engagement

Be thorough and include specific details with sources.
`;

  // This will use the Responses API when available
  // For now, return a placeholder
  return {
    query,
    model,
    timeout,
    note: "Deep Research with web search will be implemented with the Responses API",
  };
}

// Progress callback type for streaming updates
export type ResearchProgressCallback = (update: {
  type: "search" | "reading" | "analyzing" | "complete" | "error";
  message: string;
  data?: Record<string, unknown>;
}) => void;
