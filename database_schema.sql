-- =============================================
-- PropelIQ Database Schema
-- Complete schema for AI-powered pre-sales platform
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- User profiles extending Supabase auth
-- =============================================
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  role text DEFAULT 'sales_executive'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================
-- SALES COMPANY PROFILES TABLE
-- Company vision and profile management
-- =============================================
CREATE TABLE public.sales_company_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL,
  
  -- Structured vision data (matches DraftVision interface)
  company_vision jsonb DEFAULT '{}'::jsonb NOT NULL,
  -- Structure: {"mission": "", "values": "", "goals": "", "uniqueValue": "", "companyName": ""}
  
  -- Flexible metadata for additional company information
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  -- Examples: {"description": "", "industry": "", "website": "", "size_category": "", 
  --           "status": "active", "is_primary": true, "tags": [], "logo_url": "", 
  --           "founded_year": 2020, "employee_count": 50, "headquarters": "", 
  --           "target_market": [], "competitors": [], "key_differentiators": []}
  
  raw_chat_summary text, -- AI context from chat sessions
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  CONSTRAINT sales_company_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT sales_company_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================
-- LEADS TABLE
-- Lead management and tracking
-- =============================================
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Core required fields
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  
  -- Flexible metadata for all additional lead information
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  -- Examples: {"contact_phone": "", "status": "qualified", "deal_size": 125000,
  --           "industry": "", "company_size": "", "website": "", "notes": "",
  --           "last_contact": "", "lead_source": "", "priority": "high",
  --           "budget_range": "", "decision_timeline": "", "decision_makers": [],
  --           "pain_points": [], "custom_fields": {}}
  
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================
-- PROPOSALS TABLE
-- Proposal management
-- =============================================
CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  company_name text NOT NULL,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'draft'::text])) NOT NULL,
  description text,
  amount numeric,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT proposals_pkey PRIMARY KEY (id),
  CONSTRAINT proposals_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================
-- PROPOSAL SECTIONS TABLE
-- Dynamic proposal sections with JSONB content
-- =============================================
CREATE TABLE public.proposal_sections (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  proposal_id uuid NOT NULL,
  section_title text NOT NULL,
  section_type text NOT NULL,
  content jsonb NOT NULL,
  order_index integer NOT NULL,
  is_ai_generated boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT proposal_sections_pkey PRIMARY KEY (id),
  CONSTRAINT proposal_sections_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE
);

-- =============================================
-- CHAT SESSIONS TABLE
-- AI chat sessions with flexible entity linking
-- =============================================
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL DEFAULT 'New Chat',
  preview text, -- Short preview for sidebar display
  
  -- Chat type determines which entity can be linked
  chat_type text NOT NULL CHECK (chat_type = ANY (ARRAY[
    'vision'::text, 'lead'::text, 'proposal'::text, 'general'::text
  ])),
  
  -- Flexible entity linking (only one should be set based on chat_type)
  company_vision_id uuid,
  lead_id uuid,
  proposal_id uuid,
  
  -- Flexible metadata for additional session information
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  -- Examples: {"status": "active", "last_activity_at": "", "message_count": 15,
  --           "ai_model_used": "gpt-4", "session_tags": [], "custom_context": {},
  --           "user_preferences": {}}
  
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT chat_sessions_company_vision_id_fkey FOREIGN KEY (company_vision_id) REFERENCES public.sales_company_profiles(id) ON DELETE CASCADE,
  CONSTRAINT chat_sessions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT chat_sessions_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE,
  
  -- Ensure only one entity link is set based on chat_type
  CONSTRAINT chat_sessions_entity_link_check CHECK (
    CASE chat_type
      WHEN 'vision' THEN (company_vision_id IS NOT NULL AND lead_id IS NULL AND proposal_id IS NULL)
      WHEN 'lead' THEN (lead_id IS NOT NULL AND company_vision_id IS NULL AND proposal_id IS NULL)
      WHEN 'proposal' THEN (proposal_id IS NOT NULL AND company_vision_id IS NULL AND lead_id IS NULL)
      WHEN 'general' THEN (company_vision_id IS NULL AND lead_id IS NULL AND proposal_id IS NULL)
      ELSE false
    END
  )
);

