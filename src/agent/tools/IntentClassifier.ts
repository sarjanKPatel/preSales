import { Tool, ToolResult } from './types';
import { OpenAIProvider } from '../llm/provider';
import { IntentType, IntentClassification, IntentClassifierInput, IntentClassifierOutput } from '../types/intent';

export class IntentClassifier implements Tool<IntentClassifierInput, IntentClassifierOutput> {
  name = 'IntentClassifier';
  description = 'Classifies user intent using AI to determine how to handle the message';

  constructor(private llmProvider: OpenAIProvider) {}

  async execute(input: IntentClassifierInput): Promise<ToolResult<IntentClassifierOutput>> {
    try {
      console.log('[IntentClassifier] Input:', {
        message: input.user_message,
        hasHistory: input.conversation_history?.length || 0,
        hasVisionContext: !!input.vision_context,
        hasUIContext: !!input.ui_context
      });
      
      const prompt = this.buildClassificationPrompt(input);
      
      console.log('[IntentClassifier] Sending to LLM...');
      const response = await this.llmProvider.complete(prompt, {
        model: 'gpt-4o',
        maxTokens: 300,
        temperature: 0.1, // Low temperature for consistent classification
      });

      console.log('[IntentClassifier] Raw LLM response:', response.content);
      
      const classification = this.parseClassificationResponse(response.content);
      
      console.log('[IntentClassifier] Parsed classification:', JSON.stringify(classification, null, 2));
      
      return {
        success: true,
        data: classification,
      };
    } catch (error) {
      console.error('[IntentClassifier] Classification failed:', error);
      return {
        success: false,
        error: `Intent classification failed: ${String(error)}`,
        data: {
          intent: IntentType.UNKNOWN,
          confidence: 0,
          reasoning: 'Failed to classify intent due to error',
        },
      };
    }
  }

  private buildClassificationPrompt(input: IntentClassifierInput): string {
    const { user_message, conversation_history = [], vision_context, ui_context } = input;
    
    const recentHistory = conversation_history.slice(-3).join('\n');
    const visionStatus = vision_context ? 
      `Vision completeness: ${vision_context.completeness_score}%
Has company name: ${vision_context.has_company_name}
Has industry: ${vision_context.has_industry}
Has vision statement: ${vision_context.has_vision_statement}
Last agent message: ${vision_context.last_agent_message || 'None'}` : 'No vision context';

    const uiStatus = ui_context?.buttons_shown?.length ? 
      `Buttons shown: ${ui_context.buttons_shown.join(', ')}` : '';

    return `You are an intent classifier for a vision creation AI agent. Classify the user's intent based on their message and context.

## Intent Types:
- QUESTION: User is asking about existing vision data (what, who, where, when, why, how)
- INFORMATION: User is providing new information about their company/vision
- CLARIFICATION: User is responding to agent's questions to fill gaps
- COMMAND: User is requesting an action (save, export, summarize, etc.)
- UI_ACTION: User is referencing UI elements (clicking skip, approve, etc.)
- GREETING: User is greeting or initiating conversation
- UNKNOWN: Cannot determine clear intent

## Context:
${recentHistory ? `Recent conversation:\n${recentHistory}\n` : ''}
${visionStatus}
${uiStatus}

## User Message:
"${user_message}"

## Instructions:
1. Analyze the user's message in context
2. Determine the primary intent - if the message contains question words (what, who, where, when, why, how) or ends with "?", it's likely a QUESTION
3. Extract any entities mentioned (company names, industries, etc.)
4. Consider if the user is responding to a previous question
5. Check if they're referencing UI elements

## Response Format (JSON):
{
  "intent": "INTENT_TYPE (must be uppercase: QUESTION, INFORMATION, CLARIFICATION, COMMAND, UI_ACTION, GREETING, or UNKNOWN)",
  "confidence": 0.0-1.0,
  "subIntent": "optional specific intent",
  "entities": {
    "entity_name": "entity_value"
  },
  "reasoning": "Brief explanation of classification",
  "suggested_action": "What the agent should do next",
  "priority": "high|medium|low"
}

IMPORTANT: The intent field MUST be one of the uppercase values listed above.
Respond with ONLY the JSON object.`;
  }

  private parseClassificationResponse(content: string): IntentClassifierOutput {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Map the uppercase intent from LLM to lowercase enum value
      const intentMapping: Record<string, IntentType> = {
        'QUESTION': IntentType.QUESTION,
        'INFORMATION': IntentType.INFORMATION,
        'CLARIFICATION': IntentType.CLARIFICATION,
        'COMMAND': IntentType.COMMAND,
        'UI_ACTION': IntentType.UI_ACTION,
        'GREETING': IntentType.GREETING,
        'UNKNOWN': IntentType.UNKNOWN,
      };
      
      const upperIntent = parsed.intent?.toUpperCase() || 'UNKNOWN';
      const intent = intentMapping[upperIntent] || IntentType.UNKNOWN;
      
      // Log mapping for debugging
      console.log('[IntentClassifier] Intent mapping:', {
        rawIntent: parsed.intent,
        upperIntent,
        mappedIntent: intent
      });
      
      // Special handling: if reasoning mentions greeting but intent is unknown, correct it
      if (intent === IntentType.UNKNOWN && parsed.reasoning?.toLowerCase().includes('greeting')) {
        console.log('[IntentClassifier] Correcting to GREETING based on reasoning');
        return {
          intent: IntentType.GREETING,
          confidence: Math.min(1.0, Math.max(0.0, parsed.confidence || 0.5)),
          subIntent: parsed.subIntent,
          entities: parsed.entities || {},
          reasoning: parsed.reasoning || 'No reasoning provided',
          suggested_action: parsed.suggested_action,
          priority: parsed.priority || 'medium',
        };
      }
      
      return {
        intent: intent,
        confidence: Math.min(1.0, Math.max(0.0, parsed.confidence || 0.5)),
        subIntent: parsed.subIntent,
        entities: parsed.entities || {},
        reasoning: parsed.reasoning || 'No reasoning provided',
        suggested_action: parsed.suggested_action,
        priority: parsed.priority || 'medium',
      };
    } catch (error) {
      console.error('[IntentClassifier] Failed to parse response:', error);
      return {
        intent: IntentType.UNKNOWN,
        confidence: 0,
        reasoning: 'Failed to parse AI response',
        priority: 'low',
      };
    }
  }
}