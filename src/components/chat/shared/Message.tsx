'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  User, 
  Copy, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageProps {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  isTyping?: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
  onFeedback?: (type: 'up' | 'down') => void;
}

export default function Message({
  id,
  content,
  role,
  timestamp,
  isTyping = false,
  onRegenerate,
  onCopy,
  onFeedback
}: MessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    onFeedback?.(type);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={cn(
      "flex gap-3 py-4 px-4 group",
      role === 'user' ? "justify-end" : "justify-start"
    )}>
      {role === 'assistant' && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 glass bg-primary/20 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
        </div>
      )}

      <div className={cn(
        "max-w-[70%] space-y-2",
        role === 'user' && "items-end"
      )}>
        <div className={cn(
          "rounded-xl px-4 py-3 glass",
          role === 'user' 
            ? "bg-primary/20 border border-primary/30 ml-auto" 
            : "bg-white/70"
        )}>
          {isTyping ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <p className={cn(
              "text-sm whitespace-pre-wrap",
              role === 'assistant' ? "text-gray-900" : "text-gray-900"
            )}>
              {content}
            </p>
          )}
        </div>

        <div className={cn(
          "flex items-center gap-2 text-xs",
          role === 'user' ? "justify-end" : "justify-start"
        )}>
          <span className="text-gray-500">{formatTime(timestamp)}</span>
          
          {role === 'assistant' && !isTyping && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-white/30 transition-colors glass"
                title="Copy message"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-600" />
                )}
              </button>
              
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1 rounded hover:bg-white/30 transition-colors glass"
                  title="Regenerate response"
                >
                  <RefreshCw className="w-3 h-3 text-gray-600" />
                </button>
              )}
              
              <button
                onClick={() => handleFeedback('up')}
                className={cn(
                  "p-1 rounded hover:bg-white/30 transition-colors glass",
                  feedback === 'up' && "bg-green-100/50"
                )}
                title="Good response"
              >
                <ThumbsUp className={cn(
                  "w-3 h-3",
                  feedback === 'up' ? "text-green-600 fill-green-600" : "text-gray-600"
                )} />
              </button>
              
              <button
                onClick={() => handleFeedback('down')}
                className={cn(
                  "p-1 rounded hover:bg-white/30 transition-colors glass",
                  feedback === 'down' && "bg-red-100/50"
                )}
                title="Poor response"
              >
                <ThumbsDown className={cn(
                  "w-3 h-3",
                  feedback === 'down' ? "text-red-600 fill-red-600" : "text-gray-600"
                )} />
              </button>
            </div>
          )}
        </div>
      </div>

      {role === 'user' && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 glass bg-gray-500/20 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
}