'use client';

import React from 'react';
import { 
  Menu, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3,
  ChevronLeft,
  Clock
} from 'lucide-react';
import Button from '@/components/Button';
import { cn } from '@/lib/utils';
import type { ChatSession } from '@/database/shared/types';

export type { ChatSession };

interface ChatSidebarProps {
  isOpen: boolean;                                    // Controls sidebar visibility
  onToggle: () => void;                              // Toggle sidebar open/close
  sessions: ChatSession[];                            // List of chat sessions
  activeSessionId?: string;                           // Currently selected session ID
  onSessionSelect: (sessionId: string) => void;      // Handle session selection
  onNewSession: () => void;                          // Create new chat session
  onRenameSession: (sessionId: string) => void;      // Rename existing session
  onDeleteSession: (sessionId: string) => void;      // Delete session
}

export default function ChatSidebar({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onRenameSession,
  onDeleteSession
}: ChatSidebarProps) {
  const formatTimestamp = (timestamp: string) => {    // Format timestamp for display (relative time)
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const typeColors = {                                // Color mapping for different chat types
    vision: 'bg-purple-500/20 text-purple-600',
    lead: 'bg-blue-500/20 text-blue-600',
    proposal: 'bg-green-500/20 text-green-600'
  };
  
  const getSessionType = (session: ChatSession) => {  // Extract session type from metadata
    return session.metadata?.entity_type || 'chat';
  };
  
  const getSessionPreview = (session: ChatSession) => { // Get preview text from session metadata
    return session.metadata?.last_message_preview || '';
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}                            // Toggle sidebar visibility
        className={cn(
          "fixed top-20 z-40 p-2 glass rounded-r-lg transition-all duration-300",
          "hover:bg-white/30 group",
          isOpen ? "left-[280px]" : "left-0"
        )}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
        ) : (
          <Menu className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
        )}
      </button>

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] w-[280px] glass-heavy",
        "border-r border-white/20 transition-transform duration-300 z-30",
        "flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-white/20">
          <Button
            variant="primary"
            className="w-full"
            icon={<Plus className="w-4 h-4" />}
            onClick={onNewSession}                    // Create new chat session
          >
            New Chat
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No chat history yet</p>
              <p className="text-xs text-gray-500 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group glass rounded-lg p-3 cursor-pointer transition-all",
                  "hover:bg-white/30 hover:shadow-md",
                  activeSessionId === session.id && "bg-white/40 shadow-md"
                )}
                onClick={() => onSessionSelect(session.id)}  // Select this session
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-1 flex-1">
                    {session.title}
                  </h3>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full glass",
                    typeColors[getSessionType(session) as keyof typeof typeColors] || 'bg-gray-500/20 text-gray-600'
                  )}>
                    {getSessionType(session)}
                  </span>
                </div>
                
                {getSessionPreview(session) && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {getSessionPreview(session)}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(session.updated_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();          // Prevent session selection
                        onRenameSession(session.id);  // Rename this session
                      }}
                      className="p-1 rounded hover:bg-white/30 transition-colors"
                    >
                      <Edit3 className="w-3 h-3 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();          // Prevent session selection
                        onDeleteSession(session.id);  // Delete this session
                      }}
                      className="p-1 rounded hover:bg-red-50/50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}