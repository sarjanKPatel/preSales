// PropelIQ Types

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  title: string;
  company_name: string;
  status: 'draft' | 'ready' | 'archived';
  description?: string | null;
  amount?: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  proposal_sections?: ProposalSection[];
  chat_sessions?: ChatSession[];
}

export interface ProposalSection {
  id: string;
  proposal_id: string;
  section_title: string;
  section_type: string;
  content: any; // JSONB - flexible structure
  order_index: number;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  proposal_id: string;
  created_by: string;
  created_at: string;
  chat_messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  created_at: string;
}

// Component props types
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg' | 'none';
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (value: any) => boolean | string;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Section content types for different section types
export interface OverviewContent {
  text: string;
}

export interface StakeholdersContent {
  stakeholders: {
    name: string;
    role: string;
    influence: 'high' | 'medium' | 'low';
    notes?: string;
  }[];
}

export interface ChallengesContent {
  challenges: {
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    urgency: 'high' | 'medium' | 'low';
  }[];
}

export interface SolutionContent {
  solutions: {
    title: string;
    description: string;
    benefits: string[];
    implementation_timeline?: string;
  }[];
}

export interface ROIContent {
  metrics: {
    metric: string;
    current_value: string;
    projected_value: string;
    improvement: string;
    timeframe: string;
  }[];
}

// AI types
export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentResponse {
  content: string;
  confidence: number;
  sources?: string[];
  metadata?: Record<string, any>;
} 