-- ChatGPT-style Memory System Database Schema
-- This replaces the existing RAG approach with a multi-layered memory system

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Memory chunks table - stores all conversation pieces with importance scoring
CREATE TABLE memory_chunks (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    chunk_type TEXT NOT NULL CHECK (chunk_type IN ('user_message', 'assistant_message', 'system_info', 'correction', 'preference')),
    importance_score REAL NOT NULL DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    
    -- Multi-type embeddings for different search strategies
    semantic_embedding VECTOR(1536), -- General semantic meaning
    entity_embedding VECTOR(1536),   -- Entity-based search
    intent_embedding VECTOR(1536),   -- Intent-based search
    
    -- Extracted entities in JSON format
    entities JSONB DEFAULT '[]'::JSONB,
    
    -- Rich metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Indexes
    CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Indexes for memory_chunks
CREATE INDEX idx_memory_chunks_conversation ON memory_chunks (conversation_id, created_at DESC);
CREATE INDEX idx_memory_chunks_user ON memory_chunks (user_id, created_at DESC);
CREATE INDEX idx_memory_chunks_importance ON memory_chunks (importance_score DESC);
CREATE INDEX idx_memory_chunks_type ON memory_chunks (chunk_type);
CREATE INDEX idx_memory_chunks_workspace ON memory_chunks (workspace_id);
CREATE INDEX idx_memory_chunks_entities ON memory_chunks USING GIN (entities);
CREATE INDEX idx_memory_chunks_metadata ON memory_chunks USING GIN (metadata);

-- Vector similarity indexes
CREATE INDEX idx_memory_chunks_semantic ON memory_chunks USING ivfflat (semantic_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memory_chunks_entity ON memory_chunks USING ivfflat (entity_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memory_chunks_intent ON memory_chunks USING ivfflat (intent_embedding vector_cosine_ops) WITH (lists = 100);

-- User memory table - persistent cross-conversation memory
CREATE TABLE user_memory (
    user_id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL,
    
    -- Basic user info
    name TEXT,
    email TEXT,
    phone TEXT,
    
    -- User preferences in JSON
    preferences JSONB DEFAULT '{}'::JSONB,
    
    -- Communication style analysis
    communication_style JSONB DEFAULT '{
        "formality": "mixed",
        "detail_preference": "mixed", 
        "interaction_patterns": []
    }'::JSONB,
    
    -- Long-term context
    long_term_context JSONB DEFAULT '{
        "work_domain": null,
        "projects": [],
        "interests": [],
        "expertise_areas": []
    }'::JSONB,
    
    -- Corrections history
    corrections_history JSONB DEFAULT '[]'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_user_memory_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Indexes for user_memory
CREATE INDEX idx_user_memory_workspace ON user_memory (workspace_id);
CREATE INDEX idx_user_memory_preferences ON user_memory USING GIN (preferences);
CREATE INDEX idx_user_memory_long_term ON user_memory USING GIN (long_term_context);

-- Conversation summaries table - maintains conversation-level context
CREATE TABLE conversation_summaries (
    conversation_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    vision_id UUID, -- Link to vision if applicable
    
    start_time TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    
    -- AI-generated summary
    topic_summary TEXT,
    key_entities JSONB DEFAULT '[]'::JSONB,
    
    -- Important moments in the conversation
    important_moments JSONB DEFAULT '[]'::JSONB,
    
    resolution_status TEXT DEFAULT 'ongoing' CHECK (resolution_status IN ('ongoing', 'resolved', 'paused')),
    
    -- Summary embedding for cross-conversation search
    summary_embedding VECTOR(1536),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_conv_summary_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Indexes for conversation_summaries
CREATE INDEX idx_conversation_summaries_user ON conversation_summaries (user_id, last_activity DESC);
CREATE INDEX idx_conversation_summaries_workspace ON conversation_summaries (workspace_id);
CREATE INDEX idx_conversation_summaries_vision ON conversation_summaries (vision_id);
CREATE INDEX idx_conversation_summaries_status ON conversation_summaries (resolution_status);
CREATE INDEX idx_conversation_summaries_embedding ON conversation_summaries USING ivfflat (summary_embedding vector_cosine_ops) WITH (lists = 100);

-- Entity extraction cache - cache extracted entities to avoid re-processing
CREATE TABLE entity_cache (
    content_hash TEXT PRIMARY KEY, -- Hash of the content
    content_preview TEXT NOT NULL,  -- First 100 chars for debugging
    entities JSONB NOT NULL,
    extraction_model TEXT NOT NULL, -- Model used for extraction
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Auto-cleanup old entries
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index for entity_cache cleanup
CREATE INDEX idx_entity_cache_expires ON entity_cache (expires_at);

-- Functions for the ChatGPT memory system

-- Function: Multi-signal search across memory chunks
CREATE OR REPLACE FUNCTION search_memory_chunks(
    query_semantic_embedding VECTOR(1536),
    query_entity_embedding VECTOR(1536),
    query_intent_embedding VECTOR(1536),
    p_workspace_id UUID,
    p_conversation_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_chunk_types TEXT[] DEFAULT NULL,
    p_min_importance REAL DEFAULT 0.0,
    p_match_count INTEGER DEFAULT 10,
    p_semantic_weight REAL DEFAULT 0.4,
    p_entity_weight REAL DEFAULT 0.3,
    p_intent_weight REAL DEFAULT 0.2,
    p_importance_weight REAL DEFAULT 0.1
)
RETURNS TABLE (
    id TEXT,
    content TEXT,
    importance_score REAL,
    entities JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    combined_similarity REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.content,
        mc.importance_score,
        mc.entities,
        mc.metadata,
        mc.created_at,
        (
            (COALESCE(1 - (mc.semantic_embedding <=> query_semantic_embedding), 0) * p_semantic_weight) +
            (COALESCE(1 - (mc.entity_embedding <=> query_entity_embedding), 0) * p_entity_weight) +
            (COALESCE(1 - (mc.intent_embedding <=> query_intent_embedding), 0) * p_intent_weight) +
            (mc.importance_score * p_importance_weight)
        ) AS combined_similarity
    FROM memory_chunks mc
    WHERE mc.workspace_id = p_workspace_id
        AND (p_conversation_id IS NULL OR mc.conversation_id = p_conversation_id)
        AND (p_user_id IS NULL OR mc.user_id = p_user_id)
        AND (p_chunk_types IS NULL OR mc.chunk_type = ANY(p_chunk_types))
        AND mc.importance_score >= p_min_importance
    ORDER BY combined_similarity DESC
    LIMIT p_match_count;
END;
$$;

-- Function: Get high-importance chunks for critical context
CREATE OR REPLACE FUNCTION get_critical_chunks(
    p_workspace_id UUID,
    p_conversation_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_min_importance REAL DEFAULT 0.8,
    p_match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    id TEXT,
    content TEXT,
    importance_score REAL,
    entities JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.content,
        mc.importance_score,
        mc.entities,
        mc.metadata,
        mc.created_at
    FROM memory_chunks mc
    WHERE mc.workspace_id = p_workspace_id
        AND (p_conversation_id IS NULL OR mc.conversation_id = p_conversation_id)
        AND (p_user_id IS NULL OR mc.user_id = p_user_id)
        AND mc.importance_score >= p_min_importance
        AND mc.chunk_type IN ('correction', 'preference', 'user_message')
    ORDER BY mc.importance_score DESC, mc.created_at DESC
    LIMIT p_match_count;
END;
$$;

-- Function: Get recent conversation context with importance weighting
CREATE OR REPLACE FUNCTION get_recent_conversation_context(
    p_conversation_id UUID,
    p_workspace_id UUID,
    p_message_limit INTEGER DEFAULT 20,
    p_importance_boost REAL DEFAULT 0.2
)
RETURNS TABLE (
    id TEXT,
    content TEXT,
    importance_score REAL,
    entities JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    weighted_score REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.content,
        mc.importance_score,
        mc.entities,
        mc.metadata,
        mc.created_at,
        (
            mc.importance_score + 
            (p_importance_boost * (1 - EXTRACT(EPOCH FROM (NOW() - mc.created_at)) / 86400.0))
        ) AS weighted_score
    FROM memory_chunks mc
    WHERE mc.conversation_id = p_conversation_id
        AND mc.workspace_id = p_workspace_id
    ORDER BY weighted_score DESC, mc.created_at DESC
    LIMIT p_message_limit;
END;
$$;

-- Function: Update user memory with new information
CREATE OR REPLACE FUNCTION update_user_memory(
    p_user_id UUID,
    p_workspace_id UUID,
    p_name TEXT DEFAULT NULL,
    p_preferences JSONB DEFAULT NULL,
    p_corrections JSONB DEFAULT NULL,
    p_long_term_updates JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user_memory (user_id, workspace_id, name, preferences, corrections_history, long_term_context, last_updated)
    VALUES (
        p_user_id, 
        p_workspace_id, 
        p_name, 
        COALESCE(p_preferences, '{}'::JSONB),
        COALESCE(p_corrections, '[]'::JSONB),
        COALESCE(p_long_term_updates, '{}'::JSONB),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        name = COALESCE(p_name, user_memory.name),
        preferences = CASE 
            WHEN p_preferences IS NOT NULL THEN user_memory.preferences || p_preferences
            ELSE user_memory.preferences
        END,
        corrections_history = CASE
            WHEN p_corrections IS NOT NULL THEN user_memory.corrections_history || p_corrections
            ELSE user_memory.corrections_history
        END,
        long_term_context = CASE
            WHEN p_long_term_updates IS NOT NULL THEN user_memory.long_term_context || p_long_term_updates
            ELSE user_memory.long_term_context
        END,
        last_updated = NOW();
END;
$$;

-- Function: Cleanup old entity cache entries
CREATE OR REPLACE FUNCTION cleanup_entity_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM entity_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Trigger: Auto-update conversation summaries
CREATE OR REPLACE FUNCTION update_conversation_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO conversation_summaries (conversation_id, user_id, workspace_id, start_time, last_activity, message_count)
    VALUES (NEW.conversation_id, NEW.user_id, NEW.workspace_id, NEW.created_at, NEW.created_at, 1)
    ON CONFLICT (conversation_id) DO UPDATE SET
        last_activity = NEW.created_at,
        message_count = conversation_summaries.message_count + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_conversation_summary
    AFTER INSERT ON memory_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_summary();

-- Schedule cleanup of old entity cache (if using pg_cron)
-- SELECT cron.schedule('cleanup-entity-cache', '0 2 * * *', 'SELECT cleanup_entity_cache();');

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON memory_chunks TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_memory TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_summaries TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON entity_cache TO your_app_user;

-- Comments for documentation
COMMENT ON TABLE memory_chunks IS 'ChatGPT-style memory chunks with multi-type embeddings and importance scoring';
COMMENT ON TABLE user_memory IS 'Persistent cross-conversation user memory and preferences';
COMMENT ON TABLE conversation_summaries IS 'High-level conversation summaries for cross-conversation context';
COMMENT ON TABLE entity_cache IS 'Cache for entity extraction to avoid re-processing';

COMMENT ON FUNCTION search_memory_chunks IS 'Multi-signal search combining semantic, entity, and intent similarity with importance weighting';
COMMENT ON FUNCTION get_critical_chunks IS 'Retrieve high-importance chunks that should always be included in context';
COMMENT ON FUNCTION get_recent_conversation_context IS 'Get recent conversation with recency and importance weighting';