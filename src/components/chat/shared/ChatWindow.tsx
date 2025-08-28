'use client';

import React, { useRef, useEffect } from 'react';
import Message, { MessageProps } from './Message';
import ChatInput from './ChatInput';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionButton } from './ActionButtons';

interface ChatWindowProps {
  messages: MessageProps[];
  onSendMessage: (message: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onMessageFeedback?: (messageId: string, type: 'up' | 'down') => void;
  onAction?: (actionButton: ActionButton) => void;
  isLoading?: boolean;
  className?: string;
  onPreviewVision?: () => void;
}

export default function ChatWindow({
  messages,
  onSendMessage,
  onRegenerateMessage,
  onMessageFeedback,
  onAction,
  isLoading = false,
  className,
  onPreviewVision
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Check for duplicates in received messages
    const messageIds = messages.map(m => m.id);
    const uniqueIds = [...new Set(messageIds)];
    const hasDuplicates = messageIds.length !== uniqueIds.length;
    
    console.log('[ChatWindow] Messages updated:', {
      messageCount: messages.length,
      uniqueCount: uniqueIds.length,
      hasDuplicates,
      isLoading,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 50),
      messageIds: messages.map(m => `${m.id.slice(0, 8)}...${m.role}`)
    });
    
    if (hasDuplicates) {
      console.warn('🚨 [ChatWindow] Duplicate messages detected in props!');
      // Find duplicates
      const duplicates = messageIds.filter((id, index) => messageIds.indexOf(id) !== index);
      console.warn('Duplicate IDs:', duplicates);
    }
    
    scrollToBottom();
  }, [messages, isLoading]);

  const handleRegenerate = (messageId: string) => {
    onRegenerateMessage?.(messageId);
  };

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    onMessageFeedback?.(messageId, type);
  };

  return (
    <div className={cn("relative h-full", className)}>
      {/* Messages Area */}
      <div className="h-full overflow-y-auto pb-24">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 glass bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start a Conversation
              </h3>
              <p className="text-sm text-gray-600">
                Ask me anything about creating your company vision, managing leads, or building proposals.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-6">
            {messages
              .filter((message, index, self) => 
                index === self.findIndex(m => 
                  m.id === message.id || 
                  (m.content === message.content && m.role === message.role && Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 10000)
                )
              )
              .map((message) => (
                <Message
                  key={message.id}
                  {...message}
                  onRegenerate={
                    message.role === 'assistant' && onRegenerateMessage
                      ? () => handleRegenerate(message.id)
                      : undefined
                  }
                  onFeedback={
                    message.role === 'assistant' && onMessageFeedback
                      ? (type) => handleFeedback(message.id, type)
                      : undefined
                  }
                  onAction={onAction}
                />
              ))}
            
            {isLoading && (
              <Message
                id="typing"
                content=""
                role="assistant"
                timestamp={new Date().toISOString()}
                isTyping={true}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Input Area - Fixed at bottom */}
      <div className="fixed bottom-4 left-4 right-4 z-40">
        <ChatInput
          onSendMessage={(message) => {
            console.log('[ChatWindow] onSendMessage called with:', message);
            onSendMessage(message);
          }}
          disabled={isLoading}
          placeholder="Ask about vision, leads, or proposals..."
        />
      </div>

      {/* Floating Preview Button */}
      {onPreviewVision && (
        <button
          onClick={onPreviewVision}
          className="fixed bottom-28 right-6 w-14 h-14 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 hover:scale-105 hover:shadow-lg transition-all duration-300 z-50 group"
        >
          <FileText className="w-6 h-6 text-gray-700 group-hover:text-gray-800 group-hover:scale-110 transition-all duration-300" />
        </button>
      )}
    </div>
  );
}