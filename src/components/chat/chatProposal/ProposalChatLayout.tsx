'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ChatSidebar, { ChatSession } from '../shared/ChatSidebar';
import ChatWindow from '../shared/ChatWindow';
import { MessageProps } from '../shared/Message';
import { cn } from '@/lib/utils';
import { useAgentResponse } from '@/hooks/useAgentResponse';
import { useAuth } from '@/contexts/AuthContext';
// types removed

interface ProposalChatLayoutProps {
  className?: string;
  entityId?: string;
  entityName?: string;
}

export default function ProposalChatLayout({
  className,
  entityId,
  entityName
}: ProposalChatLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<MessageProps[]>([]);

  // TODO: Replace with new database integration
  const sessions: any[] = [];
  const refreshSessions = () => {};
  const createSession = async () => ({ id: 'temp', title: 'New Chat' });
  const updateSession = async () => {};
  const deleteSession = async () => {};
  const createMessage = async () => ({ id: 'temp' });
  const activeSession = null;
  const refreshActiveSession = () => {};

  const { sendMessage, loading: isGenerating } = useAgentResponse();
  
  // TODO: Replace with new database integration
  useEffect(() => {
    // activeSession is now always null, so just set empty messages
    setMessages([]);
  }, [activeSession]);
  
  // Set initial active session
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const handleNewSession = async () => {
    if (!user) return;
    
    const newSession = await createSession();
    
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
      await updateSession();
      refreshSessions();
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Delete this chat session?')) {
      await deleteSession();
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
    const userMessage = await createMessage();
    
    // Add to local state immediately
    const userMessageProps: MessageProps = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessageProps]);

    // Generate AI response
    const response = await sendMessage(content);
    
    // Create AI message in database
    const aiMessage = await createMessage();
    
    const aiMessageProps: MessageProps = {
      id: (Date.now() + 1).toString(),
      content: response.content,
      role: 'assistant',
      timestamp: response.timestamp
    };
    setMessages(prev => [...prev, aiMessageProps]);
    
    // Update session with preview
    await updateSession();
    refreshSessions();
  }, [activeSessionId, createMessage, sendMessage, messages, updateSession, refreshSessions]);

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