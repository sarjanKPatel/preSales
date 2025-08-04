// =============================================
// Chat Database Operations
// CRUD operations for chat sessions and messages
// =============================================

import { supabase, handleDatabaseResponse, getCurrentUser, logDatabaseError, validateRequiredFields, sanitizeData } from '../shared/client';
import type { ChatSession, ChatMessage, CreateChatSession, CreateChatMessage, DatabaseResponse, PaginationOptions } from '../shared/types';

// =============================================
// CHAT SESSIONS OPERATIONS
// =============================================

export async function createChatSession(data: CreateChatSession): Promise<DatabaseResponse<ChatSession>> {
  try {
    // Validate required fields
    const validationError = validateRequiredFields(data, ['title', 'created_by']);
    if (validationError) {
      return { data: null, error: validationError };
    }

    // Ensure metadata is an object
    const sessionData = {
      ...data,
      metadata: data.metadata || {}
    };

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert(sanitizeData(sessionData))
      .select()
      .single();

    return handleDatabaseResponse(session, error);
  } catch (error) {
    logDatabaseError('createChatSession', error, data);
    return { data: null, error: 'Failed to create chat session' };
  }
}

export async function getChatSessions(
  options: PaginationOptions & { 
    entityType?: string; 
    entityId?: string;
  } = {}
): Promise<DatabaseResponse<ChatSession[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    let query = supabase
      .from('chat_sessions')
      .select('*')
      .eq('created_by', user.id);

    // Apply entity filters based on chat_type and entity IDs
    if (options.entityType) {
      query = query.eq('chat_type', options.entityType);
    }
    if (options.entityId && options.entityType) {
      switch (options.entityType) {
        case 'vision':
          query = query.eq('company_vision_id', options.entityId);
          break;
        case 'lead':
          query = query.eq('lead_id', options.entityId);
          break;
        case 'proposal':
          query = query.eq('proposal_id', options.entityId);
          break;
      }
    }

    // Apply search filter
    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,preview.ilike.%${options.search}%`);
    }

    // Apply sorting and pagination
    const { page = 1, limit = 10, sortBy = 'updated_at', sortOrder = 'desc' } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: sessions, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    return { 
      data: sessions, 
      error: error?.message || null,
      count: count || 0
    };
  } catch (error) {
    logDatabaseError('getChatSessions', error, options);
    return { data: null, error: 'Failed to fetch chat sessions' };
  }
}

export async function getChatSessionById(id: string): Promise<DatabaseResponse<ChatSession>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', id)
      .eq('created_by', user.id)
      .single();

    return handleDatabaseResponse(session, error);
  } catch (error) {
    logDatabaseError('getChatSessionById', error, { id });
    return { data: null, error: 'Failed to fetch chat session' };
  }
}

export async function getChatSessionsByEntity(
  entityType: string, 
  entityId: string
): Promise<DatabaseResponse<ChatSession[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('created_by', user.id)
      .eq('chat_type', entityType)
      .order('updated_at', { ascending: false });

    return handleDatabaseResponse(sessions || [], error);
  } catch (error) {
    logDatabaseError('getChatSessionsByEntity', error, { entityType, entityId });
    return { data: null, error: 'Failed to fetch chat sessions by entity' };
  }
}

export async function updateChatSession(
  id: string,
  updates: {
    title?: string;
    metadata?: Record<string, any>;
  }
): Promise<DatabaseResponse<ChatSession>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const updateData = sanitizeData(updates);
    
    // Ensure metadata exists if we're updating it
    if (updateData.metadata) {
      updateData.metadata = { ...updateData.metadata };
    }

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    return handleDatabaseResponse(session, error);
  } catch (error) {
    logDatabaseError('updateChatSession', error, { id, updates });
    return { data: null, error: 'Failed to update chat session' };
  }
}

export async function deleteChatSession(id: string): Promise<DatabaseResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    return { data: true, error: null };
  } catch (error) {
    logDatabaseError('deleteChatSession', error, { id });
    return { data: null, error: 'Failed to delete chat session' };
  }
}

// =============================================
// CHAT MESSAGES OPERATIONS
// =============================================

export async function createChatMessage(data: CreateChatMessage): Promise<DatabaseResponse<ChatMessage>> {
  try {
    // Validate required fields
    const validationError = validateRequiredFields(data, ['session_id', 'role', 'content']);
    if (validationError) {
      return { data: null, error: validationError };
    }

    // Ensure metadata is an object
    const messageData = {
      ...data,
      metadata: data.metadata || {}
    };

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert(sanitizeData(messageData))
      .select()
      .single();

    // Update session's updated_at timestamp
    if (message) {
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.session_id);
    }

    return handleDatabaseResponse(message, error);
  } catch (error) {
    logDatabaseError('createChatMessage', error, data);
    return { data: null, error: 'Failed to create chat message' };
  }
}

export async function getChatMessages(
  sessionId: string,
  options: PaginationOptions = {}
): Promise<DatabaseResponse<ChatMessage[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Verify user owns the session
    const { data: session } = await getChatSessionById(sessionId);
    if (!session) {
      return { data: null, error: 'Chat session not found or access denied' };
    }

    // Apply pagination
    const { page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'asc' } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: messages, error, count } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    return { 
      data: messages, 
      error: error?.message || null,
      count: count || 0
    };
  } catch (error) {
    logDatabaseError('getChatMessages', error, { sessionId, options });
    return { data: null, error: 'Failed to fetch chat messages' };
  }
}

export async function getChatMessageById(id: string): Promise<DatabaseResponse<ChatMessage>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: message, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        chat_sessions!inner(created_by)
      `)
      .eq('id', id)
      .eq('chat_sessions.created_by', user.id)
      .single();

    return handleDatabaseResponse(message, error);
  } catch (error) {
    logDatabaseError('getChatMessageById', error, { id });
    return { data: null, error: 'Failed to fetch chat message' };
  }
}

