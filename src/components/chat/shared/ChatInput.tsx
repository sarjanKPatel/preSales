'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onAttachment?: () => void;
  onVoiceRecord?: (isRecording: boolean) => void;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  onAttachment,
  onVoiceRecord
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    onVoiceRecord?.(newRecordingState);
  };

  return (
    <div className="p-4 border-t border-white/20 glass-heavy rounded-2xl">
      <form onSubmit={handleSubmit}>
        <div className="flex items-end gap-3">
          
          {/* Attachment Button */}
          {onAttachment && (
            <button
              type="button"
              onClick={onAttachment}
              disabled={disabled}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/30 hover:bg-white/80 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Input Container */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-white/60 backdrop-blur-md border border-white/30 rounded-xl resize-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-500 text-gray-900 min-h-[48px] max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ height: '48px' }}
            />
            
            {/* Voice Recording Button (inside textarea) */}
            {onVoiceRecord && !message && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={disabled}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg transition-colors flex items-center justify-center",
                  isRecording 
                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-600"
                    : "bg-white/30 hover:bg-white/50 text-gray-600",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/30 hover:bg-primary/20 hover:border-primary/40 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className={cn(
              "w-5 h-5 transition-colors",
              message.trim() && !disabled ? "text-primary" : "text-gray-400"
            )} />
          </button>
          
        </div>
      </form>
    </div>
  );
}