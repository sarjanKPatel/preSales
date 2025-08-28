import { ExtractedEntity } from './entityExtractor';
import { OpenAIProvider } from '../llm/provider';
import { supabase } from '@/lib/supabase';

export interface ImportanceScoringFactors {
  entityScore: number;      // Based on extracted entities
  patternScore: number;     // Based on linguistic patterns  
  contextScore: number;     // Based on conversation context
  correctionScore: number;  // If it's a correction
  preferenceScore: number;  // If it expresses preferences
  questionScore: number;    // If it's a question (lower importance)
  referenceScore: number;   // If it references past conversation
  lengthScore: number;      // Based on message length
  userEngagementScore: number; // Based on user's communication patterns
}

export interface ScoredMessage {
  content: string;
  importanceScore: number;
  factors: ImportanceScoringFactors;
  reasoning: string;
  entities: ExtractedEntity[];
}

/**
 * Advanced Importance Scoring System
 * Determines how important a message is for future retrieval
 */
export class ImportanceScorer {
  private llmProvider: OpenAIProvider;

  // Importance weight configuration
  private weights = {
    entity: 0.25,           // 25% - Based on entity types and count
    pattern: 0.20,          // 20% - Based on linguistic patterns
    context: 0.15,          // 15% - Based on conversation context
    correction: 0.15,       // 15% - If it's a correction
    preference: 0.10,       // 10% - If it expresses preferences  
    question: -0.05,        // -5% - Questions are usually less important to remember
    reference: 0.10,        // 10% - If it references past conversation
    length: 0.05,           // 5% - Longer messages might be more important
    engagement: 0.05        // 5% - Based on user engagement patterns
  };

