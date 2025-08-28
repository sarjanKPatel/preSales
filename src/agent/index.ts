// Main Agent Export
// Types are now in ../types/index.ts
export * from './handleTurn';
export * from './routing';

// Import for internal use
import { createAgent, processVisionMessage } from './routing';

// Memory System - Old context removed, using ChatGPT memory system

// LLM Integration
export * from './llm/provider';
export * from './llm/adapters';
export * from './llm/routing';

// Tools System
export * from './tools';


// Prompts and Validation
export * from './prompts/templates/vision';

// Observability
export * from './observability/tracing';

// Convenience imports for common usage
export {
  createAgent,
  getGlobalAgent,
  processVisionMessage,
  checkAgentHealth,
} from './routing';

export {
  TurnHandler,
  type TurnConfig,
  type TurnHandlerDependencies,
} from './handleTurn';

export {
  toolRegistry,
  toolRouter,
  GapDetector,
  VisionStateManager,
} from './tools';

export {
  OpenAIProvider,
  LLMProviderManager,
} from './llm/provider';

export {
  OpenAIAdapter,
} from './llm/adapters';

export {
  llmRouter,
  complete,
} from './llm/routing';

// Old ContextLoader removed - using ChatGPT memory system


export {
  withRootSpan,
  createTimer,
  trackError,
  metrics,
  spans,
  health,
  traced,
} from './observability/tracing';

// Template exports
export {
  PromptTemplate,
} from './prompts/templates/vision';

// Version and metadata
export const AGENT_VERSION = '1.0.0';
export const AGENT_NAME = 'PropelIQ Vision Agent';

// Default configurations
export const DEFAULT_AGENT_CONFIG = {
  maxMessages: 50,
  maxTokens: 8000,
};

// Initialize function for easy setup
export async function initializeAgent(config?: {
  openaiApiKey?: string;
  anthropicApiKey?: string;
}) {
  
  // Set environment variables if provided
  if (config?.openaiApiKey) {
    process.env.OPENAI_API_KEY = config.openaiApiKey;
  }
  if (config?.anthropicApiKey) {
    process.env.ANTHROPIC_API_KEY = config.anthropicApiKey;
  }
  
  // Create and configure agent
  const agent = createAgent({
    openaiApiKey: config?.openaiApiKey,
    anthropicApiKey: config?.anthropicApiKey,
    maxMessages: DEFAULT_AGENT_CONFIG.maxMessages,
    maxTokens: DEFAULT_AGENT_CONFIG.maxTokens,
  });
  
  // Perform health check
  const health = await agent.healthCheck();
  
  if (health.status === 'unhealthy') {
    console.warn('[Agent] Warning: Agent is unhealthy, some features may not work correctly');
    console.warn('[Agent] Component status:', health.components);
  }
  
  return agent;
}

// Quick start function for testing
export async function quickStart(message = "Hi, I'd like to create a vision for my company"): Promise<string> {
  
  const sessionId = `quickstart_${Date.now()}`;
  const result = await processVisionMessage(sessionId, message, {
    workspaceId: 'quickstart',
    userId: 'quickstart_user',
  });
  
  return result as string;
}