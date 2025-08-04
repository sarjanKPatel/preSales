'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================
// CHAT INPUT COMPONENT
// Handles message input, voice recording, and file attachments
// =============================================

interface ChatInputProps {
  onSendMessage: (message: string) => void;        // Callback when message is sent
  onAttachment?: () => void;                        // Callback for file attachment
  onVoiceRecord?: (isRecording: boolean) => void;  // Callback for voice recording
  disabled?: boolean;                               // Disable input functionality
  placeholder?: string;                             // Custom placeholder text
}

export default function ChatInput({
  onSendMessage,
  onAttachment,
  onVoiceRecord,
  disabled = false,
  placeholder = "Type your message..."
}: ChatInputProps) {
  // =============================================
  // STATE MANAGEMENT
  // =============================================
  const [message, setMessage] = useState('');           // Current message text
  const [isRecording, setIsRecording] = useState(false); // Voice recording state
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Reference to textarea for auto-resize

  // =============================================
  // AUTO-RESIZE TEXTAREA
  // Dynamically adjusts textarea height based on content
  // =============================================
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';  // Reset height to calculate new size
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; // Set new height with max limit
    }
  }, [message]);

  // =============================================
  // MESSAGE SUBMISSION HANDLER
  // Handles form submission and message sending
  // =============================================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();  // Prevent default form submission
    if (message.trim() && !disabled) {  // Only send if message has content and not disabled
      onSendMessage(message.trim());     // Send trimmed message
      setMessage('');                    // Clear input after sending
    }
  };

  // =============================================
  // KEYBOARD SHORTCUTS
  // Enter to send, Shift+Enter for new line
  // =============================================
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {  // Enter without Shift
      e.preventDefault();                      // Prevent new line
      handleSubmit(e);                        // Send message
    }
    // Shift+Enter allows new line (default behavior)
  };

  // =============================================
  // VOICE RECORDING TOGGLE
  // Switches between recording and stopped states
  // =============================================
  const toggleRecording = () => {
    const newRecordingState = !isRecording;  // Toggle recording state
    setIsRecording(newRecordingState);       // Update local state
    onVoiceRecord?.(newRecordingState);     // Notify parent component
  };

  return (
    // =============================================
    // MAIN FORM CONTAINER
    // Glass morphism styling with border
    // =============================================
    <form onSubmit={handleSubmit} className="p-4 border-t border-white/20 glass-heavy">
      
      {/* =============================================
          INPUT CONTROLS CONTAINER
          Flex layout with attachment, input, and send buttons
          ============================================= */}
      <div className="flex items-end gap-2">
        
        {/* =============================================
            ATTACHMENT BUTTON
            Optional file attachment functionality
            ============================================= */}
        {onAttachment && (
          <button
            type="button"
            onClick={onAttachment}
            disabled={disabled}
            className={cn(
              "p-2 rounded-lg glass transition-all",
              "hover:bg-white/30",                    // Hover effect
              disabled && "opacity-50 cursor-not-allowed"  // Disabled state
            )}
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* =============================================
            MESSAGE INPUT CONTAINER
            Contains textarea and voice recording button
            ============================================= */}
        <div className="flex-1 relative">
          
          {/* =============================================
              TEXTAREA INPUT
              Auto-resizing text input with glass styling
              ============================================= */}
          <textarea
            ref={textareaRef}  // Reference for auto-resize
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}  // Keyboard shortcuts
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full px-4 py-3 pr-12 glass rounded-xl resize-none",  // Base styling
              "border border-white/30",                                 // Border
              "focus:ring-2 focus:ring-primary focus:border-transparent", // Focus state
              "placeholder-gray-500 text-gray-900",                     // Text colors
              "min-h-[48px] max-h-[120px]",                           // Height constraints
              disabled && "opacity-50 cursor-not-allowed"              // Disabled state
            )}
          />
          
          {/* =============================================
              VOICE RECORDING BUTTON
              Only shows when no text and voice recording is enabled
              ============================================= */}
          {onVoiceRecord && !message && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={disabled}
              className={cn(
                "absolute right-2 bottom-2 p-2 rounded-lg transition-all",
                isRecording 
                  ? "glass bg-red-500/20 hover:bg-red-500/30"  // Recording state (red)
                  : "glass hover:bg-white/30",                  // Default state
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {isRecording ? (
                <StopCircle className="w-5 h-5 text-red-600" />  // Stop recording icon
              ) : (
                <Mic className="w-5 h-5 text-gray-600" />        // Start recording icon
              )}
            </button>
          )}
        </div>

        {/* =============================================
            SEND BUTTON
            Submits the message when clicked
            ============================================= */}
        <button
          type="submit"
          disabled={!message.trim() || disabled}  // Disabled if no message or component disabled
          className={cn(
            "p-3 rounded-xl glass transition-all",
            "hover:bg-primary/20",                               // Hover effect
            (!message.trim() || disabled) && "opacity-50 cursor-not-allowed"  // Disabled state
          )}
        >
          <Send className={cn(
            "w-5 h-5 transition-colors",
            message.trim() && !disabled ? "text-primary" : "text-gray-400"  // Color based on state
          )} />
        </button>
      </div>
      
      {/* =============================================
          KEYBOARD SHORTCUTS HELP TEXT
          Shows user how to use keyboard shortcuts
          ============================================= */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </form>
  );
}