import { supabase } from '@/lib/supabase';
import { VisionState } from '../../types';

export interface VisionUpdateInput {
  visionId: string;
  visionState: VisionState;
  workspaceId: string;
  userId: string;
  expectedVersion?: number;
  shouldUpdateTitle?: boolean;
  newTitle?: string;
}

export interface VisionUpdateResult {
  success: boolean;
  visionId: string;
  newVersion: number;
  completenessScore: number;
  error?: string;
  conflictData?: {
    currentVersion: number;
    expectedVersion: number;
    currentState: VisionState;
  };
}

export class VisionPersistence {
  
  /**
   * Atomically updates a vision with version control and rollback safety
   */
  async updateVisionAtomic(input: VisionUpdateInput): Promise<VisionUpdateResult> {
    const { visionId, visionState, workspaceId, userId, expectedVersion, shouldUpdateTitle, newTitle } = input;

    try {
      // Step 1: Start a transaction by getting current vision with FOR UPDATE lock
      const { data: currentVision, error: lockError } = await supabase
        .rpc('get_vision_for_update', {
          p_vision_id: visionId,
          p_workspace_id: workspaceId
        });

      if (lockError) {
        return {
          success: false,
          visionId,
          newVersion: 0,
          completenessScore: 0,
          error: `Failed to lock vision: ${lockError.message}`,
        };
      }

      if (!currentVision) {
        return {
          success: false,
          visionId,
          newVersion: 0,
          completenessScore: 0,
          error: 'Vision not found',
        };
      }

      // Step 2: Version conflict detection
      if (expectedVersion !== undefined && currentVision.completeness_score !== expectedVersion) {
        return {
          success: false,
          visionId,
          newVersion: currentVision.completeness_score,
          completenessScore: currentVision.completeness_score,
          error: 'Version conflict detected',
          conflictData: {
            currentVersion: currentVision.completeness_score,
            expectedVersion,
            currentState: currentVision.vision_state,
          },
        };
      }

      // Step 3: Calculate new version and completeness score
      const newVersion = (currentVision.completeness_score || 0) + 1;
      const completenessScore = this.calculateCompletenessScore(visionState);

      // Step 4: Prepare vision state - remove only system-level metadata duplicates, keep business data
      const { metadata = {}, ...cleanVisionState } = visionState;
      
      // Remove only system-level metadata that would duplicate database columns
      const {
        session_id,
        workspace_id,
        user_id, 
        created_at,
        updated_at,
        vision_id,
        vision_title,
        vision_category,
        vision_impact,
        version,
        ...businessMetadata
      } = metadata;
      
      // Keep all business-related metadata in the vision state
      if (Object.keys(businessMetadata).length > 0) {
        cleanVisionState.metadata = businessMetadata;
      }
      
      // Step 5: Atomic update using RPC for transaction safety
      console.log('[VisionPersistence] Calling update_vision_atomic RPC...', {
        visionId,
        cleanVisionStateKeys: Object.keys(cleanVisionState),
        businessMetadataKeys: Object.keys(businessMetadata),
        hasBusinessMetadata: Object.keys(businessMetadata).length > 0,
        completenessScore,
        workspaceId,
        userId,
        currentVisionScore: currentVision.completeness_score,
        expectedVersionToPass: currentVision.completeness_score
      });

      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_vision_atomic', {
          p_vision_id: visionId,
          p_vision_state: cleanVisionState,
          p_completeness_score: completenessScore,
          p_workspace_id: workspaceId,
          p_user_id: userId,
          p_expected_version: currentVision.completeness_score
        });

      console.log('[VisionPersistence] RPC response:', {
        updateResult,
        updateError: updateError?.message,
        updateErrorDetails: updateError
      });

      if (updateError) {
        console.error('[VisionPersistence] ❌ RPC call failed:', updateError);
        return {
          success: false,
          visionId,
          newVersion: currentVision.completeness_score || 0,
          completenessScore: currentVision.completeness_score || 0,
          error: `Atomic update failed: ${updateError.message}`,
        };
      }

