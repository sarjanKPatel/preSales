'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatSession } from '@/types';
import { db } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ChatMessageComponent from './ChatMessage';
import Button from '@/components/Button';
import { 
  Send, 
  Loader2, 
  MessageSquare, 
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  proposalId: string;
  session?: ChatSession | null;
  onSessionCreated?: (session: ChatSession) => void;
  className?: string;
}

export default function ChatInterface({
  proposalId,
  session,
  onSessionCreated,
  className,
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(session || null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [currentSession]);

  const loadMessages = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await db.getChatMessages(currentSession.id);
      
      if (fetchError) throw fetchError;
      
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!user) {
      setError('Please sign in to start a chat');
      return null;
    }

    try {
      const { data, error: createError } = await db.createChatSession(proposalId);
      
      if (createError) throw createError;
      
      setCurrentSession(data);
      onSessionCreated?.(data);
      return data;
    } catch (err) {
      console.error('Error creating chat session:', err);
      setError('Failed to create chat session');
      return null;
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    let sessionToUse = currentSession;
    
    // Create session if it doesn't exist
    if (!sessionToUse) {
      sessionToUse = await createSession();
      if (!sessionToUse) return;
    }

    try {
      setSending(true);
      setError(null);

      // Add user message
      const userMessage = {
        session_id: sessionToUse.id,
        role: 'user' as const,
        content: content.trim(),
      };

      const { data: userMsgData, error: userMsgError } = await db.addChatMessage(userMessage);
      
      if (userMsgError) throw userMsgError;
      
      // Update messages immediately
      setMessages(prev => [...prev, userMsgData]);
      setInputText('');

      // TODO: Integration with OpenAI will go here
      // For now, we'll add a placeholder assistant response
      setTimeout(async () => {
        try {
          const assistantMessage = {
            session_id: sessionToUse.id,
            role: 'assistant' as const,
            content: `I understand you'd like help with: "${content.trim()}"\n\nI'm ready to assist you with your proposal, but I need to be connected to OpenAI first. Once that's set up, I'll be able to:\n\n• Analyze your requirements\n• Generate proposal sections\n• Provide strategic insights\n• Suggest improvements\n\nFor now, I can help you organize your thoughts manually!`,
            metadata: {
              confidence: 0.95,
              timestamp: new Date().toISOString(),
              ready_for_ai: true,
            },
          };

          const { data: assistantMsgData, error: assistantMsgError } = await db.addChatMessage(assistantMessage);
          
          if (assistantMsgError) throw assistantMsgError;
          
          setMessages(prev => [...prev, assistantMsgData]);
        } catch (err) {
          console.error('Error adding assistant message:', err);
        }
      }, 1000);

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !sending) {
      sendMessage(inputText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const startNewChat = async () => {
    const newSession = await createSession();
    if (newSession) {
      setMessages([]);
      setError(null);
    }
  };

  if (!user) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-600 text-center">
          Please sign in to start chatting about your proposal.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">AI Assistant</h3>
            <p className="text-sm text-gray-500">
              {currentSession ? 'Ready to help with your proposal' : 'Start a conversation'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentSession && (
            <Button
              onClick={startNewChat}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          )}
          <div className="flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Demo Mode
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
            <span className="text-gray-600">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Tell me about your proposal needs, challenges, or goals. I'm here to help you create compelling sales proposals.
            </p>
            <div className="grid grid-cols-1 gap-2 text-sm text-left w-full max-w-md">
              <button
                onClick={() => setInputText('Help me identify key stakeholders for this proposal')}
                className="p-3 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                💼 Help me identify key stakeholders for this proposal
              </button>
              <button
                onClick={() => setInputText('What challenges might this client be facing?')}
                className="p-3 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                🎯 What challenges might this client be facing?
              </button>
              <button
                onClick={() => setInputText('Generate an executive summary for this proposal')}
                className="p-3 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                📝 Generate an executive summary for this proposal
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
                isLatest={index === messages.length - 1}
              />
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg rounded-bl-sm px-4 py-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 mx-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about stakeholders, challenges, solutions, or anything else..."
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
              disabled={sending}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!inputText.trim() || sending}
            loading={sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}