import { VisionState } from '../../types';

export interface PromptContext {
  vision_state?: VisionState;
  metadata?: VisionState['metadata']; // Use nested metadata type
  conversation_history?: string[];
  user_input?: string;
}

export class OpenAIAdapter {
  
  selectModel(taskType: 'vision' | 'extraction' | 'repair' | 'analysis', budgetTokens?: number): string {
    // Budget-aware model selection
    if (budgetTokens && budgetTokens < 1000) {
      return 'gpt-3.5-turbo';
    }

    switch (taskType) {
      case 'vision':
        return 'gpt-4-turbo'; // Best for complex strategic thinking
      case 'extraction':
        return 'gpt-4-turbo'; // Most reliable for structured extraction
      case 'repair':
        return 'gpt-4'; // Good balance for refinement
      case 'analysis':
        return 'gpt-4-turbo'; // Best for deep analysis
      default:
        return 'gpt-4-turbo';
    }
  }
}