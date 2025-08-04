// =============================================
// Chat React Hooks
// Custom hooks for chat sessions and messages
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatSession, ChatMessage, CreateChatSession, CreateChatMessage, PaginationOptions } from '../shared/types';
import * as chatOps from './operations';

// =============================================
// CHAT SESSIONS HOOKS
// =============================================

export function useChatSessions(options: PaginationOptions & { 
  entityType?: string; 
  entityId?: string;
} = {}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { user } = useAuth();

  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await chatOps.getChatSessions(options);
    
    if (response.error) {
      setError(response.error);
      setSessions([]);
    } else {
      setSessions(response.data || []);
      setTotalCount(response.count || 0);
    }
    
    setLoading(false);
  }, [user, JSON.stringify(options)]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const refresh = useCallback(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    totalCount,
    refresh
  };
}

export function useChatSession(id: string | null) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSession = useCallback(async () => {
    if (!user || !id) {
      setSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await chatOps.getChatSessionById(id);
    
    if (response.error) {
      setError(response.error);
      setSession(null);
    } else {
      setSession(response.data);
    }
    
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const refresh = useCallback(() => {
    fetchSession();
  }, [fetchSession]);

  return {
    session,
    loading,
    error,
    refresh
  };
}

export function useSessionWithMessages(sessionId: string | null) {
  const [session, setSession] = useState<(ChatSession & { messages: ChatMessage[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSessionWithMessages = useCallback(async () => {
    if (!user || !sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await chatOps.getSessionWithMessages(sessionId);
    
    if (response.error) {
      setError(response.error);
      setSession(null);
    } else {
      setSession(response.data);
    }
    
    setLoading(false);
  }, [user, sessionId]);

  useEffect(() => {
    fetchSessionWithMessages();
  }, [fetchSessionWithMessages]);

  const refresh = useCallback(() => {
    fetchSessionWithMessages();
  }, [fetchSessionWithMessages]);

  return {
    session,
    loading,
    error,
    refresh
  };
}

export function useChatSessionsByEntity(entityType: string | null, entityId: string | null) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSessionsByEntity = useCallback(async () => {
    if (!user || !entityType || !entityId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await chatOps.getChatSessionsByEntity(entityType, entityId);
    
    if (response.error) {
      setError(response.error);
      setSessions([]);
    } else {
      setSessions(response.data || []);
    }
    
    setLoading(false);
  }, [user, entityType, entityId]);

  useEffect(() => {
    fetchSessionsByEntity();
  }, [fetchSessionsByEntity]);

  const refresh = useCallback(() => {
    fetchSessionsByEntity();
  }, [fetchSessionsByEntity]);

  return {
    sessions,
    loading,
    error,
    refresh
  };
}

export function useRecentChatSessions(limit: number = 10) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRecentSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await chatOps.getRecentChatSessions(limit);
    
    if (response.error) {
      setError(response.error);
      setSessions([]);
    } else {
      setSessions(response.data || []);
    }
    
    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    fetchRecentSessions();
  }, [fetchRecentSessions]);

  const refresh = useCallback(() => {
    fetchRecentSessions();
  }, [fetchRecentSessions]);

  return {
    sessions,
    loading,
    error,
    refresh
  };
}

// =============================================
// CHAT MESSAGES HOOKS
// =============================================

export function useChatMessages(sessionId: string | null, options: PaginationOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!user || !sessionId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await chatOps.getChatMessages(sessionId, options);
    
    if (response.error) {
      setError(response.error);
      setMessages([]);
    } else {
      setMessages(response.data || []);
      setTotalCount(response.count || 0);
    }
    
    setLoading(false);
  }, [user, sessionId, JSON.stringify(options)]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const refresh = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    totalCount,
    refresh
  };
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useCreateChatSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const createSession = useCallback(async (data: Omit<CreateChatSession, 'user_id'>) => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    const sessionData: CreateChatSession = {
      ...data,
      user_id: user.id
    };

    const response = await chatOps.createChatSession(sessionData);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, [user]);

  return {
    createSession,
    loading,
    error
  };
}

export function useUpdateChatSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSession = useCallback(async (id: string, updates: {
    title?: string;
    metadata?: Record<string, any>;
  }) => {
    setLoading(true);
    setError(null);

    const response = await chatOps.updateChatSession(id, updates);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  return {
    updateSession,
    loading,
    error
  };
}

export function useDeleteChatSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const response = await chatOps.deleteChatSession(id);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return false;
    }
    
    return true;
  }, []);

  return {
    deleteSession,
    loading,
    error
  };
}

export function useCreateChatMessage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMessage = useCallback(async (data: CreateChatMessage) => {
    setLoading(true);
    setError(null);

    const response = await chatOps.createChatMessage(data);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  return {
    createMessage,
    loading,
    error
  };
}

export function useUpdateChatMessage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMessage = useCallback(async (id: string, updates: {
    content?: string;
    metadata?: Record<string, any>;
  }) => {
    setLoading(true);
    setError(null);

    const response = await chatOps.updateChatMessage(id, updates);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  return {
    updateMessage,
    loading,
    error
  };
}

export function useDeleteChatMessage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteMessage = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const response = await chatOps.deleteChatMessage(id);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return false;
    }
    
    return true;
  }, []);

  return {
    deleteMessage,
    loading,
    error
  };
}

// =============================================
// STATS AND UTILITY HOOKS
// =============================================

export function useChatSessionStats() {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMessages: 0,
    avgMessagesPerSession: 0,
    entityBreakdown: {} as Record<string, number>
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats({
        totalSessions: 0,
        totalMessages: 0,
        avgMessagesPerSession: 0,
        entityBreakdown: {}
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await chatOps.getChatSessionStats();
    
    if (response.error) {
      setError(response.error);
    } else {
      setStats(response.data || {
        totalSessions: 0,
        totalMessages: 0,
        avgMessagesPerSession: 0,
        entityBreakdown: {}
      });
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh
  };
}

export function useSearchChatSessions() {
  const [results, setResults] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await chatOps.searchChatSessions(searchTerm);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      setResults([]);
    } else {
      setResults(response.data || []);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults
  };
}