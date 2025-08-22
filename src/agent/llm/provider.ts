import { LLMMessage, LLMOptions, LLMResponse } from '../../types';

export interface EmbeddingRequest {
  input: string | string[];
  model: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface LLMProvider {
  name: string;
  complete(prompt: string | LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  createEmbedding?(request: EmbeddingRequest): Promise<EmbeddingResponse>;
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
    } else {
      console.log('[OpenAIProvider] Initialized with API key:', this.apiKey.substring(0, 10) + '...');
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


  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      console.log('[OpenAIProvider] Creating embedding with model:', request.model);
      console.log('[OpenAIProvider] API Key available:', !!this.apiKey);
      
      if (!this.apiKey) {
        throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
      }
      
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: request.input,
          model: request.model,
          dimensions: request.dimensions,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorText;
        } catch {
          errorMessage = errorText;
        }
        console.error('[OpenAIProvider] Embedding API error:', response.status, errorMessage);
        throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
      }

      const data = await response.json();
      console.log('[OpenAIProvider] Embedding created successfully');
      return data;
    } catch (error) {
      console.error('[OpenAIProvider] Embedding request failed:', error);
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
      'gpt-4o',
      'gpt-4o-mini',
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