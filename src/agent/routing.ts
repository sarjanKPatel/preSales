import { TurnHandler, TurnConfig, TurnHandlerDependencies } from './handleTurn';
import { LLMProviderManager } from './llm/provider';
import { StreamResponse, AgentContext, VisionState, SessionData } from '../types';
import { supabase } from '@/lib/supabase';
import { ChatGPTMemoryManager } from './memory/chatGPTMemory';

// Minimal context loader for vision data only (messages handled by ChatGPT memory)
class SimpleContextLoader {
  async loadVisionContext(visionId: string, sessionId: string, workspaceId: string, userId?: string): Promise<AgentContext> {
    // Load vision data using RPC to ensure fresh data (avoid stale cache issues)
    let visionData;
    console.log('[SimpleContextLoader] Loading fresh vision data for:', visionId);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_vision_for_update', {
        p_vision_id: visionId,
        p_workspace_id: workspaceId
      });

    if (rpcError || !rpcData) {
      // Fallback to direct query with cache busting
      console.warn('[SimpleContextLoader] RPC failed, using direct query:', rpcError?.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('visions')
        .select('*')
        .eq('id', visionId)
        .eq('workspace_id', workspaceId)
        .single();
      
      if (fallbackError || !fallbackData) {
        throw new Error(`Vision not found: ${visionId}`);
      }
      
      visionData = fallbackData;
    } else {
      visionData = rpcData;
    }
    
    console.log('[SimpleContextLoader] Loaded vision state with skipped_fields:', visionData.vision_state?.metadata?.skipped_fields);

    // Get or create session
    let { data: session } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      // Create session
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          id: sessionId,
          workspace_id: workspaceId,
          user_id: userId || visionData.created_by,
          session_type: 'vision',
          metadata: { vision_id: visionId }
        })
        .select()
        .single();
      
      session = newSession;
    }

    const visionState: VisionState = visionData.vision_state || {};
    
    return {
      messages: [], // Messages handled by ChatGPT memory system
      session: {
        id: session!.id,
        type: session!.session_type as 'vision',
        workspace_id: session!.workspace_id,
        user_id: session!.user_id,
        created_at: session!.created_at,
        updated_at: session!.updated_at,
        metadata: session!.metadata,
      },
      summary: undefined,
      vision_state: {
        ...visionState,
        metadata: {
          session_id: sessionId,
          workspace_id: workspaceId,
          user_id: userId || visionData.created_by,
          status: visionData.status,
          version: 1,
          created_at: visionData.created_at,
          updated_at: visionData.updated_at,
          validation_score: visionData.completeness_score,
          vision_id: visionId,
          vision_title: visionData.title,
          vision_category: visionData.category,
          vision_impact: visionData.impact,
        }
      },
    };
  }
}

export interface AgentConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  maxMessages?: number;
  maxTokens?: number;
}

export class AgentRouter {
  private turnHandler: TurnHandler;
  private config: AgentConfig;

  constructor(config: AgentConfig = {}) {
    this.config = {
      maxMessages: 50,
      maxTokens: 8000,
      ...config,
    };

    this.turnHandler = this.initializeTurnHandler();
  }

  private initializeTurnHandler(): TurnHandler {

    // Initialize LLM Provider
    const llmProvider = new LLMProviderManager();

    // Initialize ChatGPT Memory Manager
    const memoryManager = new ChatGPTMemoryManager();

    const dependencies: TurnHandlerDependencies = {
      llmProvider,
      memoryManager,
      contextLoader: new SimpleContextLoader(), // Minimal context loader for vision data only
    };

    return new TurnHandler(dependencies);
  }

  async *handleTurn(config: TurnConfig): AsyncGenerator<StreamResponse> {
    try {
      // Add default values
      const turnConfig: TurnConfig = {
        maxRetries: 2,
        budgetTokens: this.config.maxTokens,
        ...config,
      };

      
      // Delegate to turn handler
      yield* this.turnHandler.handleTurn(turnConfig);
      
    } catch (error) {
      console.error('[AgentRouter] Turn processing failed:', error);
      yield {
        type: 'error',
        error: `Agent processing failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { 
          sessionId: config.sessionId,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Convenience method for single response (non-streaming)
  async processMessage(config: TurnConfig): Promise<string> {
    let response = '';
    let hasError = false;
    let errorMessage = '';

    for await (const chunk of this.handleTurn(config)) {
      switch (chunk.type) {
        case 'token':
          if (chunk.content) {
            response += chunk.content;
          }
          break;
        case 'error':
          hasError = true;
          errorMessage = chunk.error || 'Unknown error';
          break;
        case 'done':
          break;
        // Ignore metadata chunks for simple response
      }
    }

    if (hasError) {
      throw new Error(errorMessage);
    }

    return response.trim();
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, boolean>;
    message: string;
  }> {
    const components: Record<string, boolean> = {};
    let healthyCount = 0;
    let totalCount = 0;

    // Check LLM providers
    try {
      const providerHealth = await this.turnHandler['deps'].llmProvider.validateAllProviders();
      Object.entries(providerHealth).forEach(([provider, healthy]) => {
        components[`llm_${provider}`] = healthy;
        if (healthy) healthyCount++;
        totalCount++;
      });
    } catch {
      components['llm_providers'] = false;
      totalCount++;
    }

    // Check database connectivity using shared Supabase client
    try {
      // Test with a simple read-only query that doesn't require valid UUIDs
      await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      components['database'] = true;
      healthyCount++;
    } catch {
      components['database'] = false;
    }
    totalCount++;


    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;

    if (healthyCount === totalCount) {
      status = 'healthy';
      message = 'All systems operational';
    } else if (healthyCount > totalCount / 2) {
      status = 'degraded';
      message = `${totalCount - healthyCount} of ${totalCount} components unhealthy`;
    } else {
      status = 'unhealthy';
      message = `${totalCount - healthyCount} of ${totalCount} components failing`;
    }

    return { status, components, message };
  }

}

// Global agent instance
let globalAgent: AgentRouter | null = null;

export function createAgent(config?: AgentConfig): AgentRouter {
  return new AgentRouter(config);
}

export function getGlobalAgent(config?: AgentConfig): AgentRouter {
  if (!globalAgent) {
    globalAgent = createAgent(config);
  }
  return globalAgent;
}


// Convenience functions for common use cases
export async function processVisionMessage(
  sessionId: string,
  userMessage: string,
  options: {
    workspaceId?: string;
    userId?: string;
    visionId?: string; // Add visionId parameter
    streaming?: boolean;
  } = {}
): Promise<string | AsyncGenerator<StreamResponse>> {
  const agent = getGlobalAgent();
  
  if (!options.workspaceId || !options.userId) {
    throw new Error('workspaceId and userId are required for ChatGPT memory system');
  }

  const config: TurnConfig = {
    sessionId,
    userMessage,
    workspaceId: options.workspaceId,
    userId: options.userId,
    visionId: options.visionId, // Pass visionId to config
  };

  if (options.streaming) {
    return agent.handleTurn(config);
  } else {
    return agent.processMessage(config);
  }
}

export async function checkAgentHealth(): Promise<any> {
  const agent = getGlobalAgent();
  return agent.healthCheck();
}