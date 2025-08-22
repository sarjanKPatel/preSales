export enum IntentType {
  QUESTION = 'question',           // User asking about existing vision data
  INFORMATION = 'information',     // User providing new information
  CLARIFICATION = 'clarification', // User responding to gap-detection questions
  COMMAND = 'command',            // User requesting specific actions
  UI_ACTION = 'ui_action',        // User clicked a button (skip, approve, etc.)
  GREETING = 'greeting',          // User greeting or starting conversation
  UNKNOWN = 'unknown'             // Cannot determine intent
}

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  subIntent?: string;             // More specific intent within the main category
  entities?: Record<string, any>; // Extracted entities from the message
  reasoning?: string;             // AI's reasoning for the classification
}

export interface IntentClassifierInput {
  user_message: string;
  conversation_history?: string[];
  vision_context?: {
    has_company_name: boolean;
    has_industry: boolean;
    has_vision_statement: boolean;
    completeness_score: number;
    last_agent_message?: string;
  };
  ui_context?: {
    buttons_shown?: string[];
    awaiting_response?: boolean;
  };
}

export interface IntentClassifierOutput extends IntentClassification {
  suggested_action?: string;
  priority?: 'high' | 'medium' | 'low';
}