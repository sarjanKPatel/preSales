// Consolidated Types - All Vision and Agent Types

// ===== VISION & DATABASE TYPES =====

export interface Vision {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  category: 'product' | 'market' | 'strategy' | 'innovation';
  impact: 'low' | 'medium' | 'high';
  timeframe: 'short-term' | 'medium-term' | 'long-term';
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  vision_state: VisionState;
  completeness_score: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GapAnalysis {
  missing_fields: string[];
  weak_areas: string[];
  recommendations: string[];
  completeness_score: number;
  qa_history: Array<{
    question: string;
    answer: string;
    timestamp: string;
  }>;
}

export interface VisionState {
  // Core vision content
  company_name?: string;
  vision_statement?: string;
  industry?: string;
  key_themes?: string[];
  success_metrics?: string[];
  target_outcomes?: string[];
  timeline?: string;
  constraints?: string[];
  assumptions?: string[];
  market_size?: string;
  competitive_landscape?: string;
  current_strategy?: string;
  strategic_priorities?: string[];
  company_size?: number;
  
  // Custom fields for additional business data that doesn't fit standard schema
  custom_fields?: Record<string, any>;
  
  // Nested metadata object
  metadata?: {
    session_id?: string;
    workspace_id?: string;
    user_id?: string;
    version?: number;
    created_at?: string;
    updated_at?: string;
    status?: 'draft' | 'in_progress' | 'completed' | 'validated';
    validation_score?: number;
    gap_analysis?: GapAnalysis;
    custom_fields?: Record<string, any>;
    vision_id?: string;
    vision_title?: string;
    vision_category?: string;
    vision_impact?: string;
    skipped_fields?: string[];
  };
  
  [key: string]: any; // Allow additional fields
}

export interface VisionSession {
  id: string;
  vision_id: string;
  session_id: string;
  created_at: string;
}

export interface VisionWithDetails extends Vision {
  message_count: number;
  last_message_at: string | null;
  creator_name: string | null;
  creator_email: string;
}

export interface CreateVisionInput {
  title: string;
  category: Vision['category'];
  impact: Vision['impact'];
  timeframe: Vision['timeframe'];
  tags?: string[];
}

export interface UpdateVisionInput {
  title?: string;
  category?: Vision['category'];
  impact?: Vision['impact'];
  timeframe?: Vision['timeframe'];
  tags?: string[];
  status?: Vision['status'];
  vision_state?: Partial<VisionState>;
}

// ===== AGENT TYPES =====

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
  metadata?: {
    tool_calls?: ToolCall[];
    sources?: string[];
    confidence?: number;
    timestamp?: string;
    saved?: boolean;
    session_id?: string;
    created_at?: string;
    [key: string]: any; // Allow additional metadata fields
  };
}

export interface SessionData {
  id: string;
  type: 'vision' | 'lead' | 'proposal';
  workspace_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface AgentContext {
  messages: AgentMessage[];
  session: SessionData;
  summary?: string;
  vision_state?: VisionState; // Contains content + nested metadata field
}

export interface ToolCall {
  tool: string;
  input: any;
  output: any;
  timestamp: string;
  duration_ms: number;
  error?: string;
}

export interface AgentRun {
  id: string;
  session_id: string;
  status: 'running' | 'completed' | 'failed';
  tool_calls: ToolCall[];
  started_at: string;
  completed_at?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface StreamResponse {
  type: 'token' | 'metadata' | 'error' | 'done';
  content?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}


// ===== LLM TYPES =====

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface LLMResponse {
  content: string;
  tokensUsed: number;
  model: string;
  finishReason?: string;
}

// ===== VALIDATION TYPES =====

export interface ValidationResult {
  valid: boolean;
  score: number;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  metrics: {
    completeness: number;
    coherence: number;
    specificity: number;
    alignment: number;
  };
}

// ===== LEGACY TYPES (DEPRECATED) =====

// VisionMetadata is now nested inside VisionState.metadata
// Keep interface for backward compatibility during migration
export interface VisionMetadata {
  session_id: string;
  workspace_id: string;
  user_id: string;
  version: number;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'in_progress' | 'completed' | 'validated';
  validation_score?: number;
  gap_analysis?: GapAnalysis;
  rag_sources?: string[];
  custom_fields?: Record<string, any>;
}