import { Tool, InformationExtractorInput, InformationExtractorOutput, ExtractedField } from './types';
import { ToolResult, VisionState } from '../../types';
import { OpenAIProvider } from '../llm/provider';
import { VisionStateManager } from './visionState';
import { VisionPersistence } from '../persistence/visionPersistence';

export class InformationExtractor implements Tool<InformationExtractorInput, InformationExtractorOutput> {
  name = 'InformationExtractor';
  description = 'Extracts structured company information from user messages with confidence scores';
  private visionStateManager: VisionStateManager;
  private visionPersistence: VisionPersistence;

  constructor(private llmProvider: OpenAIProvider) {
    this.visionStateManager = new VisionStateManager();
    this.visionPersistence = new VisionPersistence();
  }

  async execute(input: InformationExtractorInput): Promise<ToolResult<InformationExtractorOutput>> {
    try {
      const { user_message, current_vision, session_context = [] } = input;

      console.log('[InformationExtractor] Input:', {
        message: user_message,
        hasCurrentVision: !!current_vision,
        currentCompanyName: current_vision?.company_name,
        sessionContextLength: session_context.length
      });

      // Build extraction prompt
      const prompt = this.buildExtractionPrompt(user_message, current_vision, session_context);
      
      console.log('[InformationExtractor] Sending to LLM for extraction...');
      console.log('[InformationExtractor] Prompt preview (first 500 chars):', prompt.substring(0, 500));
      console.log('[InformationExtractor] User message being extracted:', user_message);
      
      // Get LLM response
      const response = await this.llmProvider.complete(prompt, {
        model: 'gpt-4o',
        maxTokens: 1000,
        temperature: 0.1, // Low temperature for consistent extraction
      });

      console.log('[InformationExtractor] Raw LLM response:', response.content);

      // Parse structured response
      const extractionResult = this.parseExtractionResponse(response.content);
      
      console.log('[InformationExtractor] Extraction Result:', JSON.stringify(extractionResult, null, 2));
      
      // Calculate metadata
      const metadata = {
        extraction_timestamp: new Date().toISOString(),
        model_version: 'gpt-4o',
        session_context_used: session_context.length > 0,
        total_confidence: this.calculateTotalConfidence(extractionResult.extracted_fields),
      };

      // Initialize vision state if not provided
      let updatedVisionState = current_vision || {};
      
      console.log('[Extraction] Vision state BEFORE merging:', JSON.stringify(updatedVisionState, null, 2));
      
      // Apply smart merging using VisionStateManager
      updatedVisionState = this.visionStateManager.mergeWithExtractionData(
        updatedVisionState,
        extractionResult.extracted_fields,
        extractionResult.custom_fields
      );
      
      console.log('[Extraction] Vision state AFTER merging:', JSON.stringify(updatedVisionState, null, 2));

      // Persist business data to vision state
      if (input.persistence_config && updatedVisionState) {
        console.log('[InformationExtractor] Attempting database persistence...', {
          visionId: input.persistence_config.vision_id,
          workspaceId: input.persistence_config.workspace_id,
          userId: input.persistence_config.user_id,
          hasVisionState: !!updatedVisionState
        });
        
        // Check if company name changed to update title
        const companyNameChanged = !!(current_vision?.company_name !== updatedVisionState.company_name && 
                                     updatedVisionState.company_name);
        
        if (companyNameChanged) {
          console.log('[InformationExtractor] Company name changed, will update vision title:', {
            oldName: current_vision?.company_name,
            newName: updatedVisionState.company_name
          });
        }
        
        // Separate business data from personal data
        const { metadata, ...businessVisionState } = updatedVisionState;
        const personalData = extractionResult.custom_fields || {};
        
        try {
          const persistResult = await this.visionPersistence.updateVisionAtomic({
            visionId: input.persistence_config.vision_id,
            visionState: businessVisionState, // Only business data to database
            workspaceId: input.persistence_config.workspace_id,
            userId: input.persistence_config.user_id,
            shouldUpdateTitle: companyNameChanged,
            newTitle: companyNameChanged ? businessVisionState.company_name : undefined,
          });

          console.log('[InformationExtractor] Persistence attempt completed:', {
            success: persistResult.success,
            completenessScore: persistResult.completenessScore,
            newVersion: persistResult.newVersion,
            error: persistResult.error
          });

          if (persistResult.success) {
            console.log(`[InformationExtractor] ✅ Vision persisted to database - Completeness: ${persistResult.completenessScore}%`);
          } else {
            console.error('[InformationExtractor] ❌ Failed to persist to database:', persistResult.error);
            // Log additional details for debugging
            if (persistResult.conflictData) {
              console.error('[InformationExtractor] Conflict details:', persistResult.conflictData);
            }
          }
        } catch (error) {
          console.error('[InformationExtractor] ❌ Persistence exception:', error);
          console.error('[InformationExtractor] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        }
        
        // Index personal data directly to RAG (not in vision_state)
        if (Object.keys(personalData).length > 0) {
          console.log('[InformationExtractor] Indexing personal data to RAG:', personalData);
          try {
            // Import VectorStore here to avoid circular dependencies
            const { VectorStore } = await import('../rag/vectorStore');
            const vectorStore = new VectorStore();
            
            await vectorStore.indexPersonalData(
              input.persistence_config.vision_id,
              personalData,
              input.persistence_config.workspace_id
            );
            
            console.log('[InformationExtractor] ✅ Personal data indexed to RAG');
          } catch (error) {
            console.error('[InformationExtractor] ❌ Failed to index personal data:', error);
          }
        }
      } else {
        console.warn('[InformationExtractor] ⚠️ Skipping persistence:', {
          hasPersistenceConfig: !!input.persistence_config,
          hasUpdatedVisionState: !!updatedVisionState
        });
      }

      return {
        success: true,
        data: {
          extracted_fields: extractionResult.extracted_fields,
          custom_fields: extractionResult.custom_fields,
          metadata,
          updated_vision_state: updatedVisionState,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Information extraction failed: ${String(error)}`,
      };
    }
  }

  private buildExtractionPrompt(
    userMessage: string, 
    currentVision?: VisionState,
    sessionContext: string[] = []
  ): string {
    const contextSummary = currentVision ? this.buildVisionSummary(currentVision) : 'No existing vision data';
    const recentContext = sessionContext.length > 0 
      ? `Recent conversation:\n${sessionContext.slice(-3).join('\n')}\n\n`
      : '';

    return `You are an information extraction system. 
Extract structured company vision information from the user message and return ONLY valid JSON.

### Rules:
1. Map information to the standard schema when possible.
2. **IMPORTANT**: If a piece of information does not match any schema field but is still valuable, 
   store it under metadata.custom_fields with a meaningful key.
3. Use confidence scores from 0.0–1.0 based on extraction certainty.
4. If confidence < 0.5, set value to null.
5. Do not invent facts. Only use data clearly stated or strongly implied.

### Custom Fields Examples:
- User names, contact info → "user_name", "contact_email"
- Specific product names → "product_name"
- Team size, funding → "team_size", "funding_status"
- Geographic info → "location", "target_market"
- Any other valuable info not in the standard schema

${recentContext}User message: "${userMessage}"

Current vision context: ${contextSummary}

### Standard Schema Fields:
- company_name (string)
- industry (string)
- vision_statement (string)
- key_themes (string[])
- success_metrics (string[])
- target_outcomes (string[])
- timeline (string)
- constraints (string[])
- assumptions (string[])
- market_size (string)
- competitive_landscape (string)
- current_strategy (string)
- strategic_priorities (string[])
- company_size (number)

### Output JSON Structure:
{
  "company_name": { "value": string|null, "confidence": number, "source_span": string, "extraction_method": "direct|inferred|contextual" },
  "industry": { ... },
  "vision_statement": { ... },
  "key_themes": { ... },
  "success_metrics": { ... },
  "target_outcomes": { ... },
  "timeline": { ... },
  "constraints": { ... },
  "assumptions": { ... },
  "market_size": { ... },
  "competitive_landscape": { ... },
  "current_strategy": { ... },
  "strategic_priorities": { ... },
  "company_size": { ... },
  "metadata": {
    "custom_fields": {
      "<custom_key>": {
        "value": any,
        "confidence": number,
        "source_span": string,
        "extraction_method": "direct|inferred|contextual"
      }
    }
  }
}

### Confidence Guidelines:
- 0.9–1.0: Direct quotes ("We are Acme Corp")
- 0.7–0.9: Clear implication
- 0.5–0.7: Weak inference (value → null if < 0.5)

### Extraction Methods:
- "direct": Explicitly stated in the message
- "inferred": Logically derived from stated information  
- "contextual": Inferred from conversation history or existing vision

### Special Instructions:
- For user messages like "My name is John" → put in custom_fields as "user_name": "John"
- For product/service names not fitting schema → put in custom_fields
- For any personal or organizational details → check if they fit schema first, then custom_fields
- ALWAYS check if information should go in custom_fields if it doesn't match standard schema

Only extract information explicitly mentioned or clearly implied. Do not hallucinate data.`;
  }

  private buildVisionSummary(vision: VisionState): string {
    const parts: string[] = [];
    
    if (vision.company_name) parts.push(`Company: ${vision.company_name}`);
    if (vision.industry) parts.push(`Industry: ${vision.industry}`);
    if (vision.vision_statement) parts.push(`Vision: ${vision.vision_statement.substring(0, 100)}...`);
    if (vision.key_themes?.length) parts.push(`Themes: ${vision.key_themes.slice(0, 3).join(', ')}`);
    
    return parts.length > 0 ? parts.join(' | ') : 'No existing vision data';
  }

  private parseExtractionResponse(content: string): { extracted_fields: Record<string, ExtractedField>; custom_fields?: Record<string, ExtractedField> } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const extractedFields: Record<string, ExtractedField> = {};
      const customFields: Record<string, ExtractedField> = {};

      // Process standard schema fields
      const standardFields = [
        'company_name', 'industry', 'vision_statement', 'key_themes', 'success_metrics',
        'target_outcomes', 'timeline', 'constraints', 'assumptions', 'market_size',
        'competitive_landscape', 'current_strategy', 'strategic_priorities', 'company_size'
      ];

      // Validate and filter extracted fields
      for (const [field, data] of Object.entries(parsed)) {
        if (field === 'metadata') continue; // Handle metadata separately
        
        const fieldData = data as any;
        
        if (fieldData && 
            typeof fieldData.confidence === 'number' && 
            fieldData.confidence >= 0.5 && 
            fieldData.value !== null) {
          
          const extractedField = {
            value: fieldData.value,
            confidence: Math.min(1.0, Math.max(0.0, fieldData.confidence)),
            source_span: fieldData.source_span || '',
            extraction_method: fieldData.extraction_method || 'inferred',
          };

          if (standardFields.includes(field)) {
            extractedFields[field] = extractedField;
          } else {
            customFields[field] = extractedField;
          }
        }
      }

      // Handle custom fields from metadata if present
      if (parsed.metadata?.custom_fields) {
        for (const [key, data] of Object.entries(parsed.metadata.custom_fields)) {
          const fieldData = data as any;
          
          if (fieldData && 
              typeof fieldData.confidence === 'number' && 
              fieldData.confidence >= 0.5 && 
              fieldData.value !== null) {
            
            customFields[key] = {
              value: fieldData.value,
              confidence: Math.min(1.0, Math.max(0.0, fieldData.confidence)),
              source_span: fieldData.source_span || '',
              extraction_method: fieldData.extraction_method || 'inferred',
            };
          }
        }
      }

      return { 
        extracted_fields: extractedFields,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined
      };
    } catch (error) {
      console.error('[InformationExtractor] Failed to parse extraction response:', error);
      return { extracted_fields: {} };
    }
  }


  private calculateTotalConfidence(extractedFields: Record<string, ExtractedField>): number {
    const confidences = Object.values(extractedFields).map(f => f.confidence);
    return confidences.length > 0 
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
      : 0;
  }
}