export async function updateChatMessage(
  id: string,
  updates: {
    content?: string;
    metadata?: Record<string, any>;
  }
): Promise<DatabaseResponse<ChatMessage>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const updateData = sanitizeData(updates);
    
    // Ensure metadata exists if we're updating it
    if (updateData.metadata) {
      updateData.metadata = { ...updateData.metadata };
    }

    const { data: message, error } = await supabase
      .from('chat_messages')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        chat_sessions!inner(created_by)
      `)
      .eq('chat_sessions.created_by', user.id)
      .single();

    return handleDatabaseResponse(message, error);
  } catch (error) {
    logDatabaseError('updateChatMessage', error, { id, updates });
    return { data: null, error: 'Failed to update chat message' };
  }
}

export async function deleteChatMessage(id: string): Promise<DatabaseResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', id)
      .select(`
        chat_sessions!inner(created_by)
      `)
      .eq('chat_sessions.created_by', user.id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    return { data: true, error: null };
  } catch (error) {
    logDatabaseError('deleteChatMessage', error, { id });
    return { data: null, error: 'Failed to delete chat message' };
  }
}

// =============================================
// UTILITY OPERATIONS
// =============================================

export async function getRecentChatSessions(limit: number = 10): Promise<DatabaseResponse<ChatSession[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);

    return handleDatabaseResponse(sessions || [], error);
  } catch (error) {
    logDatabaseError('getRecentChatSessions', error, { limit });
    return { data: null, error: 'Failed to fetch recent chat sessions' };
  }
}

export async function getChatSessionStats(): Promise<DatabaseResponse<{
  totalSessions: number;
  totalMessages: number;
  avgMessagesPerSession: number;
  entityBreakdown: Record<string, number>;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Get session stats
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('metadata')
      .eq('created_by', user.id);

    if (sessionsError) {
      return handleDatabaseResponse(null, sessionsError);
    }

    // Get message count
    const { count: totalMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .in('session_id', 
        (sessions || []).map(s => s.id).filter(Boolean)
      );

    if (messagesError) {
      return handleDatabaseResponse(null, messagesError);
    }

    const totalSessions = sessions?.length || 0;
    const avgMessagesPerSession = totalSessions > 0 ? Math.round((totalMessages || 0) / totalSessions) : 0;

    // Calculate entity breakdown
    const entityBreakdown: Record<string, number> = {};
    sessions?.forEach(session => {
      const entityType = session.metadata?.entity_type || 'unknown';
      entityBreakdown[entityType] = (entityBreakdown[entityType] || 0) + 1;
    });

    const stats = {
      totalSessions,
      totalMessages: totalMessages || 0,
      avgMessagesPerSession,
      entityBreakdown
    };

    return { data: stats, error: null };
  } catch (error) {
    logDatabaseError('getChatSessionStats', error);
    return { data: null, error: 'Failed to get chat session stats' };
  }
}

export async function searchChatSessions(searchTerm: string): Promise<DatabaseResponse<ChatSession[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('created_by', user.id)
      .or(`title.ilike.%${searchTerm}%,metadata->>entity_name.ilike.%${searchTerm}%`)
      .order('updated_at', { ascending: false });

    return handleDatabaseResponse(sessions || [], error);
  } catch (error) {
    logDatabaseError('searchChatSessions', error, { searchTerm });
    return { data: null, error: 'Failed to search chat sessions' };
  }
}

export async function getSessionWithMessages(sessionId: string): Promise<DatabaseResponse<ChatSession & { messages: ChatMessage[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        chat_messages (*)
      `)
      .eq('id', sessionId)
      .eq('created_by', user.id)
      .single();

    if (sessionError) {
      return handleDatabaseResponse(null, sessionError);
    }

    // Transform the data to match our expected structure
    const transformedData = {
      ...session,
      messages: session.chat_messages?.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ) || []
    };

    // Remove the nested chat_messages property
    delete (transformedData as any).chat_messages;

    return { data: transformedData, error: null };
  } catch (error) {
    logDatabaseError('getSessionWithMessages', error, { sessionId });
    return { data: null, error: 'Failed to fetch session with messages' };
  }
}