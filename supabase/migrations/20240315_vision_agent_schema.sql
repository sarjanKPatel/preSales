-- Add vision_state column to existing visions table
ALTER TABLE public.visions 
ADD COLUMN IF NOT EXISTS vision_state JSONB DEFAULT '{}';

-- Add completeness_score column
ALTER TABLE public.visions 
ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0 
CHECK (completeness_score >= 0 AND completeness_score <= 100);

-- Create vision_sessions table to link visions with chat sessions
CREATE TABLE IF NOT EXISTS public.vision_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vision_id UUID NOT NULL REFERENCES public.visions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(vision_id, session_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vision_sessions_vision_id ON vision_sessions(vision_id);
CREATE INDEX IF NOT EXISTS idx_vision_sessions_session_id ON vision_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_visions_vision_state ON visions USING GIN (vision_state);
CREATE INDEX IF NOT EXISTS idx_visions_completeness_score ON visions(completeness_score);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update vision timestamp
DROP TRIGGER IF EXISTS update_visions_timestamp ON visions;
CREATE TRIGGER update_visions_timestamp
  BEFORE UPDATE ON visions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to link an existing chat session to a vision
CREATE OR REPLACE FUNCTION link_session_to_vision(
  p_session_id UUID,
  p_vision_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Link session to vision (if not already linked)
  INSERT INTO vision_sessions (vision_id, session_id)
  VALUES (p_vision_id, p_session_id)
  ON CONFLICT (vision_id, session_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Simple function to update vision state (merge new data)
CREATE OR REPLACE FUNCTION update_vision_state(
  p_vision_id UUID,
  p_state JSONB
) RETURNS JSONB AS $$
DECLARE
  v_new_state JSONB;
BEGIN
  UPDATE visions
  SET 
    vision_state = COALESCE(vision_state, '{}'::jsonb) || p_state,
    updated_at = timezone('utc', now())
  WHERE id = p_vision_id
  RETURNING vision_state INTO v_new_state;
  
  RETURN v_new_state;
END;
$$ LANGUAGE plpgsql;