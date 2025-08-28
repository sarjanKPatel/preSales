import { ExtractedEntity } from './entityExtractor';

export interface ContextLayer {
  content: string;
  sources: string[];
  tokenCount: number;
  priority: number;
  layer: 'recent' | 'rag' | 'user_memory' | 'critical';
}

export interface OptimizationResult {
  content: string;
  sources: string[];
  tokenCount: number;
  layers: {
    recent: number;
    rag: number; 
    userMemory: number;
    critical: number;
  };
  optimizations: string[];
}

export interface ContextOptimizationInput {
  recentContext: ContextLayer;
  conversationRAG: ContextLayer;
  userMemory: ContextLayer;
  criticalInfo: ContextLayer;
  totalBudget: number;
}

/**
 * Context Window Optimizer - ChatGPT Style
 * Intelligently manages context window by prioritizing and compressing information
 */
export class ContextOptimizer {
  private readonly tokenEstimationRatio = 4; // ~4 characters per token

  /**
   * Main optimization method - combines and optimizes all context layers
   */
  async optimizeContextWindow(input: ContextOptimizationInput): Promise<OptimizationResult> {
    console.log(`[ContextOptimizer] Optimizing context with ${input.totalBudget} token budget`);

    const optimizations: string[] = [];
    let layers = [input.recentContext, input.conversationRAG, input.userMemory, input.criticalInfo];

    // Step 1: Remove empty layers
    layers = layers.filter(layer => layer.content && layer.tokenCount > 0);
    if (layers.length < 4) optimizations.push('Removed empty layers');

    // Step 2: Calculate current total
    const currentTotal = layers.reduce((sum, layer) => sum + layer.tokenCount, 0);

    console.log(`[ContextOptimizer] Current total: ${currentTotal} tokens, Budget: ${input.totalBudget}`);

    // Step 3: If within budget, return as-is
    if (currentTotal <= input.totalBudget) {
      return this.buildOptimizationResult(layers, optimizations);
    }

    // Step 4: Apply optimization strategies
    const optimizedLayers = await this.applyOptimizationStrategies(layers, input.totalBudget, optimizations);

    // Step 5: Final assembly
    const result = this.buildOptimizationResult(optimizedLayers, optimizations);
    
    console.log(`[ContextOptimizer] Optimized to ${result.tokenCount} tokens with strategies: ${optimizations.join(', ')}`);
    
    return result;
  }

  /**
   * Apply various optimization strategies to fit within budget
   */
  private async applyOptimizationStrategies(
    layers: ContextLayer[],
    budget: number,
    optimizations: string[]
  ): Promise<ContextLayer[]> {
    let currentLayers = [...layers];
    let currentTotal = currentLayers.reduce((sum, layer) => sum + layer.tokenCount, 0);

    // Strategy 1: Prioritize critical information
    if (currentTotal > budget) {
      currentLayers = await this.prioritizeCriticalInfo(currentLayers, budget, optimizations);
      currentTotal = currentLayers.reduce((sum, layer) => sum + layer.tokenCount, 0);
    }

    // Strategy 2: Compress RAG results (keep only most relevant)
    if (currentTotal > budget) {
      currentLayers = await this.compressRAGResults(currentLayers, budget, optimizations);
      currentTotal = currentLayers.reduce((sum, layer) => sum + layer.tokenCount, 0);
    }

    // Strategy 3: Summarize recent context (compress middle messages)
    if (currentTotal > budget) {
      currentLayers = await this.compressRecentContext(currentLayers, budget, optimizations);
      currentTotal = currentLayers.reduce((sum, layer) => sum + layer.tokenCount, 0);
    }

    // Strategy 4: Semantic deduplication
    if (currentTotal > budget) {
      currentLayers = await this.deduplicateContent(currentLayers, optimizations);
      currentTotal = currentLayers.reduce((sum, layer) => sum + layer.tokenCount, 0);
    }

    // Strategy 5: Proportional reduction (last resort)
    if (currentTotal > budget) {
      currentLayers = await this.proportionalReduction(currentLayers, budget, optimizations);
    }

    return currentLayers;
  }

