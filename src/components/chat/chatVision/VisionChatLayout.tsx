'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ChatSidebar, { ChatSession } from '../shared/ChatSidebar';
import ChatWindow from '../shared/ChatWindow';
import VisionPreview, { DraftVision } from './VisionPreview';
import ResizableSplitter from '../shared/ResizableSplitter';
import { MessageProps } from '../shared/Message';
import { cn } from '@/lib/utils';
import { useAgentResponse } from '@/hooks/useAgentResponse';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { db } from '@/lib/supabase';

interface VisionChatLayoutProps {
  className?: string;                                 // Additional CSS classes
  onSaveVision?: (vision: DraftVision) => void;      // Callback when vision is saved
  entityId?: string;                                  // Related entity ID
  entityName?: string;                                // Related entity name
  visionId?: string;                                  // Vision ID for loading existing vision
}

export default function VisionChatLayout({
  className,
  onSaveVision,
  entityId,
  entityName,
  visionId
}: VisionChatLayoutProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [draftVision, setDraftVision] = useState<DraftVision>({});
  const [isSaving, setIsSaving] = useState(false);
  const [chatWidth, setChatWidth] = useState(66);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Message handler for the agent response hook
  const handleNewMessage = useCallback((message: any) => {
    console.log('[VisionChatLayout] handleNewMessage called:', {
      messageId: message.id,
      role: message.role,
      content: message.content?.substring(0, 50) + '...',
      timestamp: message.timestamp
    });

    setMessages(prev => {
      console.log('[VisionChatLayout] Current messages count:', prev.length);
      
      // Prevent duplicate messages
      const messageExists = prev.some(m => m.id === message.id);
      if (messageExists) {
        console.log('[VisionChatLayout] Message already exists, skipping:', message.id);
        return prev;
      }
      
      const newMessage = {
        id: message.id,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp,
      };
      
      const newMessages = [...prev, newMessage];
      console.log('[VisionChatLayout] Adding new message, total count:', newMessages.length);
      return newMessages;
    });
  }, []);

  const { sendMessage, loading: isGenerating } = useAgentResponse({
    sessionId: activeSessionId,
    visionId: visionId,
    onMessage: handleNewMessage,
  });

  // Debug: Log when sendMessage function changes
  useEffect(() => {
    console.log('[VisionChatLayout] sendMessage function changed:', {
      hasSendMessage: !!sendMessage,
      activeSessionId,
      timestamp: new Date().toISOString()
    });
  }, [sendMessage, activeSessionId]);
  
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
      setDraftVision({});
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleRenameSession = async (sessionId: string) => {
    // Direct rename without prompt - you can implement inline editing UI if needed
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
    console.log('[VisionChatLayout] handleSendMessage called:', {
      content,
      activeSessionId,
      hasSendMessage: !!sendMessage,
      sendMessageFunctionId: sendMessage.toString().substring(0, 50) + '...'
    });

    let sessionIdToUse = activeSessionId;

    // Auto-create session if none exists
    if (!activeSessionId) {
      console.log('[VisionChatLayout] No active session, auto-creating new session...');
      try {
        const newSession = await createSession();
        if (!newSession) {
          console.error('[VisionChatLayout] Failed to create new session');
          return;
        }
        console.log('[VisionChatLayout] New session created:', newSession.id);
        sessionIdToUse = newSession.id;
        
        // Since state update is async, we need to manually handle the first message
        // Create user message in database
        console.log('[VisionChatLayout] Creating user message for new session...');
        if (!sessionIdToUse) {
          console.error('[VisionChatLayout] No session ID available');
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
        console.log('[VisionChatLayout] Sending API request for new session...');
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
            console.error('[VisionChatLayout] No session ID available for assistant message');
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
        
        console.log('[VisionChatLayout] Message sent to new session successfully');
        return;
      } catch (error) {
        console.error('[VisionChatLayout] Failed to create session or send message:', error);
        return;
      }
    }
    
    try {
      console.log('[VisionChatLayout] Calling sendMessage with existing session:', sessionIdToUse);
      await sendMessage(content);
      console.log('[VisionChatLayout] sendMessage completed successfully');
    } catch (error) {
      console.error('[VisionChatLayout] Failed to send message:', error);
    }
  }, [activeSessionId, sendMessage, createSession, handleNewMessage, currentWorkspace, user, visionId]);

  // Debug: Log when handleSendMessage function is recreated
  useEffect(() => {
    console.log('[VisionChatLayout] handleSendMessage function recreated:', {
      activeSessionId,
      hasSendMessage: !!sendMessage,
      timestamp: new Date().toISOString()
    });
  }, [handleSendMessage]);

  const handleRegenerateMessage = (messageId: string) => { // Regenerate AI response for specific message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1];
      handleSendMessage(previousUserMessage.content);
    }
  };

  const handleSaveVision = async (vision: DraftVision) => { // Save vision draft to database
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSaveVision?.(vision);
    setIsSaving(false);
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
        <ResizableSplitter
            leftPanel={
              <ChatWindow
                messages={messages}
                onSendMessage={handleSendMessage}       // Send message handler
                onRegenerateMessage={handleRegenerateMessage} // Regenerate message handler
                isLoading={isGenerating}               // AI generation loading state
                className="h-full"
              />
            }
            rightPanel={
              <VisionPreview
                draftVision={draftVision}               // AI-generated vision content
                onSave={handleSaveVision}              // Save vision handler
                isSaving={isSaving}                    // Save loading state
              />
            }
            defaultLeftWidth={chatWidth}               // Default chat panel width
            minLeftWidth={30}                          // Minimum chat panel width
            maxLeftWidth={80}                          // Maximum chat panel width
            onResize={setChatWidth}                    // Handle resize events
            className="h-full"
          />
      </div>
    </div>
  );
}