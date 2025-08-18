import { ToolResult, GapAnalysis, VisionMetadata, VisionState } from '../../types';

// Base Tool Interface
export interface Tool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  execute(input: TInput): Promise<ToolResult<TOutput>>;
}

// Gap Detector Types
export interface GapDetectorInput {
  vision_state: VisionState; // metadata is now nested inside vision_state.metadata
  context?: string[];
}

export interface GapDetectorOutput {
  gaps_found: boolean;
  analysis: GapAnalysis;
  next_questions: string[];
  // Extended multi-dimensional analysis data
  suggested_focus?: 'basic_info' | 'strategy' | 'metrics' | 'implementation';
  field_scores?: Record<string, number>;
  smart_questions?: Array<{
    question: string;
    target_fields: string[];
    priority: 'high' | 'medium' | 'low';
    context_trigger?: string;
    follow_up_type: 'clarification' | 'expansion' | 'validation';
    industry_specific?: boolean;
  }>;
}


// Vision State Manager Types
export interface VisionStateInput {
  current_state: VisionState;
  updates: Partial<VisionState>;
  metadata?: Partial<VisionMetadata>;
  validation?: boolean;
}

export interface VisionStateOutput {
  updated_state: VisionState;
  updated_metadata: VisionMetadata;
  validation_result?: {
    valid: boolean;
    issues: string[];
    score: number;
  };
}

// Validation Tool Types
export interface ValidationInput {
  vision_state: VisionState;
  metadata: VisionMetadata;
  criteria?: string[];
}

export interface ValidationOutput {
  valid: boolean;
  score: number;
  issues: Array<{
    field: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }>;
  recommendations: string[];
}

// Tool Registry Types
export interface ToolRegistry {
  register<T extends Tool>(tool: T): void;
  get(name: string): Tool | undefined;
  list(): string[];
  execute(name: string, input: any): Promise<ToolResult>;
}

// Information Extractor Types
export interface InformationExtractorInput {
  user_message: string;
  current_vision?: VisionState;
  session_context?: string[];
  // Optional persistence config - if provided, tool will handle persistence
  persistence_config?: {
    vision_id: string;
    workspace_id: string;
    user_id: string;
  };
}

export interface ExtractedField {
  value: any;
  confidence: number;
  source_span: string;
  extraction_method: 'direct' | 'inferred' | 'contextual';
}

export interface InformationExtractorOutput {
  extracted_fields: Record<string, ExtractedField>;
  custom_fields?: Record<string, ExtractedField>;
  metadata: {
    extraction_timestamp: string;
    model_version: string;
    session_context_used: boolean;
    total_confidence: number;
  };
  updated_vision_state?: VisionState; // The merged and persisted vision state
}

// Tool Router Types
export interface ToolRouter {
  execute(toolName: string, input: any): Promise<ToolResult>;
  registerTool(tool: Tool): void;
  getAvailableTools(): string[];
}