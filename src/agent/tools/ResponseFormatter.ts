import { Tool, ToolResult } from './types';
import { VisionState } from '../../types';

export interface ResponseFormatterInput {
  type: 'greeting' | 'question' | 'questions' | 'information' | 'clarification' | 'command' | 'ui_action' | 'unknown';
  data?: any;
  vision_state?: VisionState;
  metadata?: any;
  includeUI?: boolean;
}

export interface UIElement {
  type: 'button' | 'progress' | 'info';
  id?: string;
  label?: string;
  action?: string;
  metadata?: any;
}

export interface ResponseFormatterOutput {
  content: string;
  uiElements?: {
    buttons?: Array<{
      id: string;
      label: string;
      action: string;
      metadata?: any;
    }>;
    progress?: {
      completeness: number;
      missingFields: string[];
    };
    info?: any;
  };
  tone?: 'friendly' | 'professional' | 'encouraging';
}

/**
 * ResponseFormatter Tool
 * Formats agent responses with appropriate UI elements and tone
 * Used by handleTurn to format responses before streaming to client
 */
export class ResponseFormatter implements Tool<ResponseFormatterInput, ResponseFormatterOutput> {
  name = 'ResponseFormatter';
  description = 'Formats responses with personality and UI elements';

  async execute(input: ResponseFormatterInput): Promise<ToolResult<ResponseFormatterOutput>> {
    try {
      switch (input.type) {
        case 'greeting':
          return this.formatGreeting(input);
        
        case 'question':
          return this.formatQuestionAnswer(input);
        
        case 'information':
          return this.formatInformation(input);
        
        case 'clarification':
          return this.formatClarification(input);
        
        case 'command':
          return this.formatCommand(input);
        
        case 'ui_action':
          return this.formatUIAction(input);
        
        case 'unknown':
        default:
          return this.formatUnknown(input);
      }
    } catch (error) {
      return {
        success: false,
        error: `Response formatting failed: ${String(error)}`,
      };
    }
  }

  private formatGreeting(input: ResponseFormatterInput): ToolResult<ResponseFormatterOutput> {
    const hasVisionData = input.vision_state && (
      input.vision_state.company_name || 
      input.vision_state.industry || 
      input.vision_state.vision_statement
    );

    let content: string;

    if (hasVisionData) {
      // Returning user with existing vision
      const companyName = input.vision_state?.company_name || 'your company';
      content = `Welcome back! Let's continue working on ${companyName}'s vision.`;
    } else {
      // New user
      content = `Hello! I'm your AI vision assistant. Let's create a compelling strategic vision for your company.`;
    }

    return {
      success: true,
      data: {
        content,
        tone: 'friendly',
        // TODO: Add UI buttons for greeting
        // - Continue Vision button (for returning users)
        // - Start Creating Vision button (for new users)
        // - Learn More button
      },
    };
  }

  private formatQuestionAnswer(input: ResponseFormatterInput): ToolResult<ResponseFormatterOutput> {
    const { answer, searchResults, hasFullAnswer, confidence } = input.data || {};
    
    let content = '';
    
    if (hasFullAnswer) {
      // Complete answer available from vision data
      content = answer || "Here's what I found based on your vision data:";
      
      // Add confidence indicator for low confidence answers
      if (confidence && confidence < 0.7) {
        content += "\n\n*Please let me know if this information seems incorrect.*";
      }
    } else {
      // Partial answer or no data available
      content = answer || "I don't have complete information about that yet.";
      content += " Would you like to add this information to your vision?";
    }
    
    // Add source information if available
    if (searchResults && searchResults.length > 0) {
      const sourceCount = searchResults.length;
      content += `\n\n*Based on ${sourceCount} relevant section${sourceCount > 1 ? 's' : ''} from your vision.*`;
    }

    return {
      success: true,
      data: {
        content,
        tone: 'professional',
        // TODO: Add UI buttons for question answers
        // - Ask Follow-up button
        // - Update Vision button
        // - Add This Info button (for incomplete answers)
      },
    };
  }

  private formatInformation(input: ResponseFormatterInput): ToolResult<ResponseFormatterOutput> {
    const { extracted_fields, confidence, field_updates } = input.data || {};
    
    let content = '';
    
    if (extracted_fields && Object.keys(extracted_fields).length > 0) {
      content = "Thanks for that information! I've updated your vision with:\n\n";
      
      Object.entries(extracted_fields).forEach(([field, data]: [string, any]) => {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const value = typeof data === 'object' ? data.value : data;
        content += `• ${fieldName}: ${value}\n`;
      });
      
      // Add confidence warning for low confidence extractions
      if (confidence && confidence < 0.8) {
        content += "\n*Please let me know if I misunderstood anything.*";
      }
    } else {
      content = "I've noted that information. What else would you like to add to your vision?";
    }

    return {
      success: true,
      data: {
        content,
        tone: 'encouraging',
        // TODO: Add UI buttons for information responses
        // - Continue Adding Info button
        // - Review Vision button
        // - Correct Information button (for low confidence)
      },
    };
  }

