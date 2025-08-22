import { supabase } from '@/lib/supabase';
import { EmbeddingService } from './embeddingService';
import { VisionState } from '../../types';

export interface VectorDocument {
  id?: string;
  content: string;
  metadata: {
    source: string;
    type: 'vision' | 'proposal' | 'lead' | 'knowledge_base';
    documentId: string;
    chunkId?: string;
    [key: string]: any;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  similarity: number;
}

export class VectorStore {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Index a vision state into the vector store
   */
  async indexVision(visionId: string, visionState: VisionState, workspaceId: string): Promise<void> {
    try {
      // Convert vision state to chunks
      const chunks = this.visionStateToChunks(visionId, visionState);
      
      // Generate embeddings for all chunks
      const texts = chunks.map(chunk => chunk.content);
      console.log(`[VectorStore] Generating embeddings for ${texts.length} chunks...`);
      
      let embeddings: number[][] = [];
      try {
        embeddings = await this.embeddingService.generateEmbeddings(texts);
        console.log(`[VectorStore] Generated ${embeddings.length} embeddings successfully`);
      } catch (embeddingError) {
        console.error('[VectorStore] Embedding generation failed:', embeddingError);
        // Continue without embeddings for now - store null embeddings
        console.log('[VectorStore] Continuing with null embeddings due to error');
        embeddings = texts.map(() => new Array(1536).fill(0)); // Zero vectors as fallback
      }

      // Store chunks with embeddings
      const records = chunks.map((chunk, index) => ({
        workspace_id: workspaceId,
        document_id: visionId,
        document_type: 'vision',
        chunk_id: chunk.metadata.chunkId,
        content: chunk.content,
        embedding: embeddings[index] ? `[${embeddings[index].join(',')}]` : null,
        metadata: chunk.metadata
        // Don't include fts_content - it's a generated column
      }));

      // Delete existing chunks for this vision
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', visionId)
        .eq('document_type', 'vision');

      // Insert new chunks
      const { error } = await supabase
        .from('document_chunks')
        .insert(records);

      if (error) {
        throw error;
      }

      console.log(`[VectorStore] Indexed ${chunks.length} chunks for vision ${visionId}`);
    } catch (error) {
      console.error('[VectorStore] Failed to index vision:', error);
      throw new Error(`Failed to index vision: ${error}`);
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    workspaceId: string,
    options: {
      documentType?: 'vision' | 'proposal' | 'lead' | 'knowledge_base';
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    try {
      const { documentType, limit = 5, threshold = 0.7 } = options;

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const embeddingString = `[${queryEmbedding.join(',')}]`;

      // Call the search function
      const { data, error } = await supabase.rpc('search_document_chunks', {
        query_embedding: embeddingString,
        workspace_id_filter: workspaceId,
        document_type_filter: documentType,
        match_count: limit,
        similarity_threshold: threshold
      });

      if (error) {
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata,
        similarity: row.similarity
      }));
    } catch (error) {
      console.error('[VectorStore] Search failed:', error);
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Hybrid search combining vector and full-text search
   */
  async hybridSearch(
    query: string,
    workspaceId: string,
    options: {
      documentType?: 'vision' | 'proposal' | 'lead' | 'knowledge_base';
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    try {
      const { documentType, limit = 5, threshold = 0.7 } = options;

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const embeddingString = `[${queryEmbedding.join(',')}]`;

      // Call the hybrid search function
      const { data, error } = await supabase.rpc('hybrid_search_document_chunks', {
        query_embedding: embeddingString,
        query_text: query,
        workspace_id_filter: workspaceId,
        document_type_filter: documentType,
        match_count: limit,
        similarity_threshold: threshold
      });

      if (error) {
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata,
        similarity: row.rank // Use combined rank for hybrid search
      }));
    } catch (error) {
      console.error('[VectorStore] Hybrid search failed:', error);
      throw new Error(`Hybrid search failed: ${error}`);
    }
  }

  /**
   * Convert vision state to searchable chunks
   */
  private visionStateToChunks(visionId: string, visionState: VisionState): VectorDocument[] {
    const chunks: VectorDocument[] = [];

    // Company overview chunk
    if (visionState.company_name || visionState.industry) {
      chunks.push({
        content: this.formatChunkContent({
          title: 'Company Overview',
          company_name: visionState.company_name,
          industry: visionState.industry,
          company_size: visionState.company_size
        }),
        metadata: {
          source: 'vision_state',
          type: 'vision',
          documentId: visionId,
          chunkId: 'company_overview',
          section: 'overview'
        }
      });
    }

    // Vision statement chunk
    if (visionState.vision_statement) {
      chunks.push({
        content: this.formatChunkContent({
          title: 'Vision Statement',
          vision_statement: visionState.vision_statement,
          key_themes: visionState.key_themes
        }),
        metadata: {
          source: 'vision_state',
          type: 'vision',
          documentId: visionId,
          chunkId: 'vision_statement',
          section: 'vision'
        }
      });
    }

    // Strategy chunk
    if (visionState.current_strategy || visionState.strategic_priorities?.length) {
      chunks.push({
        content: this.formatChunkContent({
          title: 'Strategy',
          current_strategy: visionState.current_strategy,
          strategic_priorities: visionState.strategic_priorities,
          timeline: visionState.timeline
        }),
        metadata: {
          source: 'vision_state',
          type: 'vision',
          documentId: visionId,
          chunkId: 'strategy',
          section: 'strategy'
        }
      });
    }

    // Market context chunk
    if (visionState.market_size || visionState.competitive_landscape) {
      chunks.push({
        content: this.formatChunkContent({
          title: 'Market Context',
          market_size: visionState.market_size,
          competitive_landscape: visionState.competitive_landscape
        }),
        metadata: {
          source: 'vision_state',
          type: 'vision',
          documentId: visionId,
          chunkId: 'market_context',
          section: 'market'
        }
      });
    }

    // Goals and metrics chunk
    if (visionState.target_outcomes?.length || visionState.success_metrics?.length) {
      chunks.push({
        content: this.formatChunkContent({
          title: 'Goals and Metrics',
          target_outcomes: visionState.target_outcomes,
          success_metrics: visionState.success_metrics
        }),
        metadata: {
          source: 'vision_state',
          type: 'vision',
          documentId: visionId,
          chunkId: 'goals_metrics',
          section: 'outcomes'
        }
      });
    }

    // Constraints and assumptions chunk
    if (visionState.constraints?.length || visionState.assumptions?.length) {
      chunks.push({
        content: this.formatChunkContent({
          title: 'Constraints and Assumptions',
          constraints: visionState.constraints,
          assumptions: visionState.assumptions
        }),
        metadata: {
          source: 'vision_state',
          type: 'vision',
          documentId: visionId,
          chunkId: 'constraints_assumptions',
          section: 'planning'
        }
      });
    }

    // Custom fields as separate chunks
    if (visionState.custom_fields) {
      Object.entries(visionState.custom_fields).forEach(([key, value]) => {
        chunks.push({
          content: this.formatChunkContent({
            title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            [key]: value
          }),
          metadata: {
            source: 'vision_state',
            type: 'vision',
            documentId: visionId,
            chunkId: `custom_${key}`,
            section: 'custom',
            fieldName: key
          }
        });
      });
    }

    return chunks;
  }

  /**
   * Format chunk content for better retrieval
   */
  private formatChunkContent(data: any): string {
    const parts: string[] = [];
    
    if (data.title) {
      parts.push(`## ${data.title}`);
    }

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'title') return;
      
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      if (Array.isArray(value)) {
        if (value.length > 0) {
          parts.push(`${formattedKey}: ${value.join(', ')}`);
        }
      } else if (value) {
        parts.push(`${formattedKey}: ${value}`);
      }
    });

    return parts.join('\n');
  }
}