  /**
   * Strategy 1: Ensure critical information is preserved
   */
  private async prioritizeCriticalInfo(
    layers: ContextLayer[],
    budget: number,
    optimizations: string[]
  ): Promise<ContextLayer[]> {
    const criticalLayer = layers.find(l => l.layer === 'critical');
    if (!criticalLayer || criticalLayer.tokenCount === 0) return layers;

    // Reserve space for critical info
    const criticalBudget = Math.min(criticalLayer.tokenCount, budget * 0.2); // Max 20% for critical
    const remainingBudget = budget - criticalBudget;

    // Adjust other layers proportionally
    const otherLayers = layers.filter(l => l.layer !== 'critical');
    const otherTotal = otherLayers.reduce((sum, layer) => sum + layer.tokenCount, 0);

    if (otherTotal > remainingBudget) {
      const reductionRatio = remainingBudget / otherTotal;
      
      const adjustedLayers = otherLayers.map(layer => ({
        ...layer,
        content: this.truncateContent(layer.content, Math.floor(layer.tokenCount * reductionRatio)),
        tokenCount: Math.floor(layer.tokenCount * reductionRatio)
      }));

      optimizations.push(`Prioritized critical info (${criticalBudget} tokens reserved)`);
      return [criticalLayer, ...adjustedLayers];
    }

    return layers;
  }

  /**
   * Strategy 2: Compress RAG results by keeping only top matches
   */
  private async compressRAGResults(
    layers: ContextLayer[],
    budget: number,
    optimizations: string[]
  ): Promise<ContextLayer[]> {
    const ragLayer = layers.find(l => l.layer === 'rag');
    if (!ragLayer || ragLayer.tokenCount === 0) return layers;

    // Parse RAG results and keep only top 50%
    const ragLines = ragLayer.content.split('\n').filter(line => line.trim());
    const topHalf = ragLines.slice(0, Math.ceil(ragLines.length / 2));
    
    const compressedContent = topHalf.join('\n');
    const compressedTokens = this.estimateTokenCount(compressedContent);

    if (compressedTokens < ragLayer.tokenCount) {
      optimizations.push(`Compressed RAG results (${ragLayer.tokenCount} → ${compressedTokens} tokens)`);
      
      const updatedLayers = layers.map(layer => 
        layer.layer === 'rag' 
          ? { ...layer, content: compressedContent, tokenCount: compressedTokens }
          : layer
      );
      
      return updatedLayers;
    }

    return layers;
  }

  /**
   * Strategy 3: Compress recent context by summarizing middle messages
   */
  private async compressRecentContext(
    layers: ContextLayer[],
    budget: number,
    optimizations: string[]
  ): Promise<ContextLayer[]> {
    const recentLayer = layers.find(l => l.layer === 'recent');
    if (!recentLayer || recentLayer.tokenCount === 0) return layers;

    // Split into messages
    const messages = recentLayer.content.split('\n[').filter(msg => msg.trim());
    
    if (messages.length <= 6) return layers; // Don't compress if already short

    // Keep first 2 and last 2 messages, summarize the middle
    const firstTwo = messages.slice(0, 2);
    const lastTwo = messages.slice(-2);
    const middle = messages.slice(2, -2);

    if (middle.length === 0) return layers;

    // Create summary of middle messages
    const middleSummary = `[Summary: ${middle.length} messages about general conversation]`;
    
    const compressedMessages = [...firstTwo, middleSummary, ...lastTwo];
    const compressedContent = compressedMessages.join('\n');
    const compressedTokens = this.estimateTokenCount(compressedContent);

    if (compressedTokens < recentLayer.tokenCount) {
      optimizations.push(`Compressed recent context (${messages.length} → ${compressedMessages.length} messages)`);
      
      const updatedLayers = layers.map(layer => 
        layer.layer === 'recent'
          ? { ...layer, content: compressedContent, tokenCount: compressedTokens }
          : layer
      );
      
      return updatedLayers;
    }

    return layers;
  }

  /**
   * Strategy 4: Remove duplicate or highly similar content
   */
  private async deduplicateContent(
    layers: ContextLayer[],
    optimizations: string[]
  ): Promise<ContextLayer[]> {
    // Simple deduplication - remove exact duplicates
    const seenContent = new Set<string>();
    const deduplicatedLayers: ContextLayer[] = [];

    for (const layer of layers) {
      const lines = layer.content.split('\n').filter(line => line.trim());
      const uniqueLines = lines.filter(line => {
        const normalized = line.toLowerCase().trim();
        if (seenContent.has(normalized)) return false;
        seenContent.add(normalized);
        return true;
      });

      if (uniqueLines.length < lines.length) {
        const newContent = uniqueLines.join('\n');
        const newTokenCount = this.estimateTokenCount(newContent);
        
        deduplicatedLayers.push({
          ...layer,
          content: newContent,
          tokenCount: newTokenCount
        });
        
        optimizations.push(`Deduplicated ${layer.layer} layer (${lines.length} → ${uniqueLines.length} lines)`);
      } else {
        deduplicatedLayers.push(layer);
      }
    }

    return deduplicatedLayers;
  }