  private formatQuestions(input: ResponseFormatterInput): ToolResult<ResponseFormatterOutput> {
    const { next_questions, gaps_found, analysis } = input.data || {};
    
    let content = '';
    
    // Format the questions nicely
    if (next_questions && next_questions.length > 0) {
      if (next_questions.length === 1) {
        content = next_questions[0];
      } else {
        content = "I need some more information:\n\n";
        next_questions.forEach((question: string, index: number) => {
          content += `${index + 1}. ${question}\n`;
        });
      }
      
      // Add context about gaps if available
      if (gaps_found && gaps_found.length > 0) {
        content += `\n\n*These questions will help fill gaps in your vision.*`;
      }
    } else {
      content = "I'd like to learn more about your vision. Could you tell me more?";
    }

    return {
      success: true,
      data: {
        content,
        tone: 'professional',
        // TODO: Add UI buttons for questions
        // - Answer Questions button
        // - Skip for now button
        // - Review Vision button
      },
    };
  }

  private formatClarification(input: ResponseFormatterInput): ToolResult<ResponseFormatterOutput> {
    const { 
      question, 
      context, 
      field_name,
      current_value,
      options 
    } = input.data || {};
    
    let content = '';
    
    if (question) {
      content = question;
      
      if (current_value) {
        content += `\n\nCurrent value: ${current_value}`;
      }
      
      if (context) {
        content += `\n\n*${context}*`;
      }
      
      if (options && options.length > 0) {
        content += `\n\nOptions:\n${options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n')}`;
      }
    } else {
      content = "Could you clarify that for me? I want to make sure I understand correctly.";
    }

    return {
      success: true,
      data: {
        content,
        tone: 'professional',
        // TODO: Add UI buttons for clarification
        // - Yes/No buttons
        // - Option selection buttons
        // - Skip button
        // - Correct/Update button
      },
    };
  }

  private formatCommand(input: ResponseFormatterInput): ToolResult<ResponseFormatterOutput> {
    const { command_type, result, status, message } = input.data || {};
    
    let content = '';
    
    switch (command_type) {
      case 'save':
        content = status === 'success' 
          ? "Your vision has been saved successfully!" 
          : "There was an issue saving your vision. Please try again.";
        break;
      case 'export':
        content = status === 'success'
          ? "Your vision has been exported successfully!"
          : "There was an issue exporting your vision. Please try again.";
        break;
      case 'finalize':
        content = status === 'success'
          ? "🎉 Congratulations! Your vision has been finalized and is now complete."
          : "There was an issue finalizing your vision. Please try again.";
        break;
      case 'reset':
        content = "Your vision has been reset. We can start fresh whenever you're ready.";
        break;
      case 'summary':
        content = result?.summary || "Here's a summary of your current vision progress.";
        break;
      default:
        content = message || "Command executed successfully.";
    }
    
    if (result?.details) {
      content += `\n\n${result.details}`;
    }

    return {
      success: true,
      data: {
        content,
        tone: status === 'success' ? 'encouraging' : 'professional',
        // TODO: Add UI buttons for commands
        // - Continue button
        // - View Result button
        // - Try Again button (for failures)
        // - Next Action button
      },
    };
  }


  private formatUIAction(input: ResponseFormatterInput): ToolResult<ResponseFormatterOutput> {
    const { action_type, result, message, next_step } = input.data || {};
    
    let content = '';
    
    switch (action_type) {
      case 'skip':
        content = "No problem! We can come back to that later. Let's continue with the next section.";
        break;
      case 'approve':
        content = "Great! I've approved that section. Moving on to the next part of your vision.";
        break;
      case 'continue':
        content = "Perfect! Let's pick up where we left off.";
        break;
      case 'save':
        content = "Your vision has been saved successfully.";
        break;
      default:
        content = message || "Action completed successfully.";
    }
    
    if (next_step) {
      content += ` ${next_step}`;
    }

    return {
      success: true,
      data: {
        content,
        tone: 'professional',
        // TODO: Add UI buttons for UI actions
        // - Continue button
        // - Undo button (where applicable)
        // - Next Section button
      },
    };
  }

  private formatUnknown(input: ResponseFormatterInput): ToolResult<ResponseFormatterOutput> {
    const content = input.data?.content || 
      "I'm not sure I understand what you're looking for. Could you rephrase that or let me know how I can help you with your vision?";
    
    return {
      success: true,
      data: {
        content,
        tone: 'friendly',
        // TODO: Add UI buttons for unknown intent
        // - Help button
        // - Suggest Actions buttons
        // - Start Over button
        // - Continue Vision button
      },
    };
  }
}