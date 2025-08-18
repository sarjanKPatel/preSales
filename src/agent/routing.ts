import { TurnHandler, TurnConfig, TurnHandlerDependencies } from './handleTurn';
import { ContextLoader } from './memory/context';
import { LLMProviderManager } from './llm/provider';
import { StreamResponse } from '../types';
import { supabase } from '@/lib/supabase';

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

    // Use shared Supabase client from lib/supabase.ts
    // No need to create a new instance

    // Initialize Context Loader
    const contextLoader = new ContextLoader({
      maxMessages: this.config.maxMessages,
      includeSummary: true,
    });

    // Initialize LLM Provider
    const llmProvider = new LLMProviderManager();

    const dependencies: TurnHandlerDependencies = {
      contextLoader,
      llmProvider,
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