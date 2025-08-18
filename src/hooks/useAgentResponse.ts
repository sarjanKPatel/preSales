import { useState, useCallback } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface UseAgentResponseOptions {
  sessionId?: string;
  visionId?: string;
  onMessage?: (message: any) => void;
}

export function useAgentResponse(options: UseAgentResponseOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const sendMessage = useCallback(async (message: string) => {
    if (!user || !currentWorkspace || !options.sessionId) {
      throw new Error('Missing required parameters for sending message');
    }

    setLoading(true);
    setError(null);

    try {
      // Store user message in database
      const userMessage = await db.createChatMessage(
        options.sessionId,
        'user',
        message
      );

      if (options.onMessage) {
        options.onMessage({
          id: userMessage.id,
          content: message,
          role: 'user',
          timestamp: userMessage.created_at,
        });
      }

      // Process message with AI agent via API
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: options.sessionId,
          userMessage: message,
          workspaceId: currentWorkspace.id,
          userId: user.id,
          visionId: options.visionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const { response: agentResponse } = await response.json();

      // Store agent response in database
      const assistantMessage = await db.createChatMessage(
        options.sessionId,
        'assistant',
        agentResponse
      );

      const responseMessage = {
        id: assistantMessage.id,
        content: agentResponse,
        role: 'assistant' as const,
        timestamp: assistantMessage.created_at,
      };

      if (options.onMessage) {
        options.onMessage(responseMessage);
      }

      return responseMessage;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, currentWorkspace, options.sessionId, options.visionId, options.onMessage]);

  return {
    loading,
    error,
    sendMessage,
  };
}