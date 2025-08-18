//optimise it later
//on every message the load context fetch all messages from the vision
//and then the user message is added to the context
//and then the context is returned
//and then the context is used to generate the response
//and then the response is sent to the user
//and then the response is saved to the database
//and then the response is saved to the database


import { supabase } from '@/lib/supabase';
import { AgentContext, AgentMessage, SessionData, VisionState } from '../../types';

export interface ContextLoaderConfig {
  maxMessages?: number;
  includeSummary?: boolean;
}

export class ContextLoader {
  private supabase;
  private config: ContextLoaderConfig;

  constructor(config: ContextLoaderConfig) {
    this.config = config;
    // Use the singleton Supabase client from lib/supabase.ts
    this.supabase = supabase;
  }

  async loadVisionContext(visionId: string, sessionId: string, workspaceId: string, userId?: string): Promise<AgentContext> {
    try {
      // 1. FIRST - Load vision data (primary source of truth)
      const { data: visionData, error: visionError } = await this.supabase
        .from('visions')
        .select('*')
        .eq('id', visionId)
        .eq('workspace_id', workspaceId)
        .single();

      if (visionError || !visionData) {
        throw new Error(`Vision not found: ${visionId}`);
      }

      // 2. Get or create session
      let session = await this.getSession(sessionId, workspaceId);
      
      if (!session) {
        // Create new session linked to this vision
        console.log(`Creating new session: ${sessionId} for vision: ${visionId}`);
        
        session = await this.createSession({
          id: sessionId,
          workspace_id: workspaceId,
          user_id: userId || visionData.created_by,
          session_type: 'vision',
          metadata: { 
            vision_id: visionId,
            vision_title: visionData.title 
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Link session to vision in vision_sessions table
        await this.supabase
          .from('vision_sessions')
          .insert({
            vision_id: visionId,
            session_id: sessionId
          });
      }

      // 3. Load all messages for this vision (across all sessions)
      const messages = await this.loadVisionMessages(visionId);

      // 4. Build context with vision as primary
      const visionState: VisionState = visionData.vision_state || {};
      
      return {
        messages,
        session,
        summary: undefined,
        vision_state: {
          ...visionState,
          metadata: {
            session_id: sessionId,
            workspace_id: workspaceId,
            user_id: userId || visionData.created_by,
            status: visionData.status,
            version: 1,
            created_at: visionData.created_at,
            updated_at: visionData.updated_at,
            validation_score: visionData.completeness_score,
            vision_id: visionId,
            vision_title: visionData.title,
            vision_category: visionData.category,
            vision_impact: visionData.impact,
          }
        },
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('ContextLoader.loadVisionContext error:', error);
      throw new Error(`Failed to load vision context: ${errorMessage}`);
    }
  }

  private async getSession(sessionId: string, workspaceId?: string): Promise<SessionData | null> {
    let query = this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId);
    
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    
    const { data, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }
    
    if (!data) {
      return null;
    }
    
    return {
      id: data.id,
      type: data.session_type as 'vision' | 'lead' | 'proposal',
      workspace_id: data.workspace_id,
      user_id: data.user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      metadata: data.metadata,
    };
  }

  private async createSession(sessionData: {
    id: string;
    workspace_id: string;
    user_id: string;
    session_type: string;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
  }): Promise<SessionData> {
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .insert([sessionData])
      .select()
      .single();
      
    if (error) {
      console.error('Failed to create session:', error);
      throw new Error(`Failed to create session: ${error.message || JSON.stringify(error)}`);
    }
    
    return {
      id: data.id,
      type: data.session_type as 'vision' | 'lead' | 'proposal',
      workspace_id: data.workspace_id,
      user_id: data.user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      metadata: data.metadata,
    };
  }

  private async loadVisionMessages(visionId: string): Promise<AgentMessage[]> {
    const maxMessages = this.config.maxMessages || 100; // Higher limit for vision-wide messages
    
    // Get all sessions for this vision
    const { data: visionSessions, error: vsError } = await this.supabase
      .from('vision_sessions')
      .select('session_id')
      .eq('vision_id', visionId);
    
    if (vsError) {
      throw new Error(`Failed to load vision sessions: ${vsError.message}`);
    }

    if (!visionSessions || visionSessions.length === 0) {
      return [];
    }

    const sessionIds = visionSessions.map(vs => vs.session_id);

    // Load all messages from all sessions for this vision
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true })
      .limit(maxMessages);
    
    if (error) {
      throw new Error(`Failed to load vision messages: ${error.message}`);
    }
    
    return (data || []).map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant' | 'function',
      content: msg.content,
      name: msg.name || undefined,
      function_call: msg.function_call || undefined,
      metadata: {
        ...msg.metadata,
        session_id: msg.session_id, // Include session info for context
        created_at: msg.created_at,
      },
    }));
  }
}