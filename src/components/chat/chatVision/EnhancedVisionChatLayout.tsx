'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ChatSidebar, { ChatSession } from '../shared/ChatSidebar';
import ChatWindow from '../shared/ChatWindow';
import ResizableSplitter from '../shared/ResizableSplitter';
import { MessageProps } from '../shared/Message';
import { cn } from '@/lib/utils';
import { useAgentResponse } from '@/hooks/useAgentResponse';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { db } from '@/lib/supabase';

interface EnhancedVisionChatLayoutProps {
  className?: string;
  entityId?: string;
  entityName?: string;
  visionId?: string;
}

export default function EnhancedVisionChatLayout({
  className,
  entityId,
  entityName,
  visionId
}: EnhancedVisionChatLayoutProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  // Panel states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Chat states
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Panel sizing
  const [chatWidth, setChatWidth] = useState(66);

  // Message handler for the agent response hook
  const handleNewMessage = useCallback((message: any) => {
    console.log('[EnhancedVisionChatLayout] handleNewMessage called:', {
      messageId: message.id,
      role: message.role,
      content: message.content?.substring(0, 50) + '...',
      timestamp: message.timestamp
    });

    setMessages(prev => {
      console.log('[EnhancedVisionChatLayout] Current messages count:', prev.length);
      
      // Prevent duplicate messages
      const messageExists = prev.some(m => m.id === message.id);
      if (messageExists) {
        console.log('[EnhancedVisionChatLayout] Message already exists, skipping:', message.id);
        return prev;
      }
      
      const newMessage = {
        id: message.id,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp,
      };
      
      const newMessages = [...prev, newMessage];
      console.log('[EnhancedVisionChatLayout] Adding new message, total count:', newMessages.length);
      return newMessages;
    });
  }, []);

  const { sendMessage, loading: isGenerating } = useAgentResponse({
    sessionId: activeSessionId,
    visionId: visionId,
    onMessage: handleNewMessage,
  });

  // Load sessions when component mounts or visionId changes
  const loadSessions = useCallback(async () => {
    if (!currentWorkspace) return;
    
    setLoading(true);
    try {
      const { data, error } = await db.getChatSessions(currentWorkspace.id, visionId);
      if (error) throw error;
      setSessions(data || []);
      
      // Auto-select first session if none selected
      if (data && data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, visionId, activeSessionId]);

  // Load messages for active session
  const loadMessages = useCallback(async () => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    
    try {
      const { data, error } = await db.getChatMessages(activeSessionId);
      if (error) throw error;
      
      const formattedMessages = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: msg.created_at,
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  }, [activeSessionId]);

  // Load sessions on mount and when dependencies change
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load messages when active session changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Session management functions
  const createSession = useCallback(async () => {
    if (!currentWorkspace) return null;
    
    try {
      const newSession = await db.createChatSession(currentWorkspace.id, visionId);
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([]);
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }, [currentWorkspace, visionId]);

  const updateSession = useCallback(async (sessionId: string, updates: { title?: string }) => {
    try {
      const { data, error } = await db.updateChatSession(sessionId, updates);
      if (error) throw error;
      
      setSessions(prev => prev.map(session => 
        session.id === sessionId ? { ...session, ...updates } : session
      ));
      
      return data;
    } catch (error) {
      console.error('Failed to update session:', error);
      return null;
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await db.deleteChatSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // If deleted session was active, select another session
      if (activeSessionId === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          setActiveSessionId(remainingSessions[0].id);
        } else {
          setActiveSessionId(undefined);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [activeSessionId, sessions]);

  // Get active session object
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const handleNewSession = async () => {
    if (!user) return;
    
    const newSession = await createSession();
    
    if (newSession) {
      setActiveSessionId(newSession.id);
      setMessages([]);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleRenameSession = async (sessionId: string) => {
    const currentSession = sessions.find(s => s.id === sessionId);
    if (currentSession) {
      const timestamp = new Date().toLocaleString();
      await updateSession(sessionId, { title: `Chat ${timestamp}` });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
  };

  const handleSendMessage = useCallback(async (content: string) => {
    console.log('[EnhancedVisionChatLayout] handleSendMessage called:', {
      content,
      activeSessionId,
      hasSendMessage: !!sendMessage
    });

    let sessionIdToUse = activeSessionId;

    // Auto-create session if none exists
    if (!activeSessionId) {
      console.log('[EnhancedVisionChatLayout] No active session, auto-creating new session...');
      try {
        const newSession = await createSession();
        if (!newSession) {
          console.error('[EnhancedVisionChatLayout] Failed to create new session');
          return;
        }
        console.log('[EnhancedVisionChatLayout] New session created:', newSession.id);
        sessionIdToUse = newSession.id;
        
        // Create user message in database
        if (!sessionIdToUse) {
          console.error('[EnhancedVisionChatLayout] No session ID available');
          return;
        }
        const userMessage = await db.createChatMessage(sessionIdToUse, 'user', content);
        
        // Add to UI immediately
        const userMessageObj = {
          id: userMessage.id,
          content: content,
          role: 'user' as const,
          timestamp: userMessage.created_at,
        };
        handleNewMessage(userMessageObj);
        
        // Call API for AI response
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdToUse,
            userMessage: content,
            workspaceId: currentWorkspace?.id,
            userId: user?.id,
            visionId: visionId,
          }),
        });
        
        if (response.ok) {
          const { response: agentResponse } = await response.json();
          
          // Create assistant message
          if (!sessionIdToUse) {
            console.error('[EnhancedVisionChatLayout] No session ID available for assistant message');
            return;
          }
          const assistantMessage = await db.createChatMessage(sessionIdToUse, 'assistant', agentResponse);
          
          // Add to UI
          const assistantMessageObj = {
            id: assistantMessage.id,
            content: agentResponse,
            role: 'assistant' as const,
            timestamp: assistantMessage.created_at,
          };
          handleNewMessage(assistantMessageObj);
        }
        
        return;
      } catch (error) {
        console.error('[EnhancedVisionChatLayout] Failed to create session or send message:', error);
        return;
      }
    }
    
    try {
      console.log('[EnhancedVisionChatLayout] Calling sendMessage with existing session:', sessionIdToUse);
      await sendMessage(content);
      console.log('[EnhancedVisionChatLayout] sendMessage completed successfully');
    } catch (error) {
      console.error('[EnhancedVisionChatLayout] Failed to send message:', error);
    }
  }, [activeSessionId, sendMessage, createSession, handleNewMessage, currentWorkspace, user, visionId]);

  const handleRegenerateMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1];
      handleSendMessage(previousUserMessage.content);
    }
  };


  return (
    <div className={cn("flex h-full relative", className)}>
      {/* Left Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions || []}
        activeSessionId={activeSessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        loading={loading}
      />

      {/* Main Content Area */}
      <div className="flex-1 h-full">
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          onRegenerateMessage={handleRegenerateMessage}
          isLoading={isGenerating}
          className="h-full"
        />
      </div>
    </div>
  );
}