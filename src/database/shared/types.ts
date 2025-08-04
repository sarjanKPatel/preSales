// =============================================
// Database Types
// TypeScript interfaces for all database entities
// =============================================

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  user_id: string;
  company_vision: {
    mission?: string;
    values?: string;
    goals?: string;
    uniqueValue?: string;
    companyName?: string;
  };
  metadata: {
    description?: string;
    industry?: string;
    website?: string;
    size_category?: string;
    status?: 'active' | 'draft' | 'archived';
    is_primary?: boolean;
    tags?: string[];
    logo_url?: string;
    founded_year?: number;
    employee_count?: number;
    headquarters?: string;
    target_market?: string[];
    competitors?: string[];
    key_differentiators?: string[];
    [key: string]: any;
  };
  raw_chat_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  metadata: {
    contact_phone?: string;
    status?: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost';
    deal_size?: number;
    industry?: string;
    company_size?: string;
    website?: string;
    notes?: string;
    last_contact?: string;
    lead_source?: string;
    priority?: 'low' | 'medium' | 'high';
    budget_range?: string;
    decision_timeline?: string;
    decision_makers?: string[];
    pain_points?: string[];
    custom_fields?: Record<string, any>;
    [key: string]: any;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  title: string;
  company_name: string;
  status: 'active' | 'inactive' | 'draft';
  description?: string;
  amount?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalSection {
  id: string;
  proposal_id: string;
  section_title: string;
  section_type: string;
  content: Record<string, any>;
  order_index: number;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  preview?: string;
  chat_type: 'vision' | 'lead' | 'proposal' | 'general';
  company_vision_id?: string;
  lead_id?: string;
  proposal_id?: string;
  metadata: {
    status?: 'active' | 'archived';
    last_activity_at?: string;
    message_count?: number;
    ai_model_used?: string;
    session_tags?: string[];
    custom_context?: Record<string, any>;
    user_preferences?: Record<string, any>;
    [key: string]: any;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: {
    user_feedback?: 'up' | 'down';
    feedback_comment?: string;
    confidence_score?: number;
    sources?: string[];
    is_regenerated?: boolean;
    regenerated_from?: string;
    ai_model?: string;
    processing_time_ms?: number;
    tokens_used?: number;
    intent_detected?: string;
    entities_extracted?: string[];
    custom_data?: Record<string, any>;
    [key: string]: any;
  };
  created_at: string;
}

// Request/Response types
export interface DatabaseResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

// Create/Update types (omit read-only fields)
export type CreateCompanyProfile = Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCompanyProfile = Partial<Omit<CompanyProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type CreateLead = Omit<Lead, 'id' | 'created_at' | 'updated_at'>;
export type UpdateLead = Partial<Omit<Lead, 'id' | 'created_by' | 'created_at' | 'updated_at'>>;

export type CreateProposal = Omit<Proposal, 'id' | 'created_at' | 'updated_at'>;
export type UpdateProposal = Partial<Omit<Proposal, 'id' | 'created_by' | 'created_at' | 'updated_at'>>;

export type CreateChatSession = Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>;
export type UpdateChatSession = Partial<Omit<ChatSession, 'id' | 'created_by' | 'created_at' | 'updated_at'>>;

export type CreateChatMessage = Omit<ChatMessage, 'id' | 'created_at'>;
export type UpdateChatMessage = Partial<Omit<ChatMessage, 'id' | 'session_id' | 'created_at'>>;