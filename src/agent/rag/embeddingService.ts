import { OpenAIProvider } from '../llm/provider';

export interface EmbeddingServiceConfig {
  model?: string;
  dimensions?: number;
  batchSize?: number;
}

export class EmbeddingService {
  private openaiProvider: OpenAIProvider;
  private config: EmbeddingServiceConfig;

  constructor(config?: EmbeddingServiceConfig) {
    this.openaiProvider = new OpenAIProvider();
    this.config = {
      model: config?.model || 'text-embedding-3-small',
      dimensions: config?.dimensions || 1536,
      batchSize: config?.batchSize || 100,
      ...config
    };
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openaiProvider.createEmbedding({
        input: text,
        model: this.config.model!,
        dimensions: this.config.dimensions
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      console.log(`[EmbeddingService] Generating embeddings for ${texts.length} texts`);
      const embeddings: number[][] = [];
      
      // Process in batches to avoid API limits
      for (let i = 0; i < texts.length; i += this.config.batchSize!) {
        const batch = texts.slice(i, i + this.config.batchSize!);
        console.log(`[EmbeddingService] Processing batch ${i / this.config.batchSize! + 1}, size: ${batch.length}`);
        
        const response = await this.openaiProvider.createEmbedding({
          input: batch,
          model: this.config.model!,
          dimensions: this.config.dimensions
        });

        embeddings.push(...response.data.map(d => d.embedding));
      }

      console.log(`[EmbeddingService] Successfully generated ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  /**
   * Prepare text for embedding (preprocessing)
   */
  prepareText(text: string, maxLength: number = 8191): string {
    // Clean and normalize text
    let prepared = text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Truncate if too long (OpenAI has token limits)
    if (prepared.length > maxLength) {
      prepared = prepared.substring(0, maxLength) + '...';
    }

    return prepared;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }
}