  /**
   * Strategy 5: Proportional reduction (last resort)
   */
  private async proportionalReduction(
    layers: ContextLayer[],
    budget: number,
    optimizations: string[]
  ): Promise<ContextLayer[]> {
    const currentTotal = layers.reduce((sum, layer) => sum + layer.tokenCount, 0);
    const reductionRatio = budget / currentTotal;

    const reducedLayers = layers.map(layer => {
      const newTokenCount = Math.floor(layer.tokenCount * reductionRatio);
      const newContent = this.truncateContent(layer.content, newTokenCount);
      
      return {
        ...layer,
        content: newContent,
        tokenCount: newTokenCount
      };
    });

    optimizations.push(`Applied proportional reduction (${(reductionRatio * 100).toFixed(1)}% of original)`);
    
    return reducedLayers;
  }

  /**
   * Truncate content to fit within token budget
   */
  private truncateContent(content: string, maxTokens: number): string {
    const maxChars = maxTokens * this.tokenEstimationRatio;
    
    if (content.length <= maxChars) return content;

    // Try to truncate at sentence boundaries
    const sentences = content.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length > maxChars) break;
      truncated += sentence + '.';
    }

    // If no complete sentences fit, truncate at word boundary
    if (truncated.length === 0) {
      const words = content.split(' ');
      while (words.length > 0 && words.join(' ').length > maxChars) {
        words.pop();
      }
      truncated = words.join(' ') + '...';
    }

    return truncated;
  }

  /**
   * Estimate token count from text
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / this.tokenEstimationRatio);
  }

  /**
   * Build final optimization result
   */
  private buildOptimizationResult(layers: ContextLayer[], optimizations: string[]): OptimizationResult {
    const layerCounts = {
      recent: 0,
      rag: 0,
      userMemory: 0,
      critical: 0
    };

    let fullContent = '';
    let allSources: string[] = [];
    let totalTokens = 0;

    // Assemble layers in priority order
    const priorityOrder: ContextLayer['layer'][] = ['critical', 'recent', 'user_memory', 'rag'];
    
    for (const layerType of priorityOrder) {
      const layer = layers.find(l => l.layer === layerType);
      if (layer && layer.content) {
        if (fullContent) fullContent += '\n\n';
        fullContent += `=== ${layerType.toUpperCase()} CONTEXT ===\n${layer.content}`;
        
        allSources = allSources.concat(layer.sources);
        totalTokens += layer.tokenCount;
        // Map layer types to layerCounts property names
        const layerKey = layerType === 'user_memory' ? 'userMemory' : layerType;
        layerCounts[layerKey as keyof typeof layerCounts] = layer.tokenCount;
      }
    }

    return {
      content: fullContent,
      sources: [...new Set(allSources)], // Remove duplicates
      tokenCount: totalTokens,
      layers: layerCounts,
      optimizations
    };
  }

  /**
   * Analyze context distribution
   */
  analyzeContextDistribution(result: OptimizationResult): {
    percentages: Record<string, number>;
    recommendations: string[];
  } {
    const total = result.tokenCount;
    const percentages = {
      critical: (result.layers.critical / total) * 100,
      recent: (result.layers.recent / total) * 100,
      userMemory: (result.layers.userMemory / total) * 100,
      rag: (result.layers.rag / total) * 100
    };

    const recommendations: string[] = [];

    // Check for imbalanced distributions
    if (percentages.critical > 30) {
      recommendations.push('High critical info usage - consider reviewing importance scoring');
    }
    if (percentages.recent < 15) {
      recommendations.push('Low recent context - may lose conversation flow');
    }
    if (percentages.rag > 50) {
      recommendations.push('High RAG usage - consider improving search relevance');
    }
    if (percentages.userMemory === 0) {
      recommendations.push('No user memory included - missing personalization');
    }

    return { percentages, recommendations };
  }

  /**
   * Create context summary for debugging
   */
  createContextSummary(result: OptimizationResult): string {
    const summary = [
      `Context Summary (${result.tokenCount} tokens):`,
      `• Critical: ${result.layers.critical} tokens (${((result.layers.critical / result.tokenCount) * 100).toFixed(1)}%)`,
      `• Recent: ${result.layers.recent} tokens (${((result.layers.recent / result.tokenCount) * 100).toFixed(1)}%)`,
      `• User Memory: ${result.layers.userMemory} tokens (${((result.layers.userMemory / result.tokenCount) * 100).toFixed(1)}%)`,
      `• RAG: ${result.layers.rag} tokens (${((result.layers.rag / result.tokenCount) * 100).toFixed(1)}%)`,
      `• Sources: ${result.sources.length}`,
      `• Optimizations: ${result.optimizations.join(', ') || 'None'}`
    ].join('\n');

    return summary;
  }
}