import { OpenAIProvider } from '../llm/provider';

export interface ExtractedEntity {
  text: string;
  type: 'PERSON' | 'ORG' | 'PRODUCT' | 'DATE' | 'PREFERENCE' | 'CORRECTION' | 'LOCATION' | 'EMAIL' | 'PHONE' | 'PROJECT';
  confidence: number;
  start_char: number;
  end_char: number;
  canonical_form?: string; // Normalized version (e.g., "John" -> "John Smith")
  context?: string; // Surrounding context
}

export interface EntityExtractionConfig {
  enableLLMExtraction: boolean;
  enableRuleBasedExtraction: boolean;
  confidenceThreshold: number;
  maxEntitiesPerText: number;
}

/**
 * Advanced Entity Extraction System
 * Combines rule-based patterns with LLM-based extraction
 */
export class EntityExtractor {
  private llmProvider: OpenAIProvider;
  private config: EntityExtractionConfig;

  // Rule-based patterns for common entities
  private patterns = {
    PERSON: [
      /(?:my name is|i'?m|call me|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /(?:name:\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    ],
    EMAIL: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi
    ],
    PHONE: [
      /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g
    ],
    DATE: [
      /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g
    ],
    ORG: [
      /(?:company|organization|corp|inc|llc|ltd)\s*:?\s*([A-Z][a-zA-Z\s&]+)/gi,
      /(?:work at|working for|employed by)\s+([A-Z][a-zA-Z\s&]+)/gi
    ],
    PREFERENCE: [
      /(?:i prefer|i like|i love|my favorite|i enjoy)\s+([^.!?]+)/gi,
      /(?:i don't like|i hate|i dislike|i avoid)\s+([^.!?]+)/gi
    ],
    CORRECTION: [
      /(?:actually|correction|i meant|no,?\s*i said|that's wrong|let me correct)\s*[,:;]?\s*([^.!?]+)/gi,
      /(?:not\s+\w+,?\s*(?:but|it's|i meant))\s+([^.!?]+)/gi
    ]
  };

  constructor(config?: Partial<EntityExtractionConfig>) {
    this.llmProvider = new OpenAIProvider();
    this.config = {
      enableLLMExtraction: true,
      enableRuleBasedExtraction: true,
      confidenceThreshold: 0.7,
      maxEntitiesPerText: 20,
      ...config
    };
  }

  /**
   * Main entity extraction method
   */
  async extract(text: string): Promise<ExtractedEntity[]> {
    console.log(`[EntityExtractor] Extracting entities from: "${text.substring(0, 100)}..."`);

    let entities: ExtractedEntity[] = [];

    // Rule-based extraction (fast, reliable for common patterns)
    if (this.config.enableRuleBasedExtraction) {
      const ruleBasedEntities = await this.extractWithRules(text);
      entities = entities.concat(ruleBasedEntities);
    }

    // LLM-based extraction (powerful, handles complex cases)
    if (this.config.enableLLMExtraction) {
      const llmEntities = await this.extractWithLLM(text);
      entities = entities.concat(llmEntities);
    }

    // Deduplicate and merge overlapping entities
    const mergedEntities = this.mergeOverlappingEntities(entities);
    
    // Filter by confidence and limit
    const filteredEntities = mergedEntities
      .filter(e => e.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxEntitiesPerText);

    console.log(`[EntityExtractor] Found ${filteredEntities.length} entities: ${filteredEntities.map(e => `${e.type}:${e.text}`).join(', ')}`);
    
    return filteredEntities;
  }

  /**
   * Rule-based entity extraction using regex patterns
   */
  private async extractWithRules(text: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    for (const [entityType, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        let match;
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(text)) !== null) {
          const entityText = match[1] || match[0];
          
          // Skip very short matches for certain types
          if (this.shouldSkipShortMatch(entityType as any, entityText)) {
            continue;
          }

          entities.push({
            text: entityText.trim(),
            type: entityType as ExtractedEntity['type'],
            confidence: this.calculateRuleBasedConfidence(entityType as any, entityText, text),
            start_char: match.index,
            end_char: match.index + match[0].length,
            canonical_form: this.normalizeEntity(entityType as any, entityText),
            context: this.getContext(text, match.index, 50)
          });
        }
      }
    }

    return entities;
  }

  /**
   * LLM-based entity extraction for complex cases
   */
  private async extractWithLLM(text: string): Promise<ExtractedEntity[]> {
    try {
      const prompt = this.buildEntityExtractionPrompt(text);
      
      const response = await this.llmProvider.complete(prompt, {
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 800
      });

      return this.parseLLMEntityResponse(response.content, text);
    } catch (error) {
      console.error('[EntityExtractor] LLM extraction failed:', error);
      return [];
    }
  }

  /**
   * Build prompt for LLM entity extraction
   */
  private buildEntityExtractionPrompt(text: string): string {
    return `You are an expert entity extraction system. Extract important entities from this text with high precision.

Text: "${text}"

Extract these entity types:
- PERSON: Names of people (including the user's name)
- ORG: Companies, organizations 
- PRODUCT: Products, services, tools, software
- DATE: Dates, times, deadlines
- PREFERENCE: User preferences, likes, dislikes
- CORRECTION: Corrections or clarifications the user makes
- LOCATION: Places, addresses, cities, countries
- PROJECT: Project names, initiatives
- EMAIL: Email addresses
- PHONE: Phone numbers

For each entity found, provide:
1. The exact text span
2. Entity type
3. Confidence score (0.0-1.0)
4. Start and end character positions
5. Canonical form (normalized version if different)

**Important Guidelines:**
- Only extract entities that are clearly mentioned
- Pay special attention to names ("My name is X", "I'm X", "Call me X")
- Mark corrections carefully ("Actually, I meant X", "No, it's X")
- Identify preferences ("I prefer X", "I like Y", "I don't like Z")
- Be conservative - only high-confidence entities

Return JSON format:
{
  "entities": [
    {
      "text": "exact text from input",
      "type": "ENTITY_TYPE",
      "confidence": 0.95,
      "start_char": 10,
      "end_char": 15,
      "canonical_form": "normalized version"
    }
  ]
}`;
  }

  /**
   * Parse LLM response into entities
   */
  private parseLLMEntityResponse(response: string, originalText: string): ExtractedEntity[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      const entities: ExtractedEntity[] = [];

      for (const entity of parsed.entities || []) {
        // Validate entity structure
        if (!entity.text || !entity.type || typeof entity.confidence !== 'number') {
          continue;
        }

        // Verify text positions if provided
        if (entity.start_char !== undefined && entity.end_char !== undefined) {
          const extractedText = originalText.substring(entity.start_char, entity.end_char);
          if (extractedText.toLowerCase() !== entity.text.toLowerCase()) {
            // Position mismatch, try to find correct position
            const correctIndex = originalText.toLowerCase().indexOf(entity.text.toLowerCase());
            if (correctIndex !== -1) {
              entity.start_char = correctIndex;
              entity.end_char = correctIndex + entity.text.length;
            }
          }
        }

        entities.push({
          text: entity.text,
          type: entity.type,
          confidence: Math.min(1.0, Math.max(0.0, entity.confidence)),
          start_char: entity.start_char || 0,
          end_char: entity.end_char || entity.text.length,
          canonical_form: entity.canonical_form || this.normalizeEntity(entity.type, entity.text),
          context: this.getContext(originalText, entity.start_char || 0, 50)
        });
      }

      return entities;
    } catch (error) {
      console.error('[EntityExtractor] Failed to parse LLM response:', error);
      return [];
    }
  }

  /**
   * Merge overlapping entities, keeping the highest confidence
   */
  private mergeOverlappingEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const merged: ExtractedEntity[] = [];
    const sorted = entities.sort((a, b) => a.start_char - b.start_char);

    for (const entity of sorted) {
      const overlapping = merged.find(m => 
        this.entitiesOverlap(entity, m) && 
        (entity.type === m.type || this.areCompatibleTypes(entity.type, m.type))
      );

      if (overlapping) {
        // Keep the higher confidence entity
        if (entity.confidence > overlapping.confidence) {
          const index = merged.indexOf(overlapping);
          merged[index] = entity;
        }
      } else {
        merged.push(entity);
      }
    }

    return merged;
  }

  /**
   * Check if two entities overlap
   */
  private entitiesOverlap(a: ExtractedEntity, b: ExtractedEntity): boolean {
    return !(a.end_char <= b.start_char || b.end_char <= a.start_char);
  }

  /**
   * Check if entity types are compatible for merging
   */
  private areCompatibleTypes(typeA: ExtractedEntity['type'], typeB: ExtractedEntity['type']): boolean {
    const compatibleGroups = [
      ['PERSON'],
      ['ORG', 'PRODUCT'],
      ['DATE'],
      ['PREFERENCE', 'CORRECTION'],
      ['EMAIL', 'PHONE']
    ];

    return compatibleGroups.some(group => group.includes(typeA) && group.includes(typeB));
  }

  /**
   * Calculate confidence for rule-based matches
   */
  private calculateRuleBasedConfidence(
    entityType: ExtractedEntity['type'], 
    entityText: string, 
    fullText: string
  ): number {
    let confidence = 0.7; // Base confidence

    // Boost confidence for certain patterns
    if (entityType === 'PERSON' && fullText.toLowerCase().includes('my name is')) {
      confidence = 0.95;
    } else if (entityType === 'EMAIL' && entityText.includes('@')) {
      confidence = 0.9;
    } else if (entityType === 'CORRECTION' && fullText.toLowerCase().includes('actually')) {
      confidence = 0.85;
    }

    // Reduce confidence for very short entities
    if (entityText.length <= 2) {
      confidence *= 0.5;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Normalize entity to canonical form
   */
  private normalizeEntity(entityType: ExtractedEntity['type'], text: string): string {
    switch (entityType) {
      case 'PERSON':
        // Capitalize first letters
        return text.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      
      case 'EMAIL':
        return text.toLowerCase();
      
      case 'ORG':
        // Capitalize important words
        return text.split(' ').map(word => 
          ['and', 'or', 'the', 'of', 'in', 'at'].includes(word.toLowerCase()) 
            ? word.toLowerCase() 
            : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      
      default:
        return text;
    }
  }

  /**
   * Get surrounding context for an entity
   */
  private getContext(text: string, position: number, contextLength: number): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    return text.substring(start, end);
  }

  /**
   * Check if short matches should be skipped
   */
  private shouldSkipShortMatch(entityType: ExtractedEntity['type'], text: string): boolean {
    if (entityType === 'PERSON' && text.length <= 1) return true;
    if (entityType === 'ORG' && text.length <= 2) return true;
    return false;
  }

  /**
   * Extract entities of a specific type
   */
  async extractSpecificType(text: string, entityType: ExtractedEntity['type']): Promise<ExtractedEntity[]> {
    const allEntities = await this.extract(text);
    return allEntities.filter(e => e.type === entityType);
  }

  /**
   * Check if text contains corrections
   */
  async hasCorrections(text: string): Promise<boolean> {
    const corrections = await this.extractSpecificType(text, 'CORRECTION');
    return corrections.length > 0;
  }

  /**
   * Extract user's name from text
   */
  async extractUserName(text: string): Promise<string | null> {
    const people = await this.extractSpecificType(text, 'PERSON');
    
    // Look for name introduction patterns
    const nameIntroPatterns = [
      /(?:my name is|i'?m|call me|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];

    for (const pattern of nameIntroPatterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback to first person entity with high confidence
    const highConfidencePerson = people.find(p => p.confidence >= 0.8);
    return highConfidencePerson?.canonical_form || null;
  }
}