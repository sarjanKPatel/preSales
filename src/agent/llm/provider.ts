import { LLMMessage, LLMOptions, LLMResponse } from '../../types';

export interface LLMProvider {
  name: string;
  complete(prompt: string | LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  getAvailableModels(): string[];
  validateApiKey(): Promise<boolean>;
}

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = baseUrl;
    
    if (!this.apiKey) {
      console.warn('[OpenAIProvider] No API key provided. Set OPENAI_API_KEY environment variable.');
    }
  }

  async complete(prompt: string | LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const {
      model = 'gpt-4-turbo',
      temperature = 0.7,
      maxTokens = 1000,
      topP,
      frequencyPenalty,
      presencePenalty,
      stop,
    } = options;

    const messages = Array.isArray(prompt) ? prompt : [{ role: 'user' as const, content: prompt }];
    
    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      stop,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response choices returned from OpenAI API');
      }

      return {
        content: data.choices[0].message.content,
        tokensUsed: data.usage?.total_tokens || 0,
        model: data.model,
        finishReason: data.choices[0].finish_reason,
      };
    } catch (error) {
      console.error('[OpenAIProvider] Complete request failed:', error);
      throw error;
    }
  }


  getAvailableModels(): string[] {
    return [
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-0125-preview',
      'gpt-3.5-turbo-0125',
    ];
  }

  async validateApiKey(): Promise<boolean> {
    // Skip validation if no API key is provided
    if (!this.apiKey) {
      return false;
    }
    
    try {
      const response = await this.complete('Hello', { maxTokens: 5 });
      return response.content.length > 0;
    } catch (error) {
      console.error('[OpenAIProvider] API key validation failed:', error);
      return false;
    }
  }
}


// Multi-provider manager
export class LLMProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider?: LLMProvider;

  constructor() {
    // Initialize with default providers
    this.addProvider(new OpenAIProvider());
    
    // Set OpenAI as default
    this.setDefaultProvider('OpenAI');
  }

  addProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }

  setDefaultProvider(name: string): void {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }
    this.defaultProvider = provider;
  }

  getProvider(name?: string): LLMProvider {
    if (name) {
      const provider = this.providers.get(name);
      if (!provider) {
        throw new Error(`Provider '${name}' not found. Available: ${Array.from(this.providers.keys()).join(', ')}`);
      }
      return provider;
    }
    
    if (!this.defaultProvider) {
      throw new Error('No default provider set');
    }
    
    return this.defaultProvider;
  }

  async complete(prompt: string | LLMMessage[], options?: LLMOptions & { provider?: string }): Promise<LLMResponse> {
    const provider = this.getProvider(options?.provider);
    return provider.complete(prompt, options);
  }


  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async validateAllProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.validateApiKey();
      } catch (error) {
        console.error(`[LLMProviderManager] Validation failed for ${name}:`, error);
        results[name] = false;
      }
    }
    
    return results;
  }
}