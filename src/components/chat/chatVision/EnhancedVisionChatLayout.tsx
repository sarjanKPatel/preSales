'use client';

import React, { useState, useCallback, useEffect, memo } from 'react';
import ChatSidebar, { ChatSession } from '../shared/ChatSidebar';
import ChatWindow from '../shared/ChatWindow';
import ChatInput from '../shared/ChatInput';
import ResizableSplitter from '../shared/ResizableSplitter';
import { MessageProps } from '../shared/Message';
import VisionPreview from '@/components/vision/VisionPreview';
import { VisionState } from '@/types';
import { cn } from '@/lib/utils';
import { useAgentResponse } from '@/hooks/useAgentResponse';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { db, supabase } from '@/lib/supabase';

interface EnhancedVisionChatLayoutProps {
  className?: string;
  entityId?: string;
  entityName?: string;
  visionId?: string;
}

const EnhancedVisionChatLayout = memo(function EnhancedVisionChatLayout({
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
  const [isAgentProcessing, setIsAgentProcessing] = useState(false);
  
  // Vision preview states
  const [showVisionPreview, setShowVisionPreview] = useState(false);
  const [currentVisionState, setCurrentVisionState] = useState<VisionState | null>(null);
  
  // Panel sizing
  const [chatWidth, setChatWidth] = useState(66);

  // Message handler for the agent response hook
  const handleNewMessage = useCallback((message: any) => {
    console.log('🔵 [handleNewMessage] Received message:', {
      id: message.id?.slice(-8),
      role: message.role,
      hasUIActions: !!message.ui_actions,
      uiActions: message.ui_actions,
      timestamp: new Date().toISOString()
    });
    
    setMessages(prev => {
      // Prevent duplicate messages
      const messageExists = prev.some(m => m.id === message.id);
      if (messageExists) {
        console.log('🔵 [handleNewMessage] Message already exists, skipping:', message.id?.slice(-8));
        return prev;
      }
      
      const newMessage = {
        id: message.id,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp,
        ui_actions: message.ui_actions,
      };
      
      console.log('🔵 [handleNewMessage] Adding new message to state:', {
        id: newMessage.id?.slice(-8),
        role: newMessage.role,
        hasUIActions: !!newMessage.ui_actions,
        uiActions: newMessage.ui_actions
      });
      
      return [...prev, newMessage];
    });
  }, []);

  const { sendMessage, handleUIAction, loading: isGenerating } = useAgentResponse({
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
      console.log('🔍 Loading messages for session:', activeSessionId);
      const { data, error } = await db.getChatMessages(activeSessionId);
      if (error) throw error;
      
      const formattedMessages = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: msg.created_at,
        ui_actions: msg.metadata?.ui_actions || null,
      }));
      
      // Detailed logging of each message
      console.log('🗨️ Raw messages from database:');
      formattedMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ID: ${msg.id}, Role: ${msg.role}, Content: "${msg.content.slice(0, 50)}...", UI Actions: ${msg.ui_actions ? 'YES' : 'NO'}, Time: ${msg.timestamp}`);
        if (msg.ui_actions) {
          console.log(`    🔴 UI Actions: ${JSON.stringify(msg.ui_actions, null, 2)}`);
        }
      });
      
      // Check for duplicates in the raw data
      const duplicateIds = formattedMessages.filter((msg, index, self) => 
        self.findIndex(m => m.id === msg.id) !== index
      ).map(msg => msg.id);
      
      if (duplicateIds.length > 0) {
        console.warn('🚨 Found duplicate message IDs in database response:', duplicateIds);
      }
      
      // Check for duplicate content (different IDs, same content)
      const duplicateContent = formattedMessages.filter((msg, index, self) => 
        self.findIndex(m => m.content === msg.content && m.role === msg.role) !== index
      );
      
      if (duplicateContent.length > 0) {
        console.warn('🚨 Found duplicate message content:', duplicateContent.map(m => ({
          id: m.id, 
          content: m.content.slice(0, 50) + '...', 
          role: m.role
        })));
      }
      
      // Deduplicate messages based on both ID and content+role to handle duplicate database entries
      const uniqueMessages = formattedMessages.filter((message, index, self) => 
        index === self.findIndex(m => 
          m.id === message.id || 
          (m.content === message.content && m.role === message.role && Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 10000)
        )
      );
      
      console.log('📝 Setting messages:', {
        raw: formattedMessages.length,
        unique: uniqueMessages.length,
        messageIds: uniqueMessages.map(m => `${m.id.slice(0, 8)}...${m.role}`)
      });
      
      console.log('💾 Actually setting messages to state:', uniqueMessages.map(m => `${m.content.slice(0, 30)}... (${m.role})`));
      
      // Set messages only if they're different from current state
      setMessages(prev => {
        console.log('🔴 [loadMessages] About to set messages from database:', {
          previousCount: prev.length,
          newCount: uniqueMessages.length,
          newMessagesWithUIActions: uniqueMessages.filter(m => m.ui_actions).length,
          timestamp: new Date().toISOString()
        });
        
        // If no previous messages, just set the new ones
        if (prev.length === 0) {
          return uniqueMessages;
        }
        
        // Check if messages are actually different
        const prevIds = new Set(prev.map(m => m.id));
        const newIds = new Set(uniqueMessages.map(m => m.id));
        
        // If sets are the same size and contain the same IDs, don't update
        if (prevIds.size === newIds.size && [...prevIds].every(id => newIds.has(id))) {
          console.log('🔄 Messages unchanged, skipping update');
          return prev;
        }
        
        console.log('📝 Messages changed, updating state - OVERRIDING PREVIOUS MESSAGES');
        return uniqueMessages;
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  }, [activeSessionId]);

  // Load sessions on mount and when dependencies change
  useEffect(() => {
    console.log('🔄 loadSessions useEffect triggered');
    loadSessions();
  }, [loadSessions]);

  // Load messages when active session changes
  useEffect(() => {
    console.log('🔄 loadMessages useEffect triggered, activeSessionId:', activeSessionId);
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
    let sessionIdToUse = activeSessionId;
    
    // Auto-create session if none exists
    if (!sessionIdToUse) {
      try {
        const newSession = await createSession();
        if (!newSession) {
          console.error('Failed to create new session');
          return;
        }
        sessionIdToUse = newSession.id;
        setActiveSessionId(newSession.id);
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }
    
    // Create a temporary sendMessage function with the correct sessionId
    try {
      console.log('[handleSendMessage] Using sessionId:', sessionIdToUse);
      
      if (!user || !currentWorkspace || !sessionIdToUse) {
        console.error('[handleSendMessage] Missing required parameters:', {
          hasUser: !!user,
          hasWorkspace: !!currentWorkspace,
          hasSessionId: !!sessionIdToUse
        });
        return;
      }

      // Store user message in database directly
      const userMessage = await db.createChatMessage(sessionIdToUse, 'user', content);
      
      // Add user message to UI immediately
      const userMessageObj = {
        id: userMessage.id,
        content: content,
        role: 'user' as const,
        timestamp: userMessage.created_at,
      };
      
      handleNewMessage(userMessageObj);

      // Process message with AI agent via API
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdToUse,
          userMessage: content,
          workspaceId: currentWorkspace.id,
          userId: user.id,
          visionId: visionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[handleSendMessage] API request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      const { response: agentResponse, ui_actions } = responseData;
      
      if (ui_actions) {
        console.log('[handleSendMessage] 🔴 UI actions detected:', JSON.stringify(ui_actions, null, 2));
      } else {
        console.log('[handleSendMessage] ⚪ No UI actions in response');
      }

      // Store agent response in database with UI actions
      const assistantMessage = await db.createChatMessage(
        sessionIdToUse, 
        'assistant', 
        agentResponse,
        ui_actions ? { ui_actions } : undefined
      );
      
      // Add assistant message to UI
      const responseMessage = {
        id: assistantMessage.id,
        content: agentResponse,
        role: 'assistant' as const,
        timestamp: assistantMessage.created_at,
        ui_actions: ui_actions || null,
      };

      console.log('🟢 [handleSendMessage] Adding message to UI with ui_actions:', {
        id: responseMessage.id,
        hasUIActions: !!responseMessage.ui_actions,
        uiActions: responseMessage.ui_actions,
        timestamp: new Date().toISOString()
      });

      handleNewMessage(responseMessage);
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [activeSessionId, createSession, user, currentWorkspace, visionId, handleNewMessage]);

  const handleRegenerateMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1];
      handleSendMessage(previousUserMessage.content);
    }
  };

  // Load vision state for preview
  const loadVisionState = useCallback(async () => {
    if (!visionId || !currentWorkspace) {
      return;
    }

    try {
      // Direct query to visions table instead of using non-existent RPC
      const { data, error } = await supabase
        .from('visions')
        .select('*')
        .eq('id', visionId)
        .eq('workspace_id', currentWorkspace.id)
        .single();
      
      if (error) {
        console.error('Failed to load vision state:', error);
        return;
      }

      if (data) {
        setCurrentVisionState(data.vision_state || {});
      }
    } catch (error) {
      console.error('Error loading vision state:', error);
    }
  }, [visionId, currentWorkspace]);

  // Handle vision preview
  const handlePreviewVision = useCallback(() => {
    // Collapse sidebar when opening preview
    setSidebarOpen(false);
    
    if (!currentVisionState) {
      loadVisionState().then(() => {
        setShowVisionPreview(true);
      });
    } else {
      setShowVisionPreview(true);
    }
  }, [currentVisionState, loadVisionState]);

  // Handle vision preview close
  const handleClosePreview = useCallback(() => {
    setShowVisionPreview(false);
  }, []);

  // Load vision state when visionId changes
  useEffect(() => {
    if (visionId) {
      loadVisionState();
    }
  }, [visionId, loadVisionState]);


  return (
    <div className={cn("relative h-full flex", className)}>
      {/* Sidebar - Overlay when open */}
      <div className="absolute top-0 left-0 z-50">
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
          onPreviewVision={handlePreviewVision}
        />
      </div>

      {/* Main Content Area - Chat */}
      {!showVisionPreview && (
        <div className="w-full h-full">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            onRegenerateMessage={handleRegenerateMessage}
            onAction={handleUIAction}
            isLoading={isGenerating}
            className="h-full"
            onPreviewVision={handlePreviewVision}
          />
        </div>
      )}

      {/* Vision Preview Page */}
      {showVisionPreview && currentVisionState && (
        <div className="flex-1 h-full">
          <VisionPreview
            visionState={currentVisionState}
            onClose={handleClosePreview}
            className="h-full"
          />
          
          {/* Floating Close Button - Same position as preview button in chat mode */}
          <button
            onClick={handleClosePreview}
            className="fixed bottom-28 right-6 w-14 h-14 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 hover:scale-105 hover:shadow-lg transition-all duration-300 z-50 group"
          >
            <svg className="w-6 h-6 text-gray-700 group-hover:text-gray-800 group-hover:scale-110 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Chat Input - Same as chat mode */}
          <div className="fixed bottom-4 left-4 right-4 z-40">
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isGenerating}
              placeholder="Ask to update your vision or get more details..."
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default EnhancedVisionChatLayout;