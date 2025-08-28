import { supabase } from '@/lib/supabase';
import { EmbeddingService } from '../rag/embeddingService';
import { EntityExtractor, ExtractedEntity } from './entityExtractor';
import { ImportanceScorer } from './importanceScorer';
import { ContextOptimizer, ContextLayer } from './contextOptimizer';

// Core interfaces for ChatGPT-style memory
export interface MemoryChunk {
  id: string;
  content: string;
  created_at: Date;
  conversation_id: string;
  user_id: string;
  chunk_type: 'user_message' | 'assistant_message' | 'system_info' | 'correction' | 'preference';
  importance_score: number;
  entities: ExtractedEntity[];
  embeddings: {
    semantic: number[];
    entity: number[];
    intent: number[];
  };
  metadata: {
    turn_number: number;
    speaker: 'user' | 'assistant' | 'system';
    intent: string;
    sentiment: number;
    has_corrections: boolean;
    references_past: boolean;
    topic_tags: string[];
  };
}

// ExtractedEntity is now imported from entityExtractor.ts

export interface UserMemory {
  user_id: string;
  name?: string;
  preferences: Record<string, any>;
  communication_style: {
    formality: 'formal' | 'casual' | 'mixed';
    detail_preference: 'brief' | 'detailed' | 'mixed';
    interaction_patterns: string[];
  };
  long_term_context: {
    work_domain?: string;
    projects: string[];
    interests: string[];
    expertise_areas: string[];
  };
  corrections_history: {
    created_at: Date;
    old_value: string;
    new_value: string;
    context: string;
  }[];
  last_updated: Date;
}

export interface ConversationSummary {
  conversation_id: string;
  user_id: string;
  start_time: Date;
  last_activity: Date;
  message_count: number;
  topic_summary: string;
  key_entities: ExtractedEntity[];
  important_moments: {
    created_at: Date;
    content: string;
    importance_reason: string;
  }[];
  resolution_status: 'ongoing' | 'resolved' | 'paused';
}

/**
 * ChatGPT-style Multi-Layered Memory System
 * 
 * Layer 1: Context Window (recent messages + high importance)
 * Layer 2: Session Memory (current conversation RAG)
 * Layer 3: Long-term Memory (cross-conversation user memory)
 */
export class ChatGPTMemoryManager {
  private embeddingService: EmbeddingService;
  private entityExtractor: EntityExtractor;
  private importanceScorer: ImportanceScorer;
  private contextOptimizer: ContextOptimizer;

