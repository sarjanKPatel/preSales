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
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Message handler for the agent response hook
  const handleNewMessage = useCallback((message: any) => {
    setMessages(prev => [...prev, {
      id: message.id,
      content: message.content,
      role: message.role,
      timestamp: message.timestamp,
    }]);
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
    console.log('[VisionChatLayout] createSession called');
    console.log('[VisionChatLayout] currentWorkspace:', currentWorkspace?.id, 'visionId:', visionId);
    
    if (!currentWorkspace) {
      console.error('[VisionChatLayout] No workspace selected');
      return null;
    }
    
    try {
      console.log('[VisionChatLayout] Calling db.createChatSession with workspace:', currentWorkspace.id, 'visionId:', visionId);
      const newSession = await db.createChatSession(currentWorkspace.id, visionId);
      console.log('[VisionChatLayout] db.createChatSession result:', newSession);
      
      if (!newSession) {
        console.error('[VisionChatLayout] Session creation returned null');
        throw new Error('Session creation returned null');
      }
      
      console.log('[VisionChatLayout] Updating sessions state with new session');
      setSessions(prev => {
        console.log('[VisionChatLayout] Previous sessions:', prev.length);
        const updated = [newSession, ...prev];
        console.log('[VisionChatLayout] Updated sessions:', updated.length);
        return updated;
      });
      
      console.log('[VisionChatLayout] Setting active session ID:', newSession.id);
      setActiveSessionId(newSession.id);
      setMessages([]);
      
      console.log('[VisionChatLayout] createSession completed successfully');
      return newSession;
    } catch (error) {
      console.error('[VisionChatLayout] Failed to create session:', error);
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
    console.log('[VisionChatLayout] deleteSession called with sessionId:', sessionId);
    console.log('[VisionChatLayout] Current activeSessionId:', activeSessionId);
    console.log('[VisionChatLayout] Current sessions count:', sessions.length);
    
    try {
      console.log('[VisionChatLayout] Calling db.deleteChatSession...');
      const result = await db.deleteChatSession(sessionId);
      console.log('[VisionChatLayout] Delete result:', result);
      
      console.log('[VisionChatLayout] Updating sessions state...');
      setSessions(prev => {
        const filtered = prev.filter(session => session.id !== sessionId);
        console.log('[VisionChatLayout] Sessions before filter:', prev.length, 'after filter:', filtered.length);
        return filtered;
      });
      
      // If deleted session was active, select another session
      if (activeSessionId === sessionId) {
        console.log('[VisionChatLayout] Deleted session was active, selecting new session...');
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        console.log('[VisionChatLayout] Remaining sessions:', remainingSessions.length);
        
        if (remainingSessions.length > 0) {
          console.log('[VisionChatLayout] Setting new active session:', remainingSessions[0].id);
          setActiveSessionId(remainingSessions[0].id);
        } else {
          console.log('[VisionChatLayout] No remaining sessions, clearing active session');
          setActiveSessionId(undefined);
          setMessages([]);
        }
      }
      
      console.log('[VisionChatLayout] Delete session completed successfully');
    } catch (error) {
      console.error('[VisionChatLayout] Failed to delete session:', error);
    }
  }, [activeSessionId, sessions]);

  const refreshSessions = useCallback(() => {
    loadSessions();
  }, [loadSessions]);

  const refreshActiveSession = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  // Get active session object
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const handleNewSession = async () => {
    console.log('[VisionChatLayout] handleNewSession called');
    console.log('[VisionChatLayout] user:', !!user, 'isCreatingSession:', isCreatingSession);
    
    if (!user || isCreatingSession) {
      console.log('[VisionChatLayout] Blocking session creation - no user or already creating');
      return;
    }
    
    console.log('[VisionChatLayout] Setting isCreatingSession to true');
    setIsCreatingSession(true);
    
    try {
      console.log('[VisionChatLayout] Calling createSession...');
      const newSession = await createSession();
      console.log('[VisionChatLayout] createSession result:', newSession);
      
      if (newSession) {
        console.log('[VisionChatLayout] New session created successfully, setting active session');
        setActiveSessionId(newSession.id);
        setMessages([]);
        setDraftVision({});
        console.log('[VisionChatLayout] Session setup complete');
      } else {
        console.error('[VisionChatLayout] Failed to create new session - createSession returned null');
      }
    } catch (error) {
      console.error('[VisionChatLayout] Error creating session:', error);
    } finally {
      console.log('[VisionChatLayout] Setting isCreatingSession to false');
      setIsCreatingSession(false);
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
    console.log('[VisionChatLayout] handleDeleteSession called with sessionId:', sessionId);
    await deleteSession(sessionId);
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!activeSessionId) return;
    
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [activeSessionId, sendMessage]);

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
        isCreatingSession={isCreatingSession}
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