import { Tool, ToolResult } from './types';
import { VisionState } from '../../types';
import { LLMProviderManager } from '../llm/provider';

export interface UpdateIntentInput {
  userMessage: string;
  entities: Record<string, any>;
  visionState?: VisionState;
}

export interface UpdateIntentOutput {
  field?: string;
  section?: string;
  scope: 'field' | 'section' | 'custom_field' | 'freeform';
  displayName: string;
  isCustomField: boolean;
  confidence: number;
  reasoning: string;
}

/**
 * UpdateIntentParsingAgent - Specialized for determining WHAT field to update
 * 
 * This agent focuses on:
 * 1. Analyzing user intent to determine which field they want to update
 * 2. Supporting both standard VisionState fields and custom fields
 * 3. Providing clear reasoning for the field selection
 */
export class UpdateIntentParsingAgent implements Tool<UpdateIntentInput, UpdateIntentOutput> {
  name = 'UpdateIntentParsingAgent';
  description = 'Specialized agent for parsing which field the user wants to update';

  private llmProvider: LLMProviderManager;

  constructor(llmProvider: LLMProviderManager) {
    this.llmProvider = llmProvider;
  }

  async execute(input: UpdateIntentInput): Promise<ToolResult<UpdateIntentOutput>> {
    try {
      console.log(`[UpdateIntentParsingAgent] Analyzing intent: "${input.userMessage}"`);

      // Get field mappings
      const fieldContext = this.buildFieldContext(input.visionState);

      // First try LLM-based parsing
      const llmResult = await this.parseWithLLM(input, fieldContext);
      if (llmResult) {
        return {
          success: true,
          data: llmResult
        };
      }

      // Fallback to pattern-based parsing
      console.log('[UpdateIntentParsingAgent] {fallback from LLM parsing} - trying pattern matching');
      const patternResult = this.parseWithPatterns(input);
      
      return {
        success: true,
        data: patternResult
      };

    } catch (error) {
      console.error('[UpdateIntentParsingAgent] Error:', error);
      return {
        success: false,
        error: `Intent parsing failed: ${String(error)}`
      };
    }
  }

  private buildFieldContext(visionState?: VisionState) {
    // Standard VisionState fields
    const standardFields = [
      'company_name', 'vision_statement', 'industry', 'key_themes', 'success_metrics', 
      'target_outcomes', 'timeline', 'constraints', 'assumptions', 'market_size',
      'competitive_landscape', 'current_strategy', 'strategic_priorities', 'company_size'
    ];

    // Existing custom fields from current vision state
    const existingCustomFields = visionState ? 
      Object.keys(visionState).filter(key => 
        !standardFields.includes(key) && 
        key !== 'metadata' && 
        key !== 'custom_fields'
      ) : [];

    // Custom field values
    const customFieldKeys = visionState?.custom_fields ? 
      Object.keys(visionState.custom_fields).map(key => `custom_fields.${key}`) : [];

    return {
      standardFields,
      existingCustomFields,
      customFieldKeys,
      allFields: [...standardFields, ...existingCustomFields, ...customFieldKeys]
    };
  }

  private async parseWithLLM(input: UpdateIntentInput, fieldContext: any): Promise<UpdateIntentOutput | null> {
    try {
      const prompt = `Analyze this user message to determine which field they want to update:

User message: "${input.userMessage}"

AVAILABLE FIELDS:
Standard fields: ${fieldContext.standardFields.join(', ')}
Existing custom fields: ${fieldContext.existingCustomFields.join(', ') || 'none'}
Custom field values: ${fieldContext.customFieldKeys.join(', ') || 'none'}

INSTRUCTIONS:
1. Identify which field the user wants to update based on their natural language
2. If it matches a standard field, use that exact field name
3. If it's a new concept not in standard fields, create a custom field name using snake_case
4. Return ONLY valid JSON with this structure:

{
  "field": "exact_field_name",
  "scope": "field|custom_field",
  "displayName": "human readable name",
  "isCustomField": true|false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Examples:
- "Update our industry" → {"field": "industry", "scope": "field", "displayName": "industry", "isCustomField": false, "confidence": 0.9, "reasoning": "Standard industry field"}
- "Change employee count" → {"field": "employee_count", "scope": "custom_field", "displayName": "employee count", "isCustomField": true, "confidence": 0.8, "reasoning": "Custom field for employee count"}

Response:`;

      const response = await this.llmProvider.complete(prompt, {
        model: 'gpt-4o',
        maxTokens: 200,
        temperature: 0.1
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[UpdateIntentParsingAgent] No JSON found in LLM response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        field: parsed.field,
        section: undefined,
        scope: parsed.isCustomField ? 'custom_field' : 'field',
        displayName: parsed.displayName || parsed.field,
        isCustomField: parsed.isCustomField || false,
        confidence: Math.min(1.0, Math.max(0.0, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'LLM analysis'
      };

    } catch (error) {
      console.error('[UpdateIntentParsingAgent] LLM parsing error:', error);
      return null;
    }
  }

  private parseWithPatterns(input: UpdateIntentInput): UpdateIntentOutput {
    const message = input.userMessage.toLowerCase();

    // Standard field patterns
    const fieldMappings: Record<string, { field: string; displayName: string }> = {
      'company': { field: 'company_name', displayName: 'company name' },
      'industry': { field: 'industry', displayName: 'industry' },
      'vision': { field: 'vision_statement', displayName: 'vision statement' },
      'timeline': { field: 'timeline', displayName: 'timeline' },
      'target': { field: 'target_outcomes', displayName: 'target outcomes' },
      'market': { field: 'target_outcomes', displayName: 'target market' },
      'success': { field: 'success_metrics', displayName: 'success metrics' },
      'metrics': { field: 'success_metrics', displayName: 'success metrics' },
      'theme': { field: 'key_themes', displayName: 'key themes' },
      'constraint': { field: 'constraints', displayName: 'constraints' },
      'assumption': { field: 'assumptions', displayName: 'assumptions' },
      'strategy': { field: 'current_strategy', displayName: 'current strategy' },
      'competitive': { field: 'competitive_landscape', displayName: 'competitive landscape' },
      'size': { field: 'company_size', displayName: 'company size' }
    };

    // Check for standard fields
    for (const [key, mapping] of Object.entries(fieldMappings)) {
      if (message.includes(key)) {
        return {
          field: mapping.field,
          scope: 'field',
          displayName: mapping.displayName,
          isCustomField: false,
          confidence: 0.7,
          reasoning: `Pattern match for "${key}" → ${mapping.field}`
        };
      }
    }

    // Check for common custom field patterns
    const customFieldPatterns: Record<string, string> = {
      'employee': 'employee_count',
      'staff': 'employee_count', 
      'office': 'office_location',
      'location': 'office_location',
      'revenue': 'revenue_target',
      'funding': 'funding_stage',
      'technology': 'technology_stack',
      'tech': 'technology_stack',
      'product': 'product_features'
    };

    for (const [key, fieldName] of Object.entries(customFieldPatterns)) {
      if (message.includes(key)) {
        return {
          field: fieldName,
          scope: 'custom_field',
          displayName: key.replace('_', ' '),
          isCustomField: true,
          confidence: 0.6,
          reasoning: `Custom field pattern match for "${key}"`
        };
      }
    }

    // Default to freeform if no clear field detected
    return {
      scope: 'freeform',
      displayName: 'vision information',
      isCustomField: false,
      confidence: 0.3,
      reasoning: 'No specific field detected - freeform update'
    };
  }
}