'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ChatSidebar, { ChatSession } from '../shared/ChatSidebar';
import ChatWindow from '../shared/ChatWindow';
import { MessageProps } from '../shared/Message';
import { cn } from '@/lib/utils';
import { useAgentResponse } from '@/hooks/useAgentResponse';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentChatSessions, useCreateChatSession, useUpdateChatSession, useDeleteChatSession, useCreateChatMessage, useSessionWithMessages } from '@/database/chat/hooks';
import type { ChatMessage } from '@/database/shared/types';

interface LeadChatLayoutProps {
  className?: string;
  entityId?: string;
  entityName?: string;
}

export default function LeadChatLayout({
  className,
  entityId,
  entityName
}: LeadChatLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<MessageProps[]>([]);

  // Database hooks
  const { sessions, refresh: refreshSessions } = useRecentChatSessions(20);
  const { createSession } = useCreateChatSession();
  const { updateSession } = useUpdateChatSession();
  const { deleteSession } = useDeleteChatSession();
  const { createMessage } = useCreateChatMessage();
  const { session: activeSession, refresh: refreshActiveSession } = useSessionWithMessages(activeSessionId || null);

  const { generateResponse, isGenerating } = useAgentResponse('lead', () => {});
  
  // Load messages when active session changes
  useEffect(() => {
    if (activeSession?.messages) {
      const formattedMessages: MessageProps[] = activeSession.messages.map((msg: ChatMessage) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: msg.created_at
      }));
      setMessages(formattedMessages);
    } else {
      setMessages([]);
    }
  }, [activeSession]);
  
  // Set initial active session
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const handleNewSession = async () => {
    if (!user) return;
    
    const newSession = await createSession({
      title: 'New Lead Chat',
      chat_type: 'lead',
      created_by: user.id,
      metadata: {
        entity_type: 'lead',
        entity_id: entityId,
        entity_name: entityName
      }
    });
    
    if (newSession) {
      setActiveSessionId(newSession.id);
      setMessages([]);
      refreshSessions();
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleRenameSession = async (sessionId: string) => {
    const newName = prompt('Enter new name:');
    if (newName) {
      await updateSession(sessionId, { title: newName });
      refreshSessions();
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Delete this chat session?')) {
      await deleteSession(sessionId);
      if (activeSessionId === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        setActiveSessionId(remainingSessions[0]?.id);
      }
      refreshSessions();
    }
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!activeSessionId) return;
    
    // Create user message in database
    const userMessage = await createMessage({
      session_id: activeSessionId,
      role: 'user',
      content,
      metadata: {}
    });
    
    if (!userMessage) return;
    
    // Add to local state immediately
    const userMessageProps: MessageProps = {
      id: userMessage.id,
      content: userMessage.content,
      role: 'user',
      timestamp: userMessage.created_at
    };
    setMessages(prev => [...prev, userMessageProps]);

    // Generate AI response
    const response = await generateResponse(content, messages);
    
    // Create AI message in database
    const aiMessage = await createMessage({
      session_id: activeSessionId,
      role: 'assistant',
      content: response,
      metadata: {}
    });
    
    if (aiMessage) {
      const aiMessageProps: MessageProps = {
        id: aiMessage.id,
        content: aiMessage.content,
        role: 'assistant',
        timestamp: aiMessage.created_at
      };
      setMessages(prev => [...prev, aiMessageProps]);
      
      // Update session with preview
      await updateSession(activeSessionId, {
        metadata: {
          ...activeSession?.metadata,
          last_message_preview: content.slice(0, 50) + '...'
        }
      });
      refreshSessions();
    }
  }, [activeSessionId, createMessage, generateResponse, messages, updateSession, activeSession?.metadata, refreshSessions]);

  const handleRegenerateMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1];
      handleSendMessage(previousUserMessage.content);
    }
  };

  return (
    <div className={cn("flex h-[calc(100vh-4rem)] relative", className)}>
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
      />

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        sidebarOpen && "ml-[280px]"
      )}>
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