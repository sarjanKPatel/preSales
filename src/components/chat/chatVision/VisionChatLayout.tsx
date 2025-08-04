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
import { useRecentChatSessions, useCreateChatSession, useUpdateChatSession, useDeleteChatSession, useCreateChatMessage, useSessionWithMessages } from '@/database/chat/hooks';
import type { ChatMessage } from '@/database/shared/types';

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

  // Database hooks
  const { sessions, refresh: refreshSessions } = useRecentChatSessions(20); // Fetch recent chat sessions
  const { createSession } = useCreateChatSession();    // Create new chat session
  const { updateSession } = useUpdateChatSession();    // Update existing session
  const { deleteSession } = useDeleteChatSession();    // Delete chat session
  const { createMessage } = useCreateChatMessage();    // Add message to session
  const { session: activeSession, refresh: refreshActiveSession } = useSessionWithMessages(activeSessionId || null); // Get active session with messages

  const { generateResponse, isGenerating } = useAgentResponse('vision', setDraftVision); // AI response generation
  
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

  const handleNewSession = async () => {              // Create new chat session
    if (!user) return;
    
    const newSession = await createSession({
      title: 'New Vision Chat',
      chat_type: 'vision',
      created_by: user.id,
      metadata: {
        entity_type: 'vision',
        entity_id: entityId,
        entity_name: entityName
      }
    });
    
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
      await updateSession(sessionId, { title: newName });
      refreshSessions();
    }
  };

  const handleDeleteSession = async (sessionId: string) => { // Delete chat session
    if (confirm('Delete this chat session?')) {
      await deleteSession(sessionId);
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
    <div className={cn("flex h-[calc(100vh-4rem)] relative", className)}>
      {/* Left Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}   // Toggle sidebar visibility
        sessions={sessions || []}
        activeSessionId={activeSessionId}
        onSessionSelect={handleSessionSelect}           // Handle session selection
        onNewSession={handleNewSession}                // Create new session
        onRenameSession={handleRenameSession}          // Rename session
        onDeleteSession={handleDeleteSession}          // Delete session
      />

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        sidebarOpen && "ml-[280px]"                    // Adjust margin when sidebar is open
      )}>
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