      // Step 6: Update title if company name changed
      if (shouldUpdateTitle && newTitle) {
        console.log('[VisionPersistence] Updating vision title:', {
          visionId,
          newTitle
        });

        const { error: titleUpdateError } = await supabase
          .from('visions')
          .update({ title: newTitle })
          .eq('id', visionId)
          .eq('workspace_id', workspaceId);

        if (titleUpdateError) {
          console.error('[VisionPersistence] ❌ Failed to update title:', titleUpdateError);
          // Don't fail the entire operation for title update failure
        } else {
          console.log('[VisionPersistence] ✅ Vision title updated successfully');
        }
      }

      // Step 7: Log the successful change
      await this.logVisionChange({
        visionId,
        userId,
        oldVersion: currentVision.completeness_score || 0,
        newVersion: completenessScore,
        changeType: 'extraction_update',
        extractionMetadata: metadata,
      });

      return {
        success: true,
        visionId,
        newVersion: completenessScore,
        completenessScore,
      };

    } catch (error) {
      return {
        success: false,
        visionId,
        newVersion: 0,
        completenessScore: 0,
        error: `Transaction failed: ${String(error)}`,
      };
    }
  }

  /**
   * Creates a new vision atomically
   */
  async createVisionAtomic(input: {
    title: string;
    category: 'product' | 'market' | 'strategy' | 'innovation';
    impact: 'low' | 'medium' | 'high';
    timeframe: 'short-term' | 'medium-term' | 'long-term';
    tags: string[];
    workspaceId: string;
    userId: string;
    initialVisionState?: VisionState;
  }): Promise<VisionUpdateResult> {
    try {
      const {
        title,
        category,
        impact,
        timeframe,
        tags,
        workspaceId,
        userId,
        initialVisionState = {}
      } = input;

      // Calculate initial completeness
      const completenessScore = this.calculateCompletenessScore(initialVisionState);

      // Create vision using RPC for consistency
      const { data: newVision, error: createError } = await supabase
        .rpc('create_vision_atomic', {
          p_title: title,
          p_category: category,
          p_impact: impact,
          p_timeframe: timeframe,
          p_tags: tags,
          p_workspace_id: workspaceId,
          p_user_id: userId,
          p_vision_state: initialVisionState,
          p_completeness_score: completenessScore
        });

      if (createError || !newVision) {
        return {
          success: false,
          visionId: '',
          newVersion: 0,
          completenessScore: 0,
          error: `Failed to create vision: ${createError?.message || 'Unknown error'}`,
        };
      }

      return {
        success: true,
        visionId: newVision.id,
        newVersion: 1,
        completenessScore,
      };

    } catch (error) {
      return {
        success: false,
        visionId: '',
        newVersion: 0,
        completenessScore: 0,
        error: `Vision creation failed: ${String(error)}`,
      };
    }
  }

  /**
   * Calculates vision completeness score based on filled fields
   */
  private calculateCompletenessScore(visionState: VisionState): number {
    let score = 0;
    const maxScore = 100;

    // Core fields (60 points total)
    const coreFields = [
      { field: 'company_name', points: 20 },
      { field: 'vision_statement', points: 20 },
      { field: 'industry', points: 10 },
      { field: 'key_themes', points: 10, isArray: true },
    ];

    coreFields.forEach(({ field, points, isArray }) => {
      const value = visionState[field as keyof VisionState];
      
      if (value) {
        if (isArray && Array.isArray(value) && value.length > 0) {
          score += points;
        } else if (!isArray && typeof value === 'string' && value.trim().length > 0) {
          score += points;
        } else if (typeof value === 'number') {
          score += points;
        }
      }
    });

    // Important fields (30 points total)
    const importantFields = [
      { field: 'success_metrics', points: 10, isArray: true },
      { field: 'target_outcomes', points: 10, isArray: true },
      { field: 'timeline', points: 5 },
      { field: 'current_strategy', points: 5 },
    ];

    importantFields.forEach(({ field, points, isArray }) => {
      const value = visionState[field as keyof VisionState];
      
      if (value) {
        if (isArray && Array.isArray(value) && value.length > 0) {
          score += points;
        } else if (!isArray && typeof value === 'string' && value.trim().length > 0) {
          score += points;
        }
      }
    });

    // Enhancement fields (10 points total)
    const enhancementFields = [
      'constraints', 'assumptions', 'competitive_landscape', 
      'market_size', 'strategic_priorities'
    ];

    const filledEnhancements = enhancementFields.filter(field => {
      const value = visionState[field as keyof VisionState];
      return value && (
        (typeof value === 'string' && value.trim().length > 0) ||
        (Array.isArray(value) && value.length > 0)
      );
    });

    score += Math.min(10, filledEnhancements.length * 2);

    // Business custom fields bonus (2 points for having business custom fields)
    const customFields = visionState.custom_fields || visionState.metadata?.custom_fields;
    if (customFields && Object.keys(customFields).length > 0) {
      score += 2;
    }
    
    // Gap analysis bonus (1 point for having gap analysis data)
    if (visionState.metadata?.gap_analysis) {
      score += 1;
    }

    return Math.min(maxScore, Math.max(0, score));
  }

  /**
   * Logs vision changes for audit trail
   */
  private async logVisionChange(input: {
    visionId: string;
    userId: string;
    oldVersion: number;
    newVersion: number;
    changeType: string;
    extractionMetadata?: any;
  }): Promise<void> {
    try {
      const { visionId, userId, oldVersion, newVersion, changeType, extractionMetadata } = input;

      await supabase
        .from('vision_change_log')
        .insert({
          vision_id: visionId,
          user_id: userId,
          old_version: oldVersion,
          new_version: newVersion,
          change_type: changeType,
          metadata: {
            extraction_metadata: extractionMetadata,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        });

    } catch (error) {
      // Log errors but don't fail the main operation
      console.warn('[VisionPersistence] Failed to log change:', error);
    }
  }

  /**
   * Retrieves vision with version information
   */
  async getVisionWithVersion(visionId: string, workspaceId: string): Promise<{
    vision: any;
    version: number;
    lastUpdated: string;
  } | null> {
    try {
      const { data: vision, error } = await supabase
        .from('visions')
        .select('*')
        .eq('id', visionId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !vision) {
        return null;
      }

      return {
        vision: vision.vision_state,
        version: vision.completeness_score || 0,
        lastUpdated: vision.updated_at,
      };

    } catch (error) {
      console.error('[VisionPersistence] Failed to get vision:', error);
      return null;
    }
  }

  /**
   * Handles vision update conflicts by providing merge strategies
   */
  async resolveVersionConflict(input: {
    visionId: string;
    workspaceId: string;
    clientVersion: number;
    clientChanges: Partial<VisionState>;
    strategy: 'client_wins' | 'server_wins' | 'merge';
  }): Promise<VisionUpdateResult> {
    const { visionId, workspaceId, clientVersion, clientChanges, strategy } = input;

    try {
      const currentData = await this.getVisionWithVersion(visionId, workspaceId);
      
      if (!currentData) {
        return {
          success: false,
          visionId,
          newVersion: 0,
          completenessScore: 0,
          error: 'Vision not found for conflict resolution',
        };
      }

      let resolvedState: VisionState;

      switch (strategy) {
        case 'client_wins':
          resolvedState = { ...currentData.vision, ...clientChanges };
          break;
        
        case 'server_wins':
          resolvedState = currentData.vision;
          break;
        
        case 'merge':
        default:
          // Intelligent merge: combine non-conflicting changes
          resolvedState = this.mergeVisionStates(currentData.vision, clientChanges);
          break;
      }

      // Apply the resolved state
      return await this.updateVisionAtomic({
        visionId,
        visionState: resolvedState,
        workspaceId,
        userId: 'system', // Mark as system resolution
        expectedVersion: currentData.version,
      });

    } catch (error) {
      return {
        success: false,
        visionId,
        newVersion: 0,
        completenessScore: 0,
        error: `Conflict resolution failed: ${String(error)}`,
      };
    }
  }

  /**
   * Intelligently merges two vision states
   */
  private mergeVisionStates(server: VisionState, client: Partial<VisionState>): VisionState {
    const merged = { ...server };

    // For each field in client changes, apply non-destructive merge
    Object.entries(client).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const serverValue = (server as any)[key];
        
        if (Array.isArray(value) && Array.isArray(serverValue)) {
          // Merge arrays, avoiding duplicates
          const combined = [...serverValue];
          value.forEach(item => {
            if (!combined.includes(item)) {
              combined.push(item);
            }
          });
          (merged as any)[key] = combined;
        } else if (typeof value === 'string' && value.trim().length > 0) {
          // Take non-empty string values
          (merged as any)[key] = value;
        } else if (typeof value === 'number') {
          // Take number values
          (merged as any)[key] = value;
        }
      }
    });

    return merged;
  }
}