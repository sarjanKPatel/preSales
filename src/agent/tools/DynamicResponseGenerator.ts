import { Tool, ToolResult } from './types';
import { VisionState, AgentMessage } from '../../types';
import { LLMProviderManager } from '../llm/provider';

export interface DynamicResponseInput {
  userMessage: string;
  conversationHistory: AgentMessage[];
  visionState?: VisionState;
  intent: {
    type: string;
    confidence: number;
    subIntent?: string;
    entities?: Record<string, any>;
    reasoning?: string;
  };
  context: {
    sessionId: string;
    workspaceId: string;
    userId: string;
    extractionResult?: any; // If information was just extracted
    gapAnalysis?: any; // If gaps were analyzed
  };
}

export interface DynamicResponseOutput {
  response: string;
  shouldAskFollowUp: boolean;
  followUpQuestion?: string;
  tone: 'casual' | 'professional' | 'encouraging' | 'helpful';
  confidence: number;
}

/**
 * DynamicResponseGenerator Tool
 * Uses LLM to generate contextual, natural responses based on conversation flow
 * Replaces template-based responses with truly dynamic generation
 */
export class DynamicResponseGenerator implements Tool<DynamicResponseInput, DynamicResponseOutput> {
  name = 'DynamicResponseGenerator';
  description = 'Generates natural, contextual responses using LLM instead of templates';

  private llmProvider: LLMProviderManager;

  constructor(llmProvider: LLMProviderManager) {
    this.llmProvider = llmProvider;
  }

  async execute(input: DynamicResponseInput): Promise<ToolResult<DynamicResponseOutput>> {
    try {
      const response = await this.generateResponse(input);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: `Dynamic response generation failed: ${String(error)}`,
      };
    }
  }

  private async generateResponse(input: DynamicResponseInput): Promise<DynamicResponseOutput> {
    const prompt = this.buildPrompt(input);
    
    const llmResponse = await this.llmProvider.complete(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-4o-mini', // Fast model for response generation
        temperature: 0.8, // More creative for natural responses
        maxTokens: 300,
      }
    );

    // Parse the LLM response
    let parsedResponse: DynamicResponseOutput;
    try {
      const cleanedResponse = llmResponse.content
        .replace(/```json\n?/, '')
        .replace(/\n?```/, '')
        .trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      parsedResponse = {
        response: llmResponse.content.trim(),
        shouldAskFollowUp: false,
        tone: 'helpful',
        confidence: 0.7
      };
    }

    return parsedResponse;
  }

  private buildPrompt(input: DynamicResponseInput): string {
    const {
      userMessage,
      conversationHistory,
      visionState,
      intent,
      context
    } = input;

    // Get recent conversation for context
    const recentMessages = conversationHistory
      .slice(-5)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Build vision context summary
    const visionSummary = this.buildVisionSummary(visionState);
    
    // Build extraction context if available
    const extractionContext = context.extractionResult 
      ? `\n\nJust extracted: ${JSON.stringify(context.extractionResult.extracted_fields || {})}`
      : '';

    return `You are a friendly, intelligent AI assistant helping a user develop their company's strategic vision. 

CONTEXT:
- User just said: "${userMessage}"
- Intent classified as: ${intent.type} (${intent.subIntent || 'no sub-intent'})
- Intent confidence: ${intent.confidence}
- Reasoning: ${intent.reasoning || 'none'}

CURRENT VISION STATE:
${visionSummary}

RECENT CONVERSATION:
${recentMessages}
${extractionContext}

INSTRUCTIONS:
Generate a natural, conversational response that:
1. Acknowledges what the user said appropriately
2. Responds to their intent naturally (don't be mechanical)
3. Shows you understand the context of their vision work
4. Feels like talking to a real person, not a bot
5. Varies your language - don't use the same phrases repeatedly

RESPONSE GUIDELINES:
- Be conversational and natural like ChatGPT
- Match the user's tone (casual vs professional)
- If they're being casual/friendly, respond similarly
- If they provided information, acknowledge it naturally
- If they're asking questions, answer helpfully
- Don't always ask follow-up questions - sometimes just respond naturally
- Avoid repetitive phrases like "I've updated your vision with" every time

RESPONSE FORMAT (JSON):
{
  "response": "Your natural response here",
  "shouldAskFollowUp": true/false,
  "followUpQuestion": "Optional follow-up question if shouldAskFollowUp is true",
  "tone": "casual|professional|encouraging|helpful",
  "confidence": 0.0-1.0
}

Generate a response that feels natural and human-like:`;
  }

  private buildVisionSummary(visionState?: VisionState): string {
    if (!visionState) {
      return 'No vision information yet - user is just starting';
    }

    const parts = [];
    
    if (visionState.company_name) {
      parts.push(`Company: ${visionState.company_name}`);
    }
    
    if (visionState.industry) {
      parts.push(`Industry: ${visionState.industry}`);
    }
    
    if (visionState.vision_statement) {
      parts.push(`Vision: ${visionState.vision_statement.substring(0, 100)}...`);
    }
    
    if (visionState.key_themes?.length) {
      parts.push(`Themes: ${visionState.key_themes.slice(0, 3).join(', ')}`);
    }

    const completeness = visionState.metadata?.validation_score || 0;
    parts.push(`Completeness: ${completeness}%`);

    return parts.length > 1 ? parts.join('\n') : 'Minimal vision information available';
  }
}