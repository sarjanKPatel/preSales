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
// types removed

interface VisionChatLayoutProps {
  className?: string;                                 // Additional CSS classes
  onSaveVision?: (vision: DraftVision) => void;      // Callback when vision is saved
  entityId?: string;                                  // Related entity ID
  entityName?: string;                                // Related entity name
}

export default function VisionChatLayout({
  className,
  onSaveVision,
  entityId,
  entityName
}: VisionChatLayoutProps) {
  const { user } = useAuth();                         // Get current authenticated user
  const [sidebarOpen, setSidebarOpen] = useState(true); // Control sidebar visibility
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(); // Currently active session
  const [messages, setMessages] = useState<MessageProps[]>([]); // Local message state
  const [draftVision, setDraftVision] = useState<DraftVision>({}); // AI-generated vision draft
  const [isSaving, setIsSaving] = useState(false);    // Vision save loading state
  const [chatWidth, setChatWidth] = useState(66);     // Resizable splitter width (default 2/3)

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

  const handleNewSession = async () => {              // Create new chat session
    if (!user) return;
    
    const newSession = await createSession();
    
    if (newSession) {
      setActiveSessionId(newSession.id);
      setMessages([]);
      setDraftVision({});
      refreshSessions();
    }
  };

  const handleSessionSelect = (sessionId: string) => { // Switch to selected session
    setActiveSessionId(sessionId);
  };

  const handleRenameSession = async (sessionId: string) => { // Rename chat session
    const newName = prompt('Enter new name:');
    if (newName) {
      await updateSession();
      refreshSessions();
    }
  };

  const handleDeleteSession = async (sessionId: string) => { // Delete chat session
    if (confirm('Delete this chat session?')) {
      await deleteSession();
      if (activeSessionId === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        setActiveSessionId(remainingSessions[0]?.id);
      }
      refreshSessions();
    }
  };

  const handleSendMessage = useCallback(async (content: string) => { // Send message and get AI response
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
        onToggle={() => setSidebarOpen(!sidebarOpen)}   // Toggle sidebar visibility
        sessions={sessions || []}
        activeSessionId={activeSessionId}
        onSessionSelect={handleSessionSelect}           // Handle session selection
        onNewSession={handleNewSession}                // Create new session
        onRenameSession={handleRenameSession}          // Rename session
        onDeleteSession={handleDeleteSession}
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