-- =============================================
-- CHAT MESSAGES TABLE
-- Individual chat messages with metadata
-- =============================================
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  content text NOT NULL,
  
  -- Flexible metadata for message information
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  -- Examples: {"user_feedback": "up", "feedback_comment": "", "confidence_score": 0.95,
  --           "sources": [], "is_regenerated": false, "regenerated_from": "uuid",
  --           "ai_model": "gpt-4", "processing_time_ms": 1250, "tokens_used": 150,
  --           "intent_detected": "", "entities_extracted": [], "custom_data": {}}
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Standard B-tree indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_sales_company_profiles_user_id ON public.sales_company_profiles(user_id);
CREATE INDEX idx_leads_created_by ON public.leads(created_by);
CREATE INDEX idx_leads_company_name ON public.leads(company_name);
CREATE INDEX idx_leads_contact_email ON public.leads(contact_email);
CREATE INDEX idx_proposals_created_by ON public.proposals(created_by);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposal_sections_proposal_id ON public.proposal_sections(proposal_id);
CREATE INDEX idx_proposal_sections_order ON public.proposal_sections(proposal_id, order_index);
CREATE INDEX idx_chat_sessions_created_by ON public.chat_sessions(created_by);
CREATE INDEX idx_chat_sessions_chat_type ON public.chat_sessions(chat_type);
CREATE INDEX idx_chat_sessions_company_vision ON public.chat_sessions(company_vision_id) WHERE company_vision_id IS NOT NULL;
CREATE INDEX idx_chat_sessions_lead ON public.chat_sessions(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_chat_sessions_proposal ON public.chat_sessions(proposal_id) WHERE proposal_id IS NOT NULL;
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_chat_messages_role ON public.chat_messages(role);

-- GIN indexes for JSONB fields (enables fast JSON queries)
CREATE INDEX idx_sales_company_profiles_company_vision_gin ON public.sales_company_profiles USING gin (company_vision);
CREATE INDEX idx_sales_company_profiles_metadata_gin ON public.sales_company_profiles USING gin (metadata);
CREATE INDEX idx_leads_metadata_gin ON public.leads USING gin (metadata);
CREATE INDEX idx_chat_sessions_metadata_gin ON public.chat_sessions USING gin (metadata);
CREATE INDEX idx_chat_messages_metadata_gin ON public.chat_messages USING gin (metadata);

-- Specific JSONB field indexes for common queries (using B-tree for text values)
CREATE INDEX idx_leads_status ON public.leads ((metadata->>'status'));
CREATE INDEX idx_chat_sessions_status ON public.chat_sessions ((metadata->>'status'));
CREATE INDEX idx_company_profiles_is_primary ON public.sales_company_profiles ((metadata->>'is_primary')) WHERE (metadata->>'is_primary') = 'true';

-- Additional useful JSONB field indexes
CREATE INDEX idx_leads_deal_size ON public.leads (((metadata->>'deal_size')::numeric)) WHERE metadata->>'deal_size' IS NOT NULL;
CREATE INDEX idx_leads_industry ON public.leads ((metadata->>'industry'));
CREATE INDEX idx_leads_priority ON public.leads ((metadata->>'priority'));
CREATE INDEX idx_company_profiles_status ON public.sales_company_profiles ((metadata->>'status'));
CREATE INDEX idx_company_profiles_industry ON public.sales_company_profiles ((metadata->>'industry'));

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Sales company profiles policies
CREATE POLICY "Users can view own company profiles" ON public.sales_company_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company profiles" ON public.sales_company_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company profiles" ON public.sales_company_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own company profiles" ON public.sales_company_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Leads policies
CREATE POLICY "Users can view own leads" ON public.leads
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own leads" ON public.leads
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own leads" ON public.leads
  FOR DELETE USING (auth.uid() = created_by);

-- Proposals policies
CREATE POLICY "Users can view own proposals" ON public.proposals
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own proposals" ON public.proposals
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own proposals" ON public.proposals
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own proposals" ON public.proposals
  FOR DELETE USING (auth.uid() = created_by);

-- Proposal sections policies
CREATE POLICY "Users can view own proposal sections" ON public.proposal_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.proposals 
      WHERE proposals.id = proposal_sections.proposal_id 
      AND proposals.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own proposal sections" ON public.proposal_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.proposals 
      WHERE proposals.id = proposal_sections.proposal_id 
      AND proposals.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own proposal sections" ON public.proposal_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.proposals 
      WHERE proposals.id = proposal_sections.proposal_id 
      AND proposals.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own proposal sections" ON public.proposal_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.proposals 
      WHERE proposals.id = proposal_sections.proposal_id 
      AND proposals.created_by = auth.uid()
    )
  );

-- Chat sessions policies
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions
  FOR DELETE USING (auth.uid() = created_by);

-- Chat messages policies
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own chat messages" ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own chat messages" ON public.chat_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.created_by = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_company_profiles_updated_at 
  BEFORE UPDATE ON public.sales_company_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at 
  BEFORE UPDATE ON public.leads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at 
  BEFORE UPDATE ON public.proposals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposal_sections_updated_at 
  BEFORE UPDATE ON public.proposal_sections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
  BEFORE UPDATE ON public.chat_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (OPTIONAL)
-- =============================================

-- Note: This sample data uses placeholder UUIDs
-- In production, these would be actual auth.users IDs

-- Sample company profiles
-- INSERT INTO public.sales_company_profiles (id, name, user_id, company_vision, metadata) VALUES 
-- ('550e8400-e29b-41d4-a716-446655440001', 'TechCorp Inc.', '550e8400-e29b-41d4-a716-446655440000', 
--  '{"mission": "To revolutionize enterprise software through AI-driven solutions", "values": "Innovation, Integrity, Customer-First", "goals": "Achieve $100M ARR by 2025", "uniqueValue": "10x more efficient than traditional alternatives"}',
--  '{"industry": "Technology", "status": "active", "is_primary": true}');

-- Sample leads
-- INSERT INTO public.leads (id, company_name, contact_name, contact_email, metadata, created_by) VALUES 
-- ('550e8400-e29b-41d4-a716-446655440002', 'Acme Corporation', 'John Smith', 'john@acme.com', 
--  '{"status": "qualified", "deal_size": 125000, "industry": "Manufacturing", "priority": "high"}', 
--  '550e8400-e29b-41d4-a716-446655440000');

-- =============================================
-- END OF SCHEMA
-- =============================================