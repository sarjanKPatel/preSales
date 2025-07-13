'use client';

import React from 'react';
import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Bot, User, Clock } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessage;
  isLatest?: boolean;
}

export default function ChatMessageComponent({ message, isLatest = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex gap-3 mb-4',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isUser 
          ? 'bg-primary text-white' 
          : 'bg-gray-100 text-gray-600'
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex flex-col max-w-[70%]',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Message Bubble */}
        <div className={cn(
          'px-4 py-2 rounded-lg',
          isUser 
            ? 'bg-primary text-white rounded-br-sm' 
            : 'bg-white border border-gray-200 rounded-bl-sm'
        )}>
          <div className="text-sm whitespace-pre-wrap">
            {message.content}
          </div>
          
          {/* Metadata */}
          {message.metadata && (
            <div className="mt-2 pt-2 border-t border-opacity-20 border-current">
              {message.metadata.confidence && (
                <div className="text-xs opacity-75">
                  Confidence: {Math.round(message.metadata.confidence * 100)}%
                </div>
              )}
              {message.metadata.sources && message.metadata.sources.length > 0 && (
                <div className="text-xs opacity-75 mt-1">
                  Sources: {message.metadata.sources.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={cn(
          'flex items-center text-xs text-gray-500 mt-1',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}>
          <Clock className="w-3 h-3 mx-1" />
          <span>{formatTime(message.created_at)}</span>
          {isLatest && !isUser && (
            <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-600 rounded text-xs">
              Latest
            </span>
          )}
        </div>
      </div>
    </div>
  );
}