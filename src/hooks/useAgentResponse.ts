import { useState, useCallback, useEffect } from 'react';
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

  // Debug: Log when hook is created/recreated
  useEffect(() => {
    console.log('[useAgentResponse] Hook created/recreated:', {
      sessionId: options.sessionId,
      visionId: options.visionId,
      hasOnMessage: !!options.onMessage,
      hasUser: !!user,
      hasWorkspace: !!currentWorkspace,
      timestamp: new Date().toISOString()
    });
  }, [options.sessionId, options.visionId, options.onMessage, user, currentWorkspace]);

  const sendMessage = useCallback(async (message: string) => {
    console.log('[useAgentResponse] sendMessage called', {
      message,
      hasUser: !!user,
      hasWorkspace: !!currentWorkspace,
      sessionId: options.sessionId,
      visionId: options.visionId
    });

    if (!user || !currentWorkspace || !options.sessionId) {
      const error = 'Missing required parameters for sending message';
      console.error('[useAgentResponse] Validation failed:', {
        hasUser: !!user,
        hasWorkspace: !!currentWorkspace,
        hasSessionId: !!options.sessionId
      });
      throw new Error(error);
    }

    console.log('[useAgentResponse] Starting message processing...');
    setLoading(true);
    setError(null);

    try {
      // Store user message in database
      console.log('[useAgentResponse] Creating user message in database...');
      const userMessage = await db.createChatMessage(
        options.sessionId,
        'user',
        message
      );
      console.log('[useAgentResponse] User message created:', userMessage.id);

      // Always call onMessage if provided to add user message to UI
      const userMessageObj = {
        id: userMessage.id,
        content: message,
        role: 'user' as const,
        timestamp: userMessage.created_at,
      };

      console.log('[useAgentResponse] Adding user message to UI:', userMessageObj);
      if (options.onMessage) {
        options.onMessage(userMessageObj);
        console.log('[useAgentResponse] User message sent to onMessage callback');
      } else {
        console.warn('[useAgentResponse] No onMessage callback provided');
      }

      // Process message with AI agent via API
      console.log('[useAgentResponse] Sending API request to /api/agent...');
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

      console.log('[useAgentResponse] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useAgentResponse] API request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('[useAgentResponse] API response received:', responseData);
      const { response: agentResponse, ui_actions } = responseData;
      
      if (ui_actions) {
        console.log('[useAgentResponse] 🔴 UI actions detected:', JSON.stringify(ui_actions, null, 2));
      } else {
        console.log('[useAgentResponse] ⚪ No UI actions in response');
      }

      // Store agent response in database with UI actions
      console.log('[useAgentResponse] Creating assistant message in database...');
      const assistantMessage = await db.createChatMessage(
        options.sessionId,
        'assistant',
        agentResponse,
        ui_actions ? { ui_actions } : undefined
      );
      console.log('[useAgentResponse] Assistant message created:', assistantMessage.id);

      const responseMessage = {
        id: assistantMessage.id,
        content: agentResponse,
        role: 'assistant' as const,
        timestamp: assistantMessage.created_at,
        ui_actions: ui_actions || null,
      };

      console.log('[useAgentResponse] Adding assistant message to UI:', responseMessage);
      if (options.onMessage) {
        options.onMessage(responseMessage);
        console.log('[useAgentResponse] Assistant message sent to onMessage callback');
      } else {
        console.warn('[useAgentResponse] No onMessage callback provided for assistant message');
      }

      console.log('[useAgentResponse] Message processing completed successfully');
      return responseMessage;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      console.error('[useAgentResponse] Error occurred:', {
        error: err,
        errorMessage,
        sessionId: options.sessionId
      });
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      console.log('[useAgentResponse] Setting loading to false');
      setLoading(false);
    }
  }, [user, currentWorkspace, options.sessionId, options.visionId, options.onMessage]);

  // Handle UI action clicks
  const handleUIAction = useCallback(async (actionButton: any) => {
    console.log('[useAgentResponse] UI action triggered:', actionButton);
    
    if (!user || !currentWorkspace || !options.sessionId) {
      console.error('[useAgentResponse] Missing required parameters for UI action');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create user message for the action
      console.log('[useAgentResponse] Creating user action message...');
      const userMessage = await db.createChatMessage(
        options.sessionId,
        'user',
        `[UI Action: ${actionButton.action_type}]`
      );

      const userMessageForUI = {
        id: userMessage.id,
        content: `[UI Action: ${actionButton.action_type}]`,
        role: 'user' as const,
        timestamp: userMessage.created_at,
      };

      if (options.onMessage) {
        options.onMessage(userMessageForUI);
      }

      // Send action to agent
      console.log('[useAgentResponse] Sending UI action to agent API...');
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: options.sessionId,
          userMessage: actionButton.label, // Send the button label as the message
          workspaceId: currentWorkspace.id,
          userId: user.id,
          visionId: options.visionId,
          uiAction: {
            type: actionButton.action_type,
            fieldName: actionButton.field_name,
            metadata: { buttonId: actionButton.id }
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      const { response: agentResponse, ui_actions } = responseData;

      // Store agent response with UI actions
      const assistantMessage = await db.createChatMessage(
        options.sessionId,
        'assistant',
        agentResponse,
        ui_actions ? { ui_actions } : undefined
      );

      const responseMessage = {
        id: assistantMessage.id,
        content: agentResponse,
        role: 'assistant' as const,
        timestamp: assistantMessage.created_at,
        ui_actions: ui_actions || null,
      };

      if (options.onMessage) {
        options.onMessage(responseMessage);
      }

      return responseMessage;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'UI action failed';
      console.error('[useAgentResponse] UI action failed:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, currentWorkspace, options.sessionId, options.visionId, options.onMessage]);

  return {
    loading,
    error,
    sendMessage,
    handleUIAction,
  };
}