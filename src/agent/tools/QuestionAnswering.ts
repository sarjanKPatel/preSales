import { Tool, ToolResult } from './types';
import { VisionState } from '../../types';
import { OpenAIProvider } from '../llm/provider';
import { GapDetector } from './gapDetector';

export interface QuestionAnsweringInput {
  user_question: string;
  vision_state?: VisionState;
  rag_context?: any[]; // Legacy support
  memory_context?: string; // New ChatGPT memory context
  context_sources?: string[]; // Source tracking from ChatGPT memory
  intent_details?: any;
}

export interface QuestionAnsweringOutput {
  answer: string;
  followup_question?: string;
}

/**
 * QuestionAnswering Tool
 * Answers user questions using vision context and ChatGPT-style memory context
 */
export class QuestionAnswering implements Tool<QuestionAnsweringInput, QuestionAnsweringOutput> {
  name = 'QuestionAnswering';
  description = 'Answers user questions about the vision using available context and ChatGPT memory';
  private gapDetector: GapDetector;

  constructor(private llmProvider: OpenAIProvider) {
    this.gapDetector = new GapDetector();
  }

  async execute(input: QuestionAnsweringInput): Promise<ToolResult<QuestionAnsweringOutput>> {
    try {
      const { user_question, vision_state, memory_context, context_sources, rag_context } = input;

      console.log('[QuestionAnswering] Input:', {
        question: user_question,
        hasVisionState: !!vision_state,
        companyName: vision_state?.company_name,
        hasMemoryContext: !!memory_context,
        memoryContextLength: memory_context?.length || 0,
        sourcesCount: context_sources?.length || 0,
        // Legacy support
        ragResultsCount: rag_context?.length || 0,
        hasRAGContext: !!(rag_context && rag_context.length > 0)
      });

      // Log memory context details for debugging
      if (memory_context) {
        console.log('[QuestionAnswering] ChatGPT Memory context:');
        console.log(`  Length: ${memory_context.length} characters`);
        console.log(`  Sources: ${context_sources?.length || 0}`);
        console.log(`  Preview: "${memory_context.substring(0, 200)}..."`);
      }
      
      // Log RAG context details for debugging (legacy support)
      if (rag_context && rag_context.length > 0) {
        console.log('[QuestionAnswering] Legacy RAG context details:');
        rag_context.forEach((result, index) => {
          console.log(`  [${index}] Similarity: ${result.similarity}, Content: "${result.content.substring(0, 100)}..."`);
          console.log(`      Full Content: "${result.content}"`);
          console.log(`      Metadata:`, result.metadata);
        });
      } else {
        console.log('[QuestionAnswering] No RAG context available');
      }

      console.log('[QuestionAnswering] Using LLM with ChatGPT memory context...');
      
      // Always use LLM with context for dynamic responses
      const prompt = this.buildAnswerPrompt(user_question, vision_state, memory_context, rag_context);
      console.log('[QuestionAnswering] Sending prompt to LLM:', {
        promptLength: prompt.length,
        model: 'gpt-4o',
        temperature: 0.8, // Increased for more variation
        timestamp: new Date().toISOString()
      });
      console.log('[QuestionAnswering] Full prompt being sent to LLM:');
      console.log(prompt);
      console.log('[QuestionAnswering] --- End of prompt ---');

      const response = await this.llmProvider.complete(prompt, {
        model: 'gpt-4o',
        maxTokens: 300,
        temperature: 0.8, // Increased from 0.3 to 0.8 for more natural variation
      });

      console.log('[QuestionAnswering] LLM response:', response.content);
      
      const result = this.parseResponse(response.content);
      
      // Generate gap-based follow-up question if needed
      if (result.success && result.data && vision_state) {
        const followupQuestion = await this.generateGapBasedFollowup(vision_state);
        if (followupQuestion) {
          result.data.followup_question = followupQuestion;
        }
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Question answering failed: ${String(error)}`,
      };
    }
  }


  private buildAnswerPrompt(
    question: string, 
    vision_state?: VisionState, 
    memory_context?: string,
    rag_context?: any[] // Legacy support
  ): string {
    const visionSummary = vision_state ? this.summarizeVisionState(vision_state) : 'No vision data available.';
    
    // Use ChatGPT memory context if available, otherwise fall back to legacy RAG
    let contextSummary = '';
    if (memory_context) {
      contextSummary = memory_context;
    } else if (rag_context && rag_context.length > 0) {
      // Legacy RAG context formatting
      contextSummary = rag_context.map((result, index) => {
        const similarity = result.similarity ? ` (relevance: ${Math.round(result.similarity * 100)}%)` : '';
        return `[${index + 1}]${similarity}: ${result.content}`;
      }).join('\n\n');
    }

    // Add randomness to prompt to ensure different responses
    const responseStyles = [
      "Answer naturally and conversationally, like ChatGPT would",
      "Respond in a friendly, helpful manner with natural conversation flow", 
      "Give a warm, personable response that feels human-like",
      "Answer with natural conversation style, being helpful and engaging"
    ];
    
    const variationPrompts = [
      "Make sure to vary your wording from previous responses",
      "Use fresh language and don't repeat exact phrases", 
      "Express the same information in a new, creative way",
      "Find a unique way to phrase your response"
    ];

    const randomStyle = responseStyles[Math.floor(Math.random() * responseStyles.length)];
    const randomVariation = variationPrompts[Math.floor(Math.random() * variationPrompts.length)];
    const timestamp = new Date().toISOString();

    return `You are a friendly AI assistant. Answer the user's question using all available information sources.

## Current Vision State (PRIMARY SOURCE):
${visionSummary}

${contextSummary ? `## Memory Context (SECONDARY SOURCE - from ChatGPT Memory):
${contextSummary}\n` : ''}

## User Question:
"${question}"

## Instructions:
1. ${randomStyle}
2. **SEARCH ALL SOURCES**: Look for answers in Current Vision State AND Memory Context
3. **Personal Information**: If the question asks for personal information (like names), check the Memory Context for previous conversations
4. **Business Information**: Check both Current Vision State and Memory Context for business-related information
5. **Conversation Memory**: The Memory Context contains multi-layered information from recent messages, important moments, and user preferences
6. If information is missing from all sources, acknowledge it naturally
7. ${randomVariation}
8. DO NOT ask any follow-up questions in your answer
9. ONLY provide a direct answer to the question asked
10. Timestamp for uniqueness: ${timestamp}

## Response Format (JSON):
{
  "answer": "Your direct answer here - no follow-up questions!"
}

Respond with ONLY the JSON object containing your answer.`;
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
    
    // Include business custom fields from either root level or metadata
    const customFields = vision.custom_fields || vision.metadata?.custom_fields;
    if (customFields && Object.keys(customFields).length > 0) {
      Object.entries(customFields).forEach(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        parts.push(`${formattedKey}: ${value}`);
      });
    }
    
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
        },
      };
    } catch (error) {
      console.error('[QuestionAnswering] Failed to parse response:', error);
      return {
        success: true,
        data: {
          answer: "I couldn't process that question properly. Could you please rephrase it?",
        },
      };
    }
  }

  /**
   * Generate a single gap-based follow-up question using GapDetector
   */
  private async generateGapBasedFollowup(visionState: VisionState): Promise<string | undefined> {
    try {
      console.log('[QuestionAnswering] Generating gap-based follow-up...');
      
      const gapResult = await this.gapDetector.execute({
        vision_state: visionState,
        context: [] // No conversation history needed, RAG handles context
      });

      if (gapResult.success && gapResult.data && gapResult.data.gaps_found) {
        const questions = gapResult.data.next_questions;
        if (questions && questions.length > 0) {
          console.log('[QuestionAnswering] Generated follow-up question:', questions[0]);
          return questions[0]; // Return only the first (highest priority) question
        }
      }
      
      console.log('[QuestionAnswering] No gaps found, no follow-up needed');
      return undefined;
    } catch (error) {
      console.error('[QuestionAnswering] Failed to generate gap-based follow-up:', error);
      return undefined;
    }
  }
}