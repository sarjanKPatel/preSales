import { Tool, ToolResult } from './types';
import { VisionState } from '../../types';
import { LLMProviderManager } from '../llm/provider';

export interface ValueExtractionInput {
  userMessage: string;
  targetField: string;
  displayName: string;
  currentValue?: string;
  visionState?: VisionState;
}

export interface ValueExtractionOutput {
  hasValue: boolean;
  extractedValue: string | null;
  needsClarification: boolean;
  clarificationQuestion?: string;
  confidence: number;
  extractionMethod: 'llm' | 'pattern' | 'none';
}

/**
 * ValueExtractionAgent - Specialized for parsing user update requests
 * 
 * This agent is focused solely on determining:
 * 1. Does the user's message contain a specific value to update?
 * 2. If yes, what is that value?
 * 3. If no, what clarification question should we ask?
 */
export class ValueExtractionAgent implements Tool<ValueExtractionInput, ValueExtractionOutput> {
  name = 'ValueExtractionAgent';
  description = 'Specialized agent for extracting field values from user update requests';

  private llmProvider: LLMProviderManager;

  constructor(llmProvider: LLMProviderManager) {
    this.llmProvider = llmProvider;
  }

  async execute(input: ValueExtractionInput): Promise<ToolResult<ValueExtractionOutput>> {
    try {
      console.log(`[ValueExtractionAgent] Analyzing: "${input.userMessage}" for field: ${input.targetField}`);

      // First try LLM-based extraction
      const llmResult = await this.extractWithLLM(input);
      if (llmResult) {
        return {
          success: true,
          data: llmResult
        };
      }

      // Fallback to pattern matching
      console.log('[ValueExtractionAgent] {fallback from LLM extraction} - trying pattern matching');
      const patternResult = this.extractWithPatterns(input);
      if (patternResult) {
        return {
          success: true,
          data: patternResult
        };
      }

      // No value found - needs clarification
      console.log('[ValueExtractionAgent] {fallback from pattern matching} - no value detected');
      return {
        success: true,
        data: {
          hasValue: false,
          extractedValue: null,
          needsClarification: true,
          clarificationQuestion: this.generateClarificationQuestion(input),
          confidence: 1.0,
          extractionMethod: 'none'
        }
      };

    } catch (error) {
      console.error('[ValueExtractionAgent] Error:', error);
      return {
        success: false,
        error: `Value extraction failed: ${String(error)}`
      };
    }
  }

  private async extractWithLLM(input: ValueExtractionInput): Promise<ValueExtractionOutput | null> {
    try {
      const prompt = `Analyze this user message and extract the specific value they want to update:

User message: "${input.userMessage}"
Target field: ${input.displayName || input.targetField}
Current value: ${input.currentValue || 'Not set'}

CRITICAL INSTRUCTIONS:
1. If the message contains a SPECIFIC new value, extract ONLY that value
2. If the message does NOT contain a specific value, respond with exactly: "NO_VALUE"
3. Simple words/phrases that appear to be direct answers should be extracted as values
4. Do not generate explanations or questions - just the value or "NO_VALUE"

Examples:
- "Update our industry to healthcare" → "healthcare"  
- "Change company name to TechCorp" → "TechCorp"
- "Set timeline to 3 years" → "3 years"
- "healthcare" → "healthcare" (direct answer)
- "automotive" → "automotive" (direct answer)
- "automotive vehicle" → "automotive vehicle" (direct answer)
- "TechCorp Solutions" → "TechCorp Solutions" (direct answer)
- "Update our industry" → "NO_VALUE"
- "Change the company name" → "NO_VALUE"

Response:`;

      const response = await this.llmProvider.complete(prompt, {
        model: 'gpt-4o',
        maxTokens: 50,
        temperature: 0.1
      });

      const extractedValue = response.content.trim();
      
      if (extractedValue === 'NO_VALUE' || extractedValue.toLowerCase().includes('no_value')) {
        return {
          hasValue: false,
          extractedValue: null,
          needsClarification: true,
          clarificationQuestion: this.generateClarificationQuestion(input),
          confidence: 0.9,
          extractionMethod: 'llm'
        };
      }

      if (extractedValue && extractedValue.length > 0 && extractedValue.length < 200) {
        return {
          hasValue: true,
          extractedValue: extractedValue,
          needsClarification: false,
          confidence: 0.8,
          extractionMethod: 'llm'
        };
      }

      return null;

    } catch (error) {
      console.error('[ValueExtractionAgent] LLM extraction error:', error);
      return null;
    }
  }

  private extractWithPatterns(input: ValueExtractionInput): ValueExtractionOutput | null {
    const patterns = [
      // "update X to Y" or "change X to Y"
      new RegExp(`(?:update|change|set|modify)\\s+(?:our\\s+)?(?:${input.targetField}|${input.displayName})\\s+to\\s+"([^"]+)"`, 'i'),
      new RegExp(`(?:update|change|set|modify)\\s+(?:our\\s+)?(?:${input.targetField}|${input.displayName})\\s+to\\s+(.+)$`, 'i'),
      
      // "set X as Y"
      new RegExp(`(?:set|define)\\s+(?:our\\s+)?(?:${input.targetField}|${input.displayName})\\s+as\\s+"([^"]+)"`, 'i'),
      new RegExp(`(?:set|define)\\s+(?:our\\s+)?(?:${input.targetField}|${input.displayName})\\s+as\\s+(.+)$`, 'i'),
      
      // Direct value patterns
      /(?:to|as)\s+"([^"]+)"/i,
      /(?:to|as)\s+(.+)$/i
    ];

    for (const pattern of patterns) {
      const match = input.userMessage.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        
        // Validate the extracted value
        if (this.isValidExtractedValue(value, input)) {
          return {
            hasValue: true,
            extractedValue: value,
            needsClarification: false,
            confidence: 0.6,
            extractionMethod: 'pattern'
          };
        }
      }
    }

    return null;
  }

  private isValidExtractedValue(value: string, input: ValueExtractionInput): boolean {
    // Skip if value is too short or contains field name
    if (value.length < 2) return false;
    
    // Skip if value is just the field name itself
    const fieldNames = [input.targetField, input.displayName].filter(Boolean);
    for (const fieldName of fieldNames) {
      if (value.toLowerCase().includes(fieldName?.toLowerCase() || '')) {
        return false;
      }
    }

    // Skip common non-values
    const nonValues = ['our', 'the', 'it', 'this', 'that'];
    if (nonValues.includes(value.toLowerCase())) {
      return false;
    }

    return true;
  }

  private generateClarificationQuestion(input: ValueExtractionInput): string {
    const fieldName = input.displayName || input.targetField;
    
    if (input.currentValue && input.currentValue !== 'Not yet defined') {
      return `Your current ${fieldName} is: "${input.currentValue}". What would you like to change it to?`;
    } else {
      return `What would you like to set as your ${fieldName}?`;
    }
  }
}