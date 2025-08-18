import { Tool, VisionStateInput, VisionStateOutput, ExtractedField } from './types';
import { ToolResult, VisionMetadata, VisionState } from '../../types';

export class VisionStateManager implements Tool<VisionStateInput, VisionStateOutput> {
  name = 'VisionStateManager';
  description = 'Manages and updates vision state with validation and confidence-based merging';

  async execute(input: VisionStateInput): Promise<ToolResult<VisionStateOutput>> {
    try {
      const { current_state, updates } = input;
      
      // Simple merge for backward compatibility
      const updatedState = { ...current_state, ...updates };
      
      // Basic metadata update
      const updatedMetadata: VisionMetadata = {
        session_id: current_state.metadata?.session_id || 'unknown',
        workspace_id: current_state.metadata?.workspace_id || 'unknown', 
        user_id: current_state.metadata?.user_id || 'unknown',
        version: (current_state.metadata?.version || 0) + 1,
        created_at: current_state.metadata?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: current_state.metadata?.status || 'draft',
        ...current_state.metadata,
      };

      return {
        success: true,
        data: {
          updated_state: updatedState,
          updated_metadata: updatedMetadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Vision state update failed: ${String(error)}`,
      };
    }
  }


  // New method for confidence-based merging with extracted fields
  mergeWithExtractionData(
    current: VisionState, 
    extractedFields: Record<string, ExtractedField>,
    customFields?: Record<string, ExtractedField>
  ): VisionState {
    const merged = { ...current };
    const CONFIDENCE_THRESHOLD = 0.7; // Minimum confidence to overwrite existing data
    const HIGH_CONFIDENCE_THRESHOLD = 0.9; // Always overwrite threshold

    // Process standard schema fields
    for (const [field, extraction] of Object.entries(extractedFields)) {
      const currentValue = (current as any)[field];
      const newValue = extraction.value;

      if (this.shouldUpdateField(currentValue, newValue, extraction.confidence, CONFIDENCE_THRESHOLD, HIGH_CONFIDENCE_THRESHOLD)) {
        if (Array.isArray(newValue) && Array.isArray(currentValue)) {
          // For arrays, merge intelligently based on confidence
          if (extraction.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
            // High confidence: replace entirely
            (merged as any)[field] = newValue;
          } else {
            // Medium confidence: merge and deduplicate
            const combined = [...currentValue];
            newValue.forEach(item => {
              if (!combined.includes(item)) {
                combined.push(item);
              }
            });
            (merged as any)[field] = combined;
          }
        } else {
          // For strings/numbers: replace if confidence is high enough
          (merged as any)[field] = newValue;
        }
      }
    }

    // Handle custom fields
    if (customFields) {
      if (!merged.metadata) merged.metadata = {};
      if (!merged.metadata.custom_fields) merged.metadata.custom_fields = {};

      for (const [field, extraction] of Object.entries(customFields)) {
        const currentCustomValue = merged.metadata.custom_fields[field];
        
        if (this.shouldUpdateField(currentCustomValue, extraction.value, extraction.confidence, CONFIDENCE_THRESHOLD, HIGH_CONFIDENCE_THRESHOLD)) {
          merged.metadata.custom_fields[field] = extraction.value;
        }
      }
    }

    return merged;
  }

  private shouldUpdateField(
    currentValue: any, 
    newValue: any, 
    confidence: number, 
    threshold: number, 
    highThreshold: number
  ): boolean {
    // Always update if no current value exists
    if (currentValue === undefined || currentValue === null || currentValue === '') {
      return confidence >= 0.5; // Lower threshold for new fields
    }

    // Always update if confidence is very high
    if (confidence >= highThreshold) {
      return true;
    }

    // Update if confidence meets threshold and values are different
    if (confidence >= threshold) {
      // For strings, check if they're actually different (case-insensitive)
      if (typeof currentValue === 'string' && typeof newValue === 'string') {
        return currentValue.toLowerCase().trim() !== newValue.toLowerCase().trim();
      }
      
      // For arrays, check if new data adds value
      if (Array.isArray(currentValue) && Array.isArray(newValue)) {
        return newValue.some(item => !currentValue.includes(item));
      }
      
      // For other types, check strict equality
      return currentValue !== newValue;
    }

    return false;
  }





}