  // High-importance patterns
  private highImportancePatterns = [
    // Identity and personal info
    /(?:my name is|i'?m|call me|i am)\s+/gi,
    /(?:i work at|i'm employed by|my company is)/gi,
    /(?:my email is|you can reach me at)/gi,
    
    // Corrections and clarifications
    /(?:actually|correction|i meant|no,?\s*i said|that's wrong|let me correct)/gi,
    /(?:not\s+\w+,?\s*(?:but|it's|i meant))/gi,
    
    // Strong preferences
    /(?:i always|i never|i prefer|i really like|i hate|i can't stand)/gi,
    /(?:please (?:don't|never)|always remember|make sure)/gi,
    
    // Important instructions
    /(?:important|crucial|critical|essential|must remember)/gi,
    /(?:please note|for future reference|going forward)/gi,
    
    // Definitive statements
    /(?:my goal is|i want to|i need to|my objective)/gi,
    /(?:the problem is|the issue is|the main thing)/gi
  ];

  // Medium-importance patterns
  private mediumImportancePatterns = [
    // Preferences (milder)
    /(?:i like|i enjoy|i don't like|i dislike)/gi,
    /(?:i usually|i typically|i often)/gi,
    
    // Context about work/projects
    /(?:we're working on|our project|my team|our company)/gi,
    /(?:in my experience|from what i've seen)/gi,
    
    // Factual information
    /(?:the reason is|because|due to|caused by)/gi,
    /(?:located in|based in|headquarters)/gi
  ];

  // Low-importance patterns  
  private lowImportancePatterns = [
    // Simple questions
    /^(?:what|when|where|who|how|why)\s/gi,
    /(?:can you|could you|would you)/gi,
    
    // Acknowledgments
    /^(?:ok|okay|yes|no|thanks|thank you|got it)/gi,
    /(?:sounds good|looks good|makes sense)/gi,
    
    // Filler phrases
    /(?:i think|i believe|maybe|perhaps|probably)/gi,
    /(?:by the way|anyway|so|well)/gi
  ];

  constructor() {
    this.llmProvider = new OpenAIProvider();
  }

  /**
   * Main importance scoring method
   */
  async score(
    content: string, 
    entities: ExtractedEntity[], 
    conversationId: string,
    userId?: string
  ): Promise<number> {
    console.log(`[ImportanceScorer] Scoring: "${content.substring(0, 50)}..."`);

    const factors = await this.calculateAllFactors(content, entities, conversationId, userId);
    
    // Calculate weighted score
    const weightedScore = 
      (factors.entityScore * this.weights.entity) +
      (factors.patternScore * this.weights.pattern) +
      (factors.contextScore * this.weights.context) +
      (factors.correctionScore * this.weights.correction) +
      (factors.preferenceScore * this.weights.preference) +
      (factors.questionScore * this.weights.question) +
      (factors.referenceScore * this.weights.reference) +
      (factors.lengthScore * this.weights.length) +
      (factors.userEngagementScore * this.weights.engagement);

    // Normalize to 0-1 range
    const normalizedScore = Math.max(0, Math.min(1, weightedScore));

    console.log(`[ImportanceScorer] Score: ${normalizedScore.toFixed(3)} (entities: ${factors.entityScore.toFixed(2)}, patterns: ${factors.patternScore.toFixed(2)})`);

    return normalizedScore;
  }

  /**
   * Get detailed scoring breakdown
   */
  async scoreWithDetails(
    content: string,
    entities: ExtractedEntity[],
    conversationId: string,
    userId?: string
  ): Promise<ScoredMessage> {
    const factors = await this.calculateAllFactors(content, entities, conversationId, userId);
    const importanceScore = await this.score(content, entities, conversationId, userId);
    
    return {
      content,
      importanceScore,
      factors,
      reasoning: this.generateReasoningExplanation(factors),
      entities
    };
  }

  /**
   * Calculate all importance factors
   */
  private async calculateAllFactors(
    content: string,
    entities: ExtractedEntity[],
    conversationId: string,
    userId?: string
  ): Promise<ImportanceScoringFactors> {
    return {
      entityScore: this.calculateEntityScore(entities),
      patternScore: this.calculatePatternScore(content),
      contextScore: await this.calculateContextScore(content, conversationId),
      correctionScore: this.calculateCorrectionScore(content, entities),
      preferenceScore: this.calculatePreferenceScore(content, entities),
      questionScore: this.calculateQuestionScore(content),
      referenceScore: this.calculateReferenceScore(content),
      lengthScore: this.calculateLengthScore(content),
      userEngagementScore: userId ? await this.calculateEngagementScore(content, userId) : 0.5
    };
  }

  /**
   * Score based on extracted entities
   */
  private calculateEntityScore(entities: ExtractedEntity[]): number {
    if (entities.length === 0) return 0.3; // Base score

    let score = 0;
    const entityWeights = {
      'PERSON': 0.9,      // Names are very important
      'CORRECTION': 0.8,  // Corrections are very important  
      'PREFERENCE': 0.7,  // Preferences are important
      'ORG': 0.6,        // Organizations are moderately important
      'PROJECT': 0.6,    // Projects are moderately important
      'EMAIL': 0.6,      // Contact info is important
      'PHONE': 0.6,      // Contact info is important
      'PRODUCT': 0.5,    // Products are moderately important
      'DATE': 0.4,       // Dates are somewhat important
      'LOCATION': 0.3    // Locations are less important
    };

    // Calculate weighted average of entity importance
    const totalWeight = entities.reduce((sum, entity) => {
      const weight = entityWeights[entity.type] || 0.3;
      return sum + (weight * entity.confidence);
    }, 0);

    // Normalize by number of entities (diminishing returns)
    score = totalWeight / (entities.length + 1);
    
    // Bonus for multiple high-importance entities
    const highImportanceCount = entities.filter(e => 
      ['PERSON', 'CORRECTION', 'PREFERENCE'].includes(e.type) && e.confidence > 0.8
    ).length;
    
    if (highImportanceCount > 1) {
      score *= 1.2; // 20% bonus
    }

    return Math.min(1, score);
  }

  /**
   * Score based on linguistic patterns
   */
  private calculatePatternScore(content: string): number {
    const lowercaseContent = content.toLowerCase();
    
    let score = 0.3; // Base score

    // Check high-importance patterns
    const highMatches = this.highImportancePatterns.filter(pattern => {
      pattern.lastIndex = 0; // Reset regex
      return pattern.test(content);
    }).length;
    
    score += highMatches * 0.3; // Each high-importance pattern adds 0.3

    // Check medium-importance patterns  
    const mediumMatches = this.mediumImportancePatterns.filter(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    }).length;
    
    score += mediumMatches * 0.15; // Each medium-importance pattern adds 0.15

    // Penalize low-importance patterns
    const lowMatches = this.lowImportancePatterns.filter(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    }).length;
    
    score -= lowMatches * 0.1; // Each low-importance pattern subtracts 0.1

    // Bonus for emphatic language
    const emphaticWords = ['definitely', 'absolutely', 'never', 'always', 'must', 'crucial', 'important'];
    const emphaticCount = emphaticWords.filter(word => lowercaseContent.includes(word)).length;
    score += emphaticCount * 0.1;

    // Bonus for personal pronouns (more personal = more important)
    const personalPronouns = ['my', 'mine', 'myself', 'i am', "i'm"];
    const personalCount = personalPronouns.filter(pronoun => lowercaseContent.includes(pronoun)).length;
    score += personalCount * 0.05;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score based on conversation context
   */
  private async calculateContextScore(content: string, conversationId: string): Promise<number> {
    try {
      // Get recent conversation context
      const { data: recentMessages } = await supabase
        .from('memory_chunks')
        .select('content, importance_score, metadata')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (!recentMessages || recentMessages.length === 0) return 0.5;

      let contextScore = 0.5; // Base score

      // If this continues a high-importance topic
      const avgRecentImportance = recentMessages.reduce((sum, msg) => sum + (msg.importance_score || 0.5), 0) / recentMessages.length;
      
      if (avgRecentImportance > 0.7) {
        contextScore += 0.2; // Bonus for continuing important topic
      }

      // If this responds to a question
      const lastMessage = recentMessages[0];
      if (lastMessage?.content?.includes('?')) {
        contextScore += 0.15; // Bonus for answering questions
      }

      // If this elaborates on previous information
      const elaborationKeywords = ['also', 'additionally', 'furthermore', 'moreover', 'in addition'];
      if (elaborationKeywords.some(keyword => content.toLowerCase().includes(keyword))) {
        contextScore += 0.1;
      }

      return Math.min(1, contextScore);
    } catch (error) {
      console.error('[ImportanceScorer] Context scoring failed:', error);
      return 0.5;
    }
  }

  /**
   * Score for corrections
   */
  private calculateCorrectionScore(content: string, entities: ExtractedEntity[]): number {
    const correctionEntities = entities.filter(e => e.type === 'CORRECTION');
    if (correctionEntities.length > 0) return 0.9; // Corrections are very important

    // Check for correction patterns not caught by entities
    const correctionPatterns = [
      /actually/gi, /correction/gi, /i meant/gi, /that's wrong/gi, /let me correct/gi
    ];

    const hasCorrection = correctionPatterns.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    });

    return hasCorrection ? 0.8 : 0;
  }

  /**
   * Score for preferences
   */
  private calculatePreferenceScore(content: string, entities: ExtractedEntity[]): number {
    const preferenceEntities = entities.filter(e => e.type === 'PREFERENCE');
    if (preferenceEntities.length > 0) return 0.7;

    // Strong preference indicators
    const strongPreferences = ['i always', 'i never', 'i hate', 'i love', 'i really like'];
    const hasStrongPreference = strongPreferences.some(phrase => 
      content.toLowerCase().includes(phrase)
    );

    if (hasStrongPreference) return 0.7;

    // Mild preference indicators
    const mildPreferences = ['i prefer', 'i like', 'i don\'t like', 'i usually'];
    const hasMildPreference = mildPreferences.some(phrase => 
      content.toLowerCase().includes(phrase)
    );

    return hasMildPreference ? 0.5 : 0;
  }

  /**
   * Score for questions (usually less important to remember)
   */
  private calculateQuestionScore(content: string): number {
    const questionWords = ['what', 'when', 'where', 'who', 'why', 'how', 'can you', 'could you', 'would you'];
    const hasQuestion = content.includes('?') || questionWords.some(word => 
      content.toLowerCase().startsWith(word)
    );

    return hasQuestion ? -0.2 : 0; // Negative score for questions
  }

  /**
   * Score for references to past conversation
   */
  private calculateReferenceScore(content: string): number {
    const referencePatterns = [
      'you said', 'we discussed', 'earlier', 'before', 'previously', 
      'you mentioned', 'as we talked about', 'from our conversation'
    ];

    const hasReference = referencePatterns.some(phrase => 
      content.toLowerCase().includes(phrase)
    );

    return hasReference ? 0.6 : 0;
  }

  /**
   * Score based on message length
   */
  private calculateLengthScore(content: string): number {
    const length = content.length;
    
    // Optimal length is around 50-200 characters
    if (length < 10) return 0.2; // Very short messages are less important
    if (length < 50) return 0.3;
    if (length <= 200) return 0.5; // Sweet spot
    if (length <= 500) return 0.4;
    
    return 0.3; // Very long messages might be less focused
  }

  /**
   * Score based on user engagement patterns
   */
  private async calculateEngagementScore(content: string, userId: string): Promise<number> {
    try {
      // This would analyze user's typical communication patterns
      // For now, return a base score
      return 0.5;
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * Generate explanation for the importance score
   */
  private generateReasoningExplanation(factors: ImportanceScoringFactors): string {
    const reasons: string[] = [];

    if (factors.entityScore > 0.7) reasons.push('Contains important entities (names, corrections, preferences)');
    if (factors.correctionScore > 0.5) reasons.push('Contains corrections or clarifications');
    if (factors.preferenceScore > 0.5) reasons.push('Expresses user preferences');
    if (factors.patternScore > 0.6) reasons.push('Contains high-importance linguistic patterns');
    if (factors.contextScore > 0.6) reasons.push('Important within conversation context');
    if (factors.referenceScore > 0.3) reasons.push('References past conversation');
    if (factors.questionScore < -0.1) reasons.push('Question (lower importance)');

    return reasons.length > 0 ? reasons.join('; ') : 'Standard message importance';
  }

  /**
   * Batch score multiple messages
   */
  async batchScore(
    messages: Array<{
      content: string;
      entities: ExtractedEntity[];
      conversationId: string;
      userId?: string;
    }>
  ): Promise<number[]> {
    const scores = await Promise.all(
      messages.map(msg => this.score(msg.content, msg.entities, msg.conversationId, msg.userId))
    );
    
    return scores;
  }

  /**
   * Get importance threshold for filtering
   */
  getImportanceThreshold(level: 'low' | 'medium' | 'high'): number {
    switch (level) {
      case 'low': return 0.3;
      case 'medium': return 0.5;  
      case 'high': return 0.7;
      default: return 0.5;
    }
  }
}