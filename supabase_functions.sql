-- Required Supabase RPC functions for atomic vision updates
-- Run these in your Supabase SQL Editor

-- Function 1: get_vision_for_update
-- Locks a vision record for atomic updates
CREATE OR REPLACE FUNCTION public.get_vision_for_update(
  p_vision_id UUID,
  p_workspace_id UUID
)
RETURNS TABLE(
  id UUID,
  vision_state JSONB,
  completeness_score INTEGER,
  workspace_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.vision_state,
    v.completeness_score,
    v.workspace_id,
    v.created_by,
    v.created_at,
    v.updated_at
  FROM visions v
  WHERE v.id = p_vision_id 
    AND v.workspace_id = p_workspace_id
  FOR UPDATE;
END;
$$;

-- Function 2: update_vision_atomic
-- Performs atomic update with version control
CREATE OR REPLACE FUNCTION public.update_vision_atomic(
  p_vision_id UUID,
  p_vision_state JSONB,
  p_completeness_score INTEGER,
  p_workspace_id UUID,
  p_user_id UUID,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  new_version INTEGER,
  updated_vision JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_version INTEGER;
  new_completeness_score INTEGER;
  updated_record RECORD;
BEGIN
  -- Lock and get current version
  SELECT completeness_score INTO current_version
  FROM visions 
  WHERE id = p_vision_id 
    AND workspace_id = p_workspace_id
  FOR UPDATE;
  
  -- Check if vision exists
  IF current_version IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, '{}'::JSONB;
    RETURN;
  END IF;
  
  -- Version conflict check (if expected version provided)
  IF p_expected_version IS NOT NULL AND current_version != p_expected_version THEN
    RETURN QUERY SELECT FALSE, current_version, '{}'::JSONB;
    RETURN;
  END IF;
  
  -- Calculate new version
  new_completeness_score := p_completeness_score;
  
  -- Perform atomic update
  UPDATE visions 
  SET 
    vision_state = p_vision_state,
    completeness_score = new_completeness_score,
    updated_at = NOW()
  WHERE id = p_vision_id 
    AND workspace_id = p_workspace_id
  RETURNING * INTO updated_record;
  
  -- Return success result
  RETURN QUERY SELECT 
    TRUE, 
    new_completeness_score, 
    updated_record.vision_state;
END;
$$;

-- Function 3: update_vision_state
-- Simple update function for vision state
CREATE OR REPLACE FUNCTION public.update_vision_state(
  p_vision_id UUID,
  p_state JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_state JSONB;
BEGIN
  UPDATE visions
  SET 
    vision_state = vision_state || p_state,
    updated_at = NOW()
  WHERE id = p_vision_id
  RETURNING vision_state INTO updated_state;
  
  RETURN updated_state;
END;
$$;

-- Function 4: create_vision_atomic
-- Creates a new vision atomically
CREATE OR REPLACE FUNCTION public.create_vision_atomic(
  p_title TEXT,
  p_category TEXT,
  p_impact TEXT,
  p_timeframe TEXT,
  p_tags TEXT[],
  p_workspace_id UUID,
  p_user_id UUID,
  p_vision_state JSONB,
  p_completeness_score INTEGER
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  vision_state JSONB,
  completeness_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_vision RECORD;
BEGIN
  INSERT INTO visions (
    title,
    category,
    impact,
    timeframe,
    tags,
    workspace_id,
    created_by,
    vision_state,
    completeness_score,
    created_at,
    updated_at
  ) VALUES (
    p_title,
    p_category,
    p_impact,
    p_timeframe,
    p_tags,
    p_workspace_id,
    p_user_id,
    p_vision_state,
    p_completeness_score,
    NOW(),
    NOW()
  )
  RETURNING * INTO new_vision;
  
  RETURN QUERY SELECT 
    new_vision.id,
    new_vision.title,
    new_vision.vision_state,
    new_vision.completeness_score;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_vision_for_update(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vision_atomic(UUID, JSONB, INTEGER, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vision_state(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vision_atomic(TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, UUID, JSONB, INTEGER) TO authenticated;