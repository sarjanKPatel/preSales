import { Tool, ToolResult } from './types';
import { VisionState } from '../../types';
import { OpenAIProvider } from '../llm/provider';

export interface QuestionAnsweringInput {
  user_question: string;
  vision_state?: VisionState;
  conversation_history?: string[];
  rag_context?: any[];
  intent_details?: any;
}

export interface QuestionAnsweringOutput {
  answer: string;
  confidence: number;
  sources: string[];
  needs_more_info: boolean;
  suggested_followups?: string[];
}

/**
 * QuestionAnswering Tool
 * Answers user questions based on vision context and RAG results
 */
export class QuestionAnswering implements Tool<QuestionAnsweringInput, QuestionAnsweringOutput> {
  name = 'QuestionAnswering';
  description = 'Answers user questions about the vision using available context and RAG';

  constructor(private llmProvider: OpenAIProvider) {}

  async execute(input: QuestionAnsweringInput): Promise<ToolResult<QuestionAnsweringOutput>> {
    try {
      const { user_question, vision_state, rag_context } = input;

      console.log('[QuestionAnswering] Input:', {
        question: user_question,
        hasVisionState: !!vision_state,
        companyName: vision_state?.company_name,
        ragResultsCount: rag_context?.length || 0
      });

      // First, try to answer directly from vision state
      const directAnswer = this.getDirectAnswer(user_question, vision_state);
      if (directAnswer) {
        console.log('[QuestionAnswering] Found direct answer:', directAnswer.answer);
        return {
          success: true,
          data: directAnswer,
        };
      }

      console.log('[QuestionAnswering] No direct answer, using LLM...');
      
      // If no direct answer, use LLM with context
      const prompt = this.buildAnswerPrompt(user_question, vision_state, rag_context);
      const response = await this.llmProvider.complete(prompt, {
        model: 'gpt-4o',
        maxTokens: 300,
        temperature: 0.3,
      });

      console.log('[QuestionAnswering] LLM response:', response.content);
      
      return this.parseResponse(response.content);
    } catch (error) {
      return {
        success: false,
        error: `Question answering failed: ${String(error)}`,
      };
    }
  }

  private getDirectAnswer(question: string, vision_state?: VisionState): QuestionAnsweringOutput | null {
    if (!vision_state) return null;

    const lowerQuestion = question.toLowerCase();

    // Company name
    if (lowerQuestion.includes('company') && lowerQuestion.includes('name')) {
      if (vision_state.company_name) {
        return {
          answer: `The company name is ${vision_state.company_name}.`,
          confidence: 1.0,
          sources: ['vision_state.company_name'],
          needs_more_info: false,
        };
      } else {
        return {
          answer: "I don't have the company name recorded yet. What is your company's name?",
          confidence: 1.0,
          sources: [],
          needs_more_info: true,
        };
      }
    }

    // Industry
    if (lowerQuestion.includes('industry') || lowerQuestion.includes('sector')) {
      if (vision_state.industry) {
        return {
          answer: `The company operates in the ${vision_state.industry} industry.`,
          confidence: 1.0,
          sources: ['vision_state.industry'],
          needs_more_info: false,
        };
      } else {
        return {
          answer: "I don't have the industry information yet. What industry does your company operate in?",
          confidence: 1.0,
          sources: [],
          needs_more_info: true,
        };
      }
    }

    // Vision statement
    if (lowerQuestion.includes('vision') && (lowerQuestion.includes('statement') || lowerQuestion.includes('what is'))) {
      if (vision_state.vision_statement) {
        return {
          answer: `Your vision statement is: "${vision_state.vision_statement}"`,
          confidence: 1.0,
          sources: ['vision_state.vision_statement'],
          needs_more_info: false,
        };
      } else {
        return {
          answer: "I don't have a vision statement recorded yet. What vision would you like to develop for your organization?",
          confidence: 1.0,
          sources: [],
          needs_more_info: true,
        };
      }
    }

    // Company size
    if (lowerQuestion.includes('size') || lowerQuestion.includes('employees') || lowerQuestion.includes('how big')) {
      if (vision_state.company_size) {
        return {
          answer: `The company size is ${vision_state.company_size} employees.`,
          confidence: 1.0,
          sources: ['vision_state.company_size'],
          needs_more_info: false,
        };
      }
    }

    // Strategic priorities
    if (lowerQuestion.includes('priorities') || lowerQuestion.includes('strategic')) {
      if (vision_state.strategic_priorities && vision_state.strategic_priorities.length > 0) {
        return {
          answer: `Your strategic priorities are: ${vision_state.strategic_priorities.join(', ')}.`,
          confidence: 1.0,
          sources: ['vision_state.strategic_priorities'],
          needs_more_info: false,
        };
      }
    }

    return null;
  }

  private buildAnswerPrompt(question: string, vision_state?: VisionState, rag_context?: any[]): string {
    const visionSummary = vision_state ? this.summarizeVisionState(vision_state) : 'No vision data available.';
    const ragSummary = rag_context && rag_context.length > 0 
      ? rag_context.map(r => r.content).join('\n\n') 
      : '';

    return `You are an AI assistant helping with vision creation. Answer the user's question based on the available vision data.

## Current Vision Data:
${visionSummary}

${ragSummary ? `## Additional Context:\n${ragSummary}\n` : ''}

## User Question:
"${question}"

## Instructions:
1. Answer based ONLY on the available data
2. If information is not available, say so clearly and suggest adding it
3. Be concise and direct
4. Include specific values when available

## Response Format (JSON):
{
  "answer": "Your answer here",
  "confidence": 0.0-1.0,
  "sources": ["list of data sources used"],
  "needs_more_info": boolean,
  "suggested_followups": ["optional follow-up questions"]
}

Respond with ONLY the JSON object.`;
  }

  private summarizeVisionState(vision: VisionState): string {
    const parts: string[] = [];
    
    if (vision.company_name) parts.push(`Company Name: ${vision.company_name}`);
    if (vision.industry) parts.push(`Industry: ${vision.industry}`);
    if (vision.vision_statement) parts.push(`Vision Statement: ${vision.vision_statement}`);
    if (vision.company_size) parts.push(`Company Size: ${vision.company_size}`);
    if (vision.key_themes?.length) parts.push(`Key Themes: ${vision.key_themes.join(', ')}`);
    if (vision.strategic_priorities?.length) parts.push(`Strategic Priorities: ${vision.strategic_priorities.join(', ')}`);
    if (vision.target_outcomes?.length) parts.push(`Target Outcomes: ${vision.target_outcomes.join(', ')}`);
    if (vision.timeline) parts.push(`Timeline: ${vision.timeline}`);
    if (vision.market_size) parts.push(`Market Size: ${vision.market_size}`);
    if (vision.competitive_landscape) parts.push(`Competitive Landscape: ${vision.competitive_landscape}`);
    
    return parts.length > 0 ? parts.join('\n') : 'No vision data recorded yet.';
  }

  private parseResponse(content: string): ToolResult<QuestionAnsweringOutput> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        success: true,
        data: {
          answer: parsed.answer || "I couldn't find that information.",
          confidence: parsed.confidence || 0.5,
          sources: parsed.sources || [],
          needs_more_info: parsed.needs_more_info || false,
          suggested_followups: parsed.suggested_followups,
        },
      };
    } catch (error) {
      console.error('[QuestionAnswering] Failed to parse response:', error);
      return {
        success: true,
        data: {
          answer: "I couldn't process that question properly. Could you please rephrase it?",
          confidence: 0,
          sources: [],
          needs_more_info: false,
        },
      };
    }
  }
}