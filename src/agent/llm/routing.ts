import { LLMProvider, LLMProviderManager } from './provider';
import { LLMMessage, LLMOptions, LLMResponse } from '../../types';

export interface RoutingOptions extends LLMOptions {
  provider?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export class LLMRouter {
  private providerManager: LLMProviderManager;
  private defaultProvider = 'OpenAI';

  constructor(providerManager?: LLMProviderManager) {
    this.providerManager = providerManager || new LLMProviderManager();
  }

  setDefaultProvider(provider: string): void {
    this.defaultProvider = provider;
  }

  async complete(prompt: string | LLMMessage[], options: RoutingOptions = {}): Promise<LLMResponse> {
    const {
      maxRetries = 2,
      retryDelay = 1000,
      ...llmOptions
    } = options;

    const provider = options.provider || this.defaultProvider;
    
    return await this.executeWithRetry(
      () => this.providerManager.complete(prompt, { ...llmOptions, provider }),
      maxRetries,
      retryDelay
    );
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          console.warn(`[LLMRouter] Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 1.5; // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  // Health monitoring
  async checkProviderHealth(): Promise<Record<string, { healthy: boolean; latency?: number; error?: string }>> {
    const providers = this.providerManager.getAvailableProviders();
    const healthStatus: Record<string, { healthy: boolean; latency?: number; error?: string }> = {};

    await Promise.all(
      providers.map(async (providerName) => {
        const startTime = Date.now();
        
        try {
          await this.providerManager.complete('Health check', { 
            provider: providerName, 
            maxTokens: 5 
          });
          
          healthStatus[providerName] = {
            healthy: true,
            latency: Date.now() - startTime,
          };
        } catch (error) {
          healthStatus[providerName] = {
            healthy: false,
            error: (error as Error).message,
          };
        }
      })
    );

    return healthStatus;
  }

  // Provider management delegation
  addProvider(provider: LLMProvider): void {
    this.providerManager.addProvider(provider);
  }

  getAvailableProviders(): string[] {
    return this.providerManager.getAvailableProviders();
  }

  async validateAllProviders(): Promise<Record<string, boolean>> {
    return this.providerManager.validateAllProviders();
  }
}

// Global router instance
export const llmRouter = new LLMRouter();

// Convenience functions
export async function complete(prompt: string | LLMMessage[], options?: RoutingOptions): Promise<LLMResponse> {
  return llmRouter.complete(prompt, options);
}

export async function checkHealth(): Promise<Record<string, { healthy: boolean; latency?: number; error?: string }>> {
  return llmRouter.checkProviderHealth();
}