  // Context window management
  private contextWindowSize = 30000; // tokens
  private criticalInfoReserve = 0.15; // 15% for critical info
  private recentMessageReserve = 0.20; // 20% for recent messages
  private ragReserve = 0.40; // 40% for RAG results
  private userMemoryReserve = 0.20; // 20% for user memory
  private bufferReserve = 0.05; // 5% buffer

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.entityExtractor = new EntityExtractor();
    this.importanceScorer = new ImportanceScorer();
    this.contextOptimizer = new ContextOptimizer();
  }

  /**
   * Main entry point: Get context for a new user query
   */
  async getContextForQuery(
    userQuery: string,
    conversationId: string,
    userId: string,
    workspaceId: string
  ): Promise<{
    context: string;
    sources: string[];
    tokenCount: number;
  }> {
    console.log(`[ChatGPTMemory] Building context for query: "${userQuery.substring(0, 50)}..."`);

    // Layer 1: Recent conversation context
    const recentContext = await this.getRecentConversationContext(
      conversationId,
      this.contextWindowSize * this.recentMessageReserve
    );

    // Layer 2: RAG search within current conversation
    const conversationRAG = await this.searchConversationMemory(
      userQuery,
      conversationId,
      workspaceId,
      this.contextWindowSize * this.ragReserve
    );

    // Layer 3: Long-term user memory
    const userMemory = await this.searchUserMemory(
      userQuery,
      userId,
      this.contextWindowSize * this.userMemoryReserve
    );

    // Layer 4: Critical information (always include)
    const criticalInfo = await this.getCriticalInformation(
      conversationId,
      userId,
      this.contextWindowSize * this.criticalInfoReserve
    );

    // Transform to ContextLayer format
    const recentLayer: ContextLayer = { ...recentContext, priority: 0.7, layer: 'recent' };
    const ragLayer: ContextLayer = { ...conversationRAG, priority: 0.8, layer: 'rag' };
    const userLayer: ContextLayer = { ...userMemory, priority: 0.6, layer: 'user_memory' };
    const criticalLayer: ContextLayer = { ...criticalInfo, priority: 0.9, layer: 'critical' };

    // Optimize and combine all context layers
    const optimizedContext = await this.contextOptimizer.optimizeContextWindow({
      recentContext: recentLayer,
      conversationRAG: ragLayer,
      userMemory: userLayer,
      criticalInfo: criticalLayer,
      totalBudget: this.contextWindowSize * (1 - this.bufferReserve)
    });

    console.log(`[ChatGPTMemory] Context assembled: ${optimizedContext.tokenCount} tokens from ${optimizedContext.sources.length} sources`);

    return {
      context: optimizedContext.content,
      sources: optimizedContext.sources,
      tokenCount: optimizedContext.tokenCount
    };
  }

  /**
   * Store a new message with full processing
   */
  async storeMessage(
    content: string,
    conversationId: string,
    userId: string,
    workspaceId: string,
    speaker: 'user' | 'assistant',
    turnNumber: number
  ): Promise<MemoryChunk> {
    console.log(`[ChatGPTMemory] Processing new ${speaker} message for storage`);

    // Extract entities
    const entities = await this.entityExtractor.extract(content);
    
    // Calculate importance
    const importanceScore = await this.importanceScorer.score(content, entities, conversationId);
    
    // Generate multi-type embeddings with error handling
    let semanticEmbedding: number[];
    let entityEmbedding: number[];
    let intentEmbedding: number[];
    
    try {
      semanticEmbedding = await this.embeddingService.generateEmbedding(content);
    } catch (error) {
      console.warn('[ChatGPTMemory] Semantic embedding failed, using placeholder:', error);
      semanticEmbedding = new Array(1536).fill(0);
    }
    
    entityEmbedding = await this.generateEntityEmbedding(entities);
    intentEmbedding = await this.generateIntentEmbedding(content);

    // Detect corrections and preferences
    const hasCorrections = await this.detectCorrections(content, conversationId);
    const preferences = await this.extractPreferences(content);
    
    // Create memory chunk
    const chunk: MemoryChunk = {
      id: `${conversationId}_${turnNumber}_${Date.now()}`,
      content,
      created_at: new Date(),
      conversation_id: conversationId,
      user_id: userId,
      chunk_type: this.classifyChunkType(content, speaker, hasCorrections),
      importance_score: importanceScore,
      entities,
      embeddings: {
        semantic: semanticEmbedding,
        entity: entityEmbedding,
        intent: intentEmbedding
      },
      metadata: {
        turn_number: turnNumber,
        speaker,
        intent: await this.classifyIntent(content),
        sentiment: await this.analyzeSentiment(content),
        has_corrections: hasCorrections,
        references_past: await this.detectPastReferences(content),
        topic_tags: await this.extractTopicTags(content)
      }
    };

    // Store in database
    await this.storeMemoryChunk(chunk, workspaceId);

    // Update user memory if needed
    if (speaker === 'user') {
      await this.updateUserMemory(userId, chunk, preferences);
    }

    // Handle corrections
    if (hasCorrections) {
      await this.processCorrections(chunk, conversationId);
    }

    console.log(`[ChatGPTMemory] Stored chunk with importance ${importanceScore}, ${entities.length} entities`);
    return chunk;
  }

  /**
   * Get recent conversation context with smart filtering
   */
  private async getRecentConversationContext(
    conversationId: string,
    tokenBudget: number
  ): Promise<{content: string; sources: string[]; tokenCount: number}> {
    // Get recent messages, prioritizing high-importance ones
    const { data: recentChunks } = await supabase
      .from('memory_chunks')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!recentChunks) return { content: '', sources: [], tokenCount: 0 };

    // Sort by importance and recency combined
    const rankedChunks = recentChunks
      .sort((a, b) => {
        const timeWeight = 0.3;
        const importanceWeight = 0.7;
        
        const aScore = (a.importance_score * importanceWeight) + 
                      (this.getRecencyScore(a.created_at) * timeWeight);
        const bScore = (b.importance_score * importanceWeight) + 
                      (this.getRecencyScore(b.created_at) * timeWeight);
        
        return bScore - aScore;
      });

    // Build context within token budget
    let context = '';
    let tokenCount = 0;
    const sources: string[] = [];

    for (const chunk of rankedChunks) {
      const chunkTokens = this.estimateTokenCount(chunk.content);
      if (tokenCount + chunkTokens > tokenBudget) break;

      context += `[${chunk.metadata.speaker}]: ${chunk.content}\n`;
      sources.push(chunk.id);
      tokenCount += chunkTokens;
    }

    return { content: context.trim(), sources, tokenCount };
  }

  /**
   * Search conversation memory using multi-signal RAG
   */
  private async searchConversationMemory(
    query: string,
    conversationId: string,
    workspaceId: string,
    tokenBudget: number
  ): Promise<{content: string; sources: string[]; tokenCount: number}> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const queryEntities = await this.entityExtractor.extract(query);

    // Multi-signal search
    const searchResults = await this.multiSignalSearch({
      query,
      queryEmbedding,
      queryEntities,
      conversationId,
      workspaceId,
      searchTypes: ['semantic', 'entity', 'importance', 'temporal'],
      limit: 20
    });

    // Build context from results
    let context = '';
    let tokenCount = 0;
    const sources: string[] = [];

    for (const result of searchResults) {
      const chunkTokens = this.estimateTokenCount(result.content);
      if (tokenCount + chunkTokens > tokenBudget) break;

      context += `${result.content}\n`;
      sources.push(result.id);
      tokenCount += chunkTokens;
    }

    return { content: context.trim(), sources, tokenCount };
  }

  /**
   * Search long-term user memory across conversations
   */
  private async searchUserMemory(
    query: string,
    userId: string,
    tokenBudget: number
  ): Promise<{content: string; sources: string[]; tokenCount: number}> {
    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!userProfile) return { content: '', sources: [], tokenCount: 0 };

    let context = '';
    let tokenCount = 0;
    const sources: string[] = [];

    // Add relevant user information
    if (userProfile.name) {
      const nameContext = `User's name: ${userProfile.name}`;
      const nameTokens = this.estimateTokenCount(nameContext);
      if (tokenCount + nameTokens <= tokenBudget) {
        context += nameContext + '\n';
        tokenCount += nameTokens;
        sources.push('user_profile_name');
      }
    }

    // Add relevant preferences
    const relevantPrefs = this.findRelevantPreferences(query, userProfile.preferences);
    for (const pref of relevantPrefs) {
      const prefContext = `User preference: ${pref}`;
      const prefTokens = this.estimateTokenCount(prefContext);
      if (tokenCount + prefTokens > tokenBudget) break;
      
      context += prefContext + '\n';
      tokenCount += prefTokens;
      sources.push('user_preferences');
    }

    return { content: context.trim(), sources, tokenCount };
  }

  /**
   * Get critical information that should always be included
   */
  private async getCriticalInformation(
    conversationId: string,
    userId: string,
    tokenBudget: number
  ): Promise<{content: string; sources: string[]; tokenCount: number}> {
    // Get high-importance chunks from current conversation
    const { data: criticalChunks } = await supabase
      .from('memory_chunks')
      .select('*')
      .eq('conversation_id', conversationId)
      .gte('importance_score', 0.8)
      .order('importance_score', { ascending: false });

    let context = '';
    let tokenCount = 0;
    const sources: string[] = [];

    for (const chunk of (criticalChunks || [])) {
      const chunkTokens = this.estimateTokenCount(chunk.content);
      if (tokenCount + chunkTokens > tokenBudget) break;

      context += `[Critical]: ${chunk.content}\n`;
      sources.push(chunk.id);
      tokenCount += chunkTokens;
    }

    return { content: context.trim(), sources, tokenCount };
  }

  // Helper methods
  private getRecencyScore(created_at: string): number {
    const messageTime = new Date(created_at);
    const now = new Date();
    const hoursAgo = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);
    return Math.exp(-hoursAgo / 24); // Exponential decay
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  private async storeMemoryChunk(chunk: MemoryChunk, workspaceId: string): Promise<void> {
    try {
      // Validate embeddings are arrays with numbers
      const validateEmbedding = (embedding: number[], name: string) => {
        if (!Array.isArray(embedding) || embedding.length === 0) {
          console.warn(`[ChatGPTMemory] Invalid ${name} embedding, using placeholder`);
          return new Array(1536).fill(0);
        }
        return embedding.map(n => Number.isFinite(n) ? n : 0);
      };

      const semanticEmbedding = validateEmbedding(chunk.embeddings.semantic, 'semantic');
      const entityEmbedding = validateEmbedding(chunk.embeddings.entity, 'entity');
      const intentEmbedding = validateEmbedding(chunk.embeddings.intent, 'intent');

      const { error } = await supabase
        .from('memory_chunks')
        .insert({
          id: chunk.id,
          content: chunk.content,
          created_at: chunk.created_at.toISOString(),
          conversation_id: chunk.conversation_id,
          user_id: chunk.user_id,
          workspace_id: workspaceId,
          chunk_type: chunk.chunk_type,
          importance_score: chunk.importance_score,
          entities: chunk.entities || [],
          semantic_embedding: `[${semanticEmbedding.join(',')}]`,
          entity_embedding: `[${entityEmbedding.join(',')}]`,
          intent_embedding: `[${intentEmbedding.join(',')}]`,
          metadata: chunk.metadata || {}
        });

      if (error) {
        throw new Error(`Failed to store memory chunk: ${error.message}`);
      }
    } catch (error) {
      console.error('[ChatGPTMemory] Error storing memory chunk:', error);
      throw error;
    }
  }

  // Placeholder methods - will implement these next
  private classifyChunkType(content: string, speaker: string, hasCorrections: boolean): MemoryChunk['chunk_type'] {
    if (hasCorrections) return 'correction';
    if (this.isPreference(content)) return 'preference';
    return speaker === 'user' ? 'user_message' : 'assistant_message';
  }

  private isPreference(content: string): boolean {
    const preferencePatterns = ['I prefer', 'I like', 'I don\'t like', 'I hate', 'My favorite'];
    return preferencePatterns.some(pattern => content.toLowerCase().includes(pattern.toLowerCase()));
  }

  private async multiSignalSearch(params: {
    query: string;
    queryEmbedding: number[];
    queryEntities: ExtractedEntity[];
    conversationId: string;
    workspaceId: string;
    searchTypes: string[];
    limit: number;
  }): Promise<any[]> {
    try {
      // Fallback: Use simple text search instead of database function until schema is deployed
      console.log('[ChatGPTMemory] Using fallback text search (database function not deployed)');
      
      const { data, error } = await supabase
        .from('memory_chunks')
        .select('*')
        .eq('conversation_id', params.conversationId)
        .eq('workspace_id', params.workspaceId)
        .order('importance_score', { ascending: false })
        .limit(params.limit);

      if (error) {
        console.error('[ChatGPTMemory] Fallback search failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[ChatGPTMemory] Multi-signal search failed:', error);
      return [];
    }
  }

  private findRelevantPreferences(query: string, preferences: any): string[] {
    if (!preferences || typeof preferences !== 'object') return [];

    const queryLower = query.toLowerCase();
    const relevantPrefs: string[] = [];

    for (const [key, value] of Object.entries(preferences)) {
      // Check if query mentions this preference category
      if (queryLower.includes(key.toLowerCase()) || 
          (typeof value === 'string' && queryLower.includes(value.toString().toLowerCase()))) {
        relevantPrefs.push(`${key}: ${value}`);
      }
    }

    return relevantPrefs;
  }

  private async generateEntityEmbedding(entities: ExtractedEntity[]): Promise<number[]> {
    try {
      const entityText = entities.map(e => e.text).join(' ');
      if (!entityText) return new Array(1536).fill(0);
      return await this.embeddingService.generateEmbedding(entityText);
    } catch (error) {
      console.warn('[ChatGPTMemory] Entity embedding failed, using placeholder:', error);
      return new Array(1536).fill(0);
    }
  }

  private async generateIntentEmbedding(content: string): Promise<number[]> {
    try {
      const intent = await this.classifyIntent(content);
      return await this.embeddingService.generateEmbedding(intent);
    } catch (error) {
      console.warn('[ChatGPTMemory] Intent embedding failed, using placeholder:', error);
      return new Array(1536).fill(0);
    }
  }

  private async classifyIntent(content: string): Promise<string> {
    // Simple intent classification - will enhance
    if (content.includes('?')) return 'question';
    if (content.toLowerCase().includes('my name is')) return 'identity_sharing';
    return 'statement';
  }

  private async analyzeSentiment(content: string): Promise<number> {
    // Simple sentiment - will enhance  
    const positiveWords = ['good', 'great', 'excellent', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'hate', 'dislike', 'awful'];
    
    const positive = positiveWords.filter(word => content.toLowerCase().includes(word)).length;
    const negative = negativeWords.filter(word => content.toLowerCase().includes(word)).length;
    
    return (positive - negative) / Math.max(positive + negative, 1);
  }

  private async detectCorrections(content: string, conversationId: string): Promise<boolean> {
    const correctionPatterns = ['actually', 'correction', 'i meant', 'no, i said', 'that\'s wrong'];
    return correctionPatterns.some(pattern => content.toLowerCase().includes(pattern));
  }

  private async extractPreferences(content: string): Promise<Record<string, any>> {
    // Extract preferences - will enhance
    return {};
  }

  private async detectPastReferences(content: string): Promise<boolean> {
    const pastPatterns = ['earlier', 'before', 'previously', 'you said', 'we discussed'];
    return pastPatterns.some(pattern => content.toLowerCase().includes(pattern));
  }

  private async extractTopicTags(content: string): Promise<string[]> {
    // Extract topic tags - will enhance
    return [];
  }

  private async updateUserMemory(userId: string, chunk: MemoryChunk, preferences: Record<string, any>): Promise<void> {
    // Update user memory - will implement
  }

  private async processCorrections(chunk: MemoryChunk, conversationId: string): Promise<void> {
    // Process corrections - will implement
  }
}

// Note: Actual implementations already imported at top of file