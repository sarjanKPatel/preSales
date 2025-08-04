'use client';

import React, { useRef, useEffect } from 'react';
import Message, { MessageProps } from './Message';
import ChatInput from './ChatInput';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  messages: MessageProps[];
  onSendMessage: (message: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onMessageFeedback?: (messageId: string, type: 'up' | 'down') => void;
  isLoading?: boolean;
  className?: string;
}

export default function ChatWindow({
  messages,
  onSendMessage,
  onRegenerateMessage,
  onMessageFeedback,
  isLoading = false,
  className
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleRegenerate = (messageId: string) => {
    onRegenerateMessage?.(messageId);
  };

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    onMessageFeedback?.(messageId, type);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
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
            {messages.map((message) => (
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

      {/* Input Area */}
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={isLoading}
        placeholder="Ask about vision, leads, or proposals..."
      />
    </div>
  );
}