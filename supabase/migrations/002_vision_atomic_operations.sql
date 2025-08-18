-- Atomic Vision Operations
-- These functions provide transaction-safe vision operations with version control

-- Function to get vision with FOR UPDATE lock
CREATE OR REPLACE FUNCTION get_vision_for_update(
    p_vision_id UUID,
    p_workspace_id UUID
)
RETURNS TABLE(
    id UUID,
    vision_state JSONB,
    completeness_score INTEGER,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.vision_state,
        v.completeness_score,
        v.updated_at
    FROM visions v
    WHERE v.id = p_vision_id 
      AND v.workspace_id = p_workspace_id
    FOR UPDATE;
END;
$$;

-- Function to atomically update vision with version check
CREATE OR REPLACE FUNCTION update_vision_atomic(
    p_vision_id UUID,
    p_vision_state JSONB,
    p_completeness_score INTEGER,
    p_workspace_id UUID,
    p_user_id UUID,
    p_expected_version INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    new_version INTEGER,
    error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    current_version INTEGER;
    rows_affected INTEGER;
BEGIN
    -- Get current version with lock
    SELECT completeness_score INTO current_version
    FROM visions
    WHERE id = p_vision_id 
      AND workspace_id = p_workspace_id
    FOR UPDATE;

    -- Check if vision exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'Vision not found'::TEXT;
        RETURN;
    END IF;

    -- Check version conflict
    IF current_version != p_expected_version THEN
        RETURN QUERY SELECT FALSE, current_version, 'Version conflict'::TEXT;
        RETURN;
    END IF;

    -- Perform atomic update
    UPDATE visions
    SET 
        vision_state = p_vision_state,
        completeness_score = p_completeness_score,
        updated_at = NOW()
    WHERE id = p_vision_id 
      AND workspace_id = p_workspace_id;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    IF rows_affected = 1 THEN
        RETURN QUERY SELECT TRUE, p_completeness_score, NULL::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, current_version, 'Update failed'::TEXT;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 0, SQLERRM::TEXT;
END;
$$;

-- Function to atomically create vision
CREATE OR REPLACE FUNCTION create_vision_atomic(
    p_title TEXT,
    p_description TEXT,
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
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    new_vision_id UUID;
BEGIN
    -- Generate new UUID
    new_vision_id := gen_random_uuid();

    -- Insert new vision
    INSERT INTO visions (
        id,
        workspace_id,
        created_by,
        title,
        description,
        category,
        impact,
        timeframe,
        tags,
        status,
        vision_state,
        completeness_score,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        new_vision_id,
        p_workspace_id,
        p_user_id,
        p_title,
        p_description,
        p_category::visions_category_enum,
        p_impact::visions_impact_enum,
        p_timeframe::visions_timeframe_enum,
        p_tags,
        'draft'::visions_status_enum,
        p_vision_state,
        p_completeness_score,
        jsonb_build_object(
            'created_via', 'agent',
            'initial_completeness', p_completeness_score,
            'version', 1
        ),
        NOW(),
        NOW()
    );

    RETURN QUERY SELECT new_vision_id, TRUE, NULL::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$;

-- Table for vision change log (audit trail)
CREATE TABLE IF NOT EXISTS vision_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vision_id UUID NOT NULL REFERENCES visions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    old_version INTEGER NOT NULL,
    new_version INTEGER NOT NULL,
    change_type TEXT NOT NULL, -- 'extraction_update', 'manual_edit', 'merge', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vision_change_log_vision_id ON vision_change_log(vision_id);
CREATE INDEX IF NOT EXISTS idx_vision_change_log_created_at ON vision_change_log(created_at);
CREATE INDEX IF NOT EXISTS idx_visions_workspace_updated ON visions(workspace_id, updated_at);

-- Enable RLS on change log
ALTER TABLE vision_change_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for vision change log (users can only see changes in their workspace)
CREATE POLICY "Users can view vision changes in their workspace" ON vision_change_log
    FOR SELECT USING (
        vision_id IN (
            SELECT id FROM visions 
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS policy for inserting change log entries
CREATE POLICY "Users can create vision change logs in their workspace" ON vision_change_log
    FOR INSERT WITH CHECK (
        vision_id IN (
            SELECT id FROM visions 
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Add helpful comments
COMMENT ON FUNCTION get_vision_for_update IS 'Locks a vision for atomic updates, preventing race conditions';
COMMENT ON FUNCTION update_vision_atomic IS 'Atomically updates vision with version conflict detection';
COMMENT ON FUNCTION create_vision_atomic IS 'Creates a new vision with all required fields in a single transaction';
COMMENT ON TABLE vision_change_log IS 'Audit trail for all vision changes, supports rollback and conflict resolution';