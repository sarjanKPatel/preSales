import { Tool, ToolResult } from './types';
import { VisionState, AgentContext } from '../../types';
import { GapDetector } from './gapDetector';

export interface UIAction {
  type: 'skip' | 'approve' | 'add_more' | 'custom';
  fieldName?: string;
  metadata?: any;
}

export interface UIActionHandlerInput {
  action: UIAction;
  vision_state?: VisionState;
  context?: AgentContext;
}

export interface UIActionHandlerOutput {
  handled: boolean;
  response: string;
  next_action?: string;
  state_updates?: Partial<VisionState>;
  should_continue?: boolean;
  ui_actions?: {
    type: 'buttons';
    context?: string;
    actions: Array<{
      id: string;
      label: string;
      action_type: 'skip' | 'approve' | 'add_more';
      field_name?: string;
      variant?: 'primary' | 'secondary' | 'outline';
    }>;
  };
}

/**
 * UIActionHandler Tool
 * Handles user interactions with UI elements (buttons, etc.)
 */
export class UIActionHandler implements Tool<UIActionHandlerInput, UIActionHandlerOutput> {
  name = 'UIActionHandler';
  description = 'Processes user interactions with UI elements';
  private gapDetector = new GapDetector();

  async execute(input: UIActionHandlerInput): Promise<ToolResult<UIActionHandlerOutput>> {
    try {
      const { action, vision_state } = input;

      switch (action.type) {
        case 'skip':
          return await this.handleSkip(action, vision_state);
        
        case 'approve':
          return this.handleApprove(action, vision_state);
        
        case 'add_more':
          return this.handleAddMore(action, vision_state);
        
        default:
          return this.handleCustom(action, vision_state);
      }
    } catch (error) {
      return {
        success: false,
        error: `UI action handling failed: ${String(error)}`,
      };
    }
  }

  private async handleSkip(action: UIAction, vision_state?: VisionState): Promise<ToolResult<UIActionHandlerOutput>> {
    if (!action.fieldName) {
      console.warn('[UIActionHandler] Skip action missing fieldName:', action);
      return {
        success: true,
        data: {
          handled: true,
          response: 'Got it! Moving on to the next area.',
          should_continue: true,
        },
      };
    }

    // Get current skipped fields
    const currentSkippedFields = vision_state?.metadata?.skipped_fields || [];
    
    console.log('[UIActionHandler] Processing skip action:', {
      fieldName: action.fieldName,
      currentSkippedFields: currentSkippedFields,
      hasVisionState: !!vision_state,
      hasMetadata: !!vision_state?.metadata
    });
    
    // Check if field is already skipped
    if (currentSkippedFields.includes(action.fieldName)) {
      return {
        success: true,
        data: {
          handled: true,
          response: `This field (${action.fieldName}) is already skipped. Let's move on to the next question.`,
          should_continue: true,
        },
      };
    }

    // Add field to skipped list
    const updatedSkippedFields = [...currentSkippedFields, action.fieldName];
    
    console.log('[UIActionHandler] Creating updated metadata:', {
      previousSkippedFields: currentSkippedFields,
      fieldToAdd: action.fieldName,
      updatedSkippedFields: updatedSkippedFields
    });
    
    // Create updated metadata
    const updatedMetadata = {
      ...vision_state?.metadata,
      skipped_fields: updatedSkippedFields,
      updated_at: new Date().toISOString(),
    };

    // Generate response with next question
    const fieldLabel = this.getFieldLabel(action.fieldName);
    let response = `Got it! I'll skip the ${fieldLabel.toLowerCase()} section.`;

    // Use gap detector to find next question after this field is skipped
    try {
      const visionStateWithUpdates = {
        ...vision_state,
        metadata: updatedMetadata,
      };
      
      
      const gapResult = await this.gapDetector.execute({
        vision_state: visionStateWithUpdates,
        context: []
      });
      
      if (gapResult.success && gapResult.data?.next_questions && gapResult.data.next_questions.length > 0) {
        const nextQuestion = gapResult.data.next_questions[0];
        response += `\n\n${nextQuestion}`;
        
        // Generate UI actions for the follow-up question
        // Get the smart question data to find the target field
        const smartQuestions = gapResult.data.smart_questions;
        if (smartQuestions && smartQuestions.length > 0) {
          const targetField = smartQuestions[0].target_fields?.[0];
          if (targetField) {
            return {
              success: true,
              data: {
                handled: true,
                response,
                should_continue: true,
                state_updates: {
                  metadata: updatedMetadata,
                },
                next_action: 'continue_conversation',
                ui_actions: {
                  type: 'buttons',
                  context: 'after_question',
                  actions: [{
                    id: `skip_${targetField}_${Date.now()}`,
                    label: 'Skip this question',
                    action_type: 'skip',
                    field_name: targetField,
                    variant: 'outline'
                  }]
                }
              },
            };
          }
        }
      } else {
        response = "Great progress! Your vision is taking shape nicely. Is there anything specific you'd like to add or refine?";
      }
    } catch (error) {
      console.warn('[UIActionHandler] Failed to get next question:', error);
      response += "\n\nWhat would you like to focus on next for your vision?";
    }

    return {
      success: true,
      data: {
        handled: true,
        response,
        should_continue: true,
        state_updates: {
          metadata: updatedMetadata,
        },
        next_action: 'continue_conversation',
      },
    };
  }

  /**
   * Get user-friendly label for field names
   */
  private getFieldLabel(fieldName: string): string {
    const fieldLabels: Record<string, string> = {
      company_name: 'Company Name',
      industry: 'Industry',
      vision_statement: 'Vision Statement',
      key_themes: 'Strategic Themes',
      success_metrics: 'Success Metrics',
      target_outcomes: 'Target Outcomes',
      current_strategy: 'Current Strategy',
      competitive_landscape: 'Competitive Analysis',
      market_size: 'Market Context',
      constraints: 'Constraints',
      assumptions: 'Assumptions',
      timeline: 'Timeline',
      strategic_priorities: 'Strategic Priorities',
      company_size: 'Company Size',
    };

    return fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private handleApprove(action: UIAction, vision_state?: VisionState): ToolResult<UIActionHandlerOutput> {
    return {
      success: true,
      data: {
        handled: true,
        response: "Great! That's been approved and saved to your vision.",
        should_continue: true,
      },
    };
  }

  private handleAddMore(action: UIAction, vision_state?: VisionState): ToolResult<UIActionHandlerOutput> {
    // TODO: Implement add more details logic
    return {
      success: true,
      data: {
        handled: true,
        response: "What additional details would you like to add?",
        should_continue: true,
      },
    };
  }

  private handleCustom(action: UIAction, vision_state?: VisionState): ToolResult<UIActionHandlerOutput> {
    return {
      success: true,
      data: {
        handled: false,
        response: "Custom action received.",
        should_continue: true,
      },
    };
  }
}