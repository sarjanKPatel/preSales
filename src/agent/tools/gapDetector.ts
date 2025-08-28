import { Tool, GapDetectorInput, GapDetectorOutput } from './types';
import { ToolResult, GapAnalysis, VisionState } from '../../types';

// Field categorization for multi-dimensional analysis
interface FieldCategory {
  critical: Array<{ field: string; weight: number; label: string }>;
  important: Array<{ field: string; weight: number; label: string }>;
  enhancement: Array<{ field: string; weight: number; label: string }>;
  metrics: Array<{ field: string; weight: number; label: string }>;
}

interface SmartQuestion {
  question: string;
  target_fields: string[];
  priority: 'high' | 'medium' | 'low';
  context_trigger?: string;
  follow_up_type: 'clarification' | 'expansion' | 'validation';
  industry_specific?: boolean;
}

interface GapResult {
  critical_gaps: string[];
  enhancement_opportunities: string[];
  next_questions: SmartQuestion[];
  completeness_score: number;
  suggested_focus: 'basic_info' | 'strategy' | 'metrics' | 'implementation';
  field_scores: Record<string, number>;
}

export class GapDetector implements Tool<GapDetectorInput, GapDetectorOutput> {
  name = 'GapDetector';
  description = 'Multi-dimensional gap analysis with smart prioritization and context-aware questioning';

  private fieldCategories: FieldCategory = {
    critical: [
      { field: 'company_name', weight: 20, label: 'Company Name' },
      { field: 'industry', weight: 15, label: 'Industry' },
      { field: 'vision_statement', weight: 25, label: 'Vision Statement' },
    ],
    important: [
      { field: 'key_themes', weight: 10, label: 'Strategic Themes' },
      { field: 'success_metrics', weight: 10, label: 'Success Metrics' },
      { field: 'target_outcomes', weight: 8, label: 'Target Outcomes' },
      { field: 'current_strategy', weight: 7, label: 'Current Strategy' },
    ],
    enhancement: [
      { field: 'competitive_landscape', weight: 3, label: 'Competitive Analysis' },
      { field: 'market_size', weight: 3, label: 'Market Context' },
      { field: 'constraints', weight: 2, label: 'Constraints' },
      { field: 'assumptions', weight: 2, label: 'Assumptions' },
    ],
    metrics: [
      { field: 'timeline', weight: 5, label: 'Timeline' },
      { field: 'strategic_priorities', weight: 5, label: 'Strategic Priorities' },
      { field: 'company_size', weight: 3, label: 'Company Size' },
    ],
  };

  async execute(input: GapDetectorInput): Promise<ToolResult<GapDetectorOutput>> {
    try {
      const { vision_state, context = [] } = input;

      console.log('[GapDetector] Input:', {
        hasVisionState: !!vision_state,
        companyName: vision_state?.company_name,
        industry: vision_state?.industry,
        visionStatement: !!vision_state?.vision_statement,
        contextLength: context.length
      });

      // Perform multi-dimensional gap analysis
      const gapResult = this.analyzeGaps(vision_state, context);
      
      console.log('[GapDetector] Analysis result:', {
        criticalGaps: gapResult.critical_gaps,
        enhancementOpportunities: gapResult.enhancement_opportunities,
        completenessScore: gapResult.completeness_score,
        nextQuestionsCount: gapResult.next_questions.length
      });
      
      // Build legacy GapAnalysis format for backward compatibility
      const analysis: GapAnalysis = {
        missing_fields: gapResult.critical_gaps,
        weak_areas: gapResult.enhancement_opportunities,
        recommendations: this.generateRecommendations(gapResult, vision_state),
        completeness_score: gapResult.completeness_score,
        qa_history: vision_state.metadata?.gap_analysis?.qa_history ?? [],
      };

      // Convert smart questions to simple strings for output - ONLY return the top priority question
      const nextQuestions = gapResult.next_questions
        .sort((a, b) => this.getPriorityScore(a.priority) - this.getPriorityScore(b.priority))
        .slice(0, 1)
        .map(q => q.question);

      return {
        success: true,
        data: {
          gaps_found: gapResult.critical_gaps.length > 0 || gapResult.enhancement_opportunities.length > 0,
          analysis,
          next_questions: nextQuestions,
          // Extended data for advanced usage
          suggested_focus: gapResult.suggested_focus,
          field_scores: gapResult.field_scores,
          smart_questions: gapResult.next_questions,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Multi-dimensional gap analysis failed: ${String(error)}`,
      };
    }
  }

  private analyzeGaps(visionState: VisionState, context: string[]): GapResult {
    const fieldScores: Record<string, number> = {};
    const criticalGaps: string[] = [];
    const enhancementOpportunities: string[] = [];
    
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Analyze each field category
    Object.entries(this.fieldCategories).forEach(([category, fields]) => {
      fields.forEach(({ field, weight, label }: { field: string; weight: number; label: string }) => {
        maxPossibleScore += weight;
        
        const score = this.evaluateField(visionState, field, category as keyof FieldCategory);
        fieldScores[field] = score;
        totalScore += score * (weight / 100); // Normalize weight
        
        if (score === 0) {
          if (category === 'critical' || category === 'important') {
            criticalGaps.push(field);
          } else {
            enhancementOpportunities.push(field);
          }
        } else if (score < 0.5 && (category === 'critical' || category === 'important')) {
          criticalGaps.push(`${field}_weak`);
        }
      });
    });

    // Calculate completeness score (0-100)
    const completenessScore = Math.round((totalScore / maxPossibleScore) * 10000);

    // Determine suggested focus area
    const suggestedFocus = this.determineFocus(fieldScores, visionState);

    // Generate smart questions
    const nextQuestions = this.generateSmartQuestions(visionState, criticalGaps, enhancementOpportunities, context);

    return {
      critical_gaps: criticalGaps,
      enhancement_opportunities: enhancementOpportunities,
      next_questions: nextQuestions,
      completeness_score: completenessScore,
      suggested_focus: suggestedFocus,
      field_scores: fieldScores,
    };
  }

  private evaluateField(visionState: VisionState, field: string, category: keyof FieldCategory): number {
    const value = (visionState as any)[field];
    
    // Field is missing
    if (value === undefined || value === null) {
      return 0;
    }

    // Evaluate based on field type and category
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) return 0;
      
      // Quality scoring based on category and length
      if (category === 'critical') {
        if (trimmed.length < 3) return 0.2;
        if (trimmed.length < 10) return 0.5;
        if (trimmed.length < 50) return 0.8;
        return 1.0;
      } else {
        if (trimmed.length < 10) return 0.4;
        if (trimmed.length < 30) return 0.7;
        return 1.0;
      }
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return 0;
      
      // Quality scoring for arrays
      if (category === 'critical' || category === 'important') {
        if (value.length < 2) return 0.4;
        if (value.length < 3) return 0.7;
        return 1.0;
      } else {
        if (value.length < 2) return 0.6;
        return 1.0;
      }
    }
    
    if (typeof value === 'number') {
      return value > 0 ? 1.0 : 0;
    }
    
    return 1.0; // Other types considered complete if present
  }

  private determineFocus(fieldScores: Record<string, number>, visionState: VisionState): 'basic_info' | 'strategy' | 'metrics' | 'implementation' {
    const basicFields = ['company_name', 'industry'];
    const strategyFields = ['vision_statement', 'key_themes', 'current_strategy'];
    const metricsFields = ['success_metrics', 'target_outcomes', 'timeline'];
    const implementationFields = ['strategic_priorities', 'constraints', 'competitive_landscape'];

    const basicScore = this.calculateCategoryScore(fieldScores, basicFields);
    const strategyScore = this.calculateCategoryScore(fieldScores, strategyFields);
    const metricsScore = this.calculateCategoryScore(fieldScores, metricsFields);
    const implementationScore = this.calculateCategoryScore(fieldScores, implementationFields);

    // Determine focus based on completeness progression
    if (basicScore < 0.8) return 'basic_info';
    if (strategyScore < 0.7) return 'strategy';
    if (metricsScore < 0.6) return 'metrics';
    return 'implementation';
  }

  private calculateCategoryScore(fieldScores: Record<string, number>, fields: string[]): number {
    const scores = fields.map(field => fieldScores[field] || 0);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private generateSmartQuestions(
    visionState: VisionState, 
    criticalGaps: string[], 
    enhancementOpportunities: string[],
    context: string[]
  ): SmartQuestion[] {
    const questions: SmartQuestion[] = [];
    const industry = visionState.industry?.toLowerCase() || '';
    const companySize = visionState.company_size || 0;
    
    // Get skipped fields to avoid asking about them
    const skippedFields = visionState.metadata?.skipped_fields || [];

    // Priority 1: Critical gaps (but skip already skipped fields)
    criticalGaps.forEach(gap => {
      const baseField = gap.replace('_weak', ''); // Remove _weak suffix for comparison
      if (!skippedFields.includes(baseField)) {
        const question = this.getQuestionForField(gap, visionState, 'high');
        if (question) questions.push(question);
      }
    });

    // Priority 2: Industry-specific questions (filtered by skipped fields)
    if (industry) {
      const industryQuestions = this.getIndustrySpecificQuestions(industry, visionState)
        .filter(q => !q.target_fields.some(field => skippedFields.includes(field)));
      questions.push(...industryQuestions);
    }

    // Priority 3: Company size-based questions (filtered by skipped fields)
    if (companySize > 0) {
      const sizeQuestions = this.getSizeSpecificQuestions(companySize, visionState)
        .filter(q => !q.target_fields.some(field => skippedFields.includes(field)));
      questions.push(...sizeQuestions);
    }

    // Priority 4: Context-driven questions (filtered by skipped fields)
    const contextQuestions = this.getContextDrivenQuestions(context, visionState)
      .filter(q => !q.target_fields.some(field => skippedFields.includes(field)));
    questions.push(...contextQuestions);

    return questions;
  }

  private getQuestionForField(field: string, visionState: VisionState, priority: 'high' | 'medium' | 'low'): SmartQuestion | null {
    const questionMap: Record<string, SmartQuestion> = {
      company_name: {
        question: "What is your organization's name?",
        target_fields: ['company_name'],
        priority,
        follow_up_type: 'clarification',
      },
      industry: {
        question: "What industry or sector does your organization operate in?",
        target_fields: ['industry'],
        priority,
        follow_up_type: 'clarification',
      },
      vision_statement: {
        question: "What is your current vision statement, or what vision would you like to develop for your organization?",
        target_fields: ['vision_statement'],
        priority,
        follow_up_type: 'expansion',
      },
      key_themes: {
        question: "What are the main strategic themes or focus areas that will drive your organization forward?",
        target_fields: ['key_themes'],
        priority,
        follow_up_type: 'expansion',
      },
      success_metrics: {
        question: "How will you measure success? What specific metrics or KPIs are most important for tracking progress?",
        target_fields: ['success_metrics'],
        priority,
        follow_up_type: 'expansion',
      },
      target_outcomes: {
        question: "What specific outcomes or results do you want to achieve with this strategic vision?",
        target_fields: ['target_outcomes'],
        priority,
        follow_up_type: 'expansion',
      },
      timeline: {
        question: "What is your target timeframe for achieving this vision? Are there key milestones along the way?",
        target_fields: ['timeline'],
        priority,
        follow_up_type: 'clarification',
      },
      current_strategy: {
        question: "What is your organization's current strategic direction or approach?",
        target_fields: ['current_strategy'],
        priority,
        follow_up_type: 'expansion',
      },
    };

    return questionMap[field] || null;
  }

  private getIndustrySpecificQuestions(industry: string, visionState: VisionState): SmartQuestion[] {
    const questions: SmartQuestion[] = [];
    
    if (industry.includes('healthcare') || industry.includes('medical')) {
      questions.push({
        question: "What specific healthcare challenges or patient outcomes is your organization focused on improving?",
        target_fields: ['target_outcomes', 'key_themes'],
        priority: 'medium',
        follow_up_type: 'expansion',
        industry_specific: true,
      });
    }
    
    if (industry.includes('fintech') || industry.includes('financial')) {
      questions.push({
        question: "What financial services or user experiences are you looking to transform or improve?",
        target_fields: ['target_outcomes', 'current_strategy'],
        priority: 'medium',
        follow_up_type: 'expansion',
        industry_specific: true,
      });
    }
    
    if (industry.includes('tech') || industry.includes('software') || industry.includes('saas')) {
      questions.push({
        question: "What technology problems are you solving, and who is your target user base?",
        target_fields: ['target_outcomes', 'competitive_landscape'],
        priority: 'medium',
        follow_up_type: 'expansion',
        industry_specific: true,
      });
    }

    return questions;
  }

  private getSizeSpecificQuestions(companySize: number, visionState: VisionState): SmartQuestion[] {
    const questions: SmartQuestion[] = [];
    
    if (companySize >= 500) {
      questions.push({
        question: "As a larger organization, how do you plan to ensure alignment and communication of this vision across all teams and departments?",
        target_fields: ['strategic_priorities', 'constraints'],
        priority: 'medium',
        follow_up_type: 'expansion',
      });
    } else if (companySize >= 50) {
      questions.push({
        question: "What are your key growth priorities as you scale your organization?",
        target_fields: ['strategic_priorities', 'target_outcomes'],
        priority: 'medium',
        follow_up_type: 'expansion',
      });
    } else if (companySize < 50 && companySize > 0) {
      questions.push({
        question: "As a smaller organization, what are your biggest opportunities for impact and growth?",
        target_fields: ['target_outcomes', 'success_metrics'],
        priority: 'medium',
        follow_up_type: 'expansion',
      });
    }

    return questions;
  }

  private getContextDrivenQuestions(context: string[], visionState: VisionState): SmartQuestion[] {
    const questions: SmartQuestion[] = [];
    const recentContext = context.slice(-3).join(' ').toLowerCase();
    
    if (recentContext.includes('competitor') || recentContext.includes('competition')) {
      questions.push({
        question: "What sets your organization apart from competitors in your space?",
        target_fields: ['competitive_landscape', 'key_themes'],
        priority: 'low',
        follow_up_type: 'expansion',
        context_trigger: 'competition mentioned',
      });
    }
    
    if (recentContext.includes('challenge') || recentContext.includes('problem')) {
      questions.push({
        question: "What are the main constraints or challenges that might impact achieving this vision?",
        target_fields: ['constraints', 'assumptions'],
        priority: 'low',
        follow_up_type: 'clarification',
        context_trigger: 'challenges mentioned',
      });
    }

    return questions;
  }

  private generateRecommendations(gapResult: GapResult, visionState: VisionState): string[] {
    const recommendations: string[] = [];
    
    // Focus-based recommendations
    switch (gapResult.suggested_focus) {
      case 'basic_info':
        recommendations.push('Start by clearly defining your organization\'s core identity and industry context');
        break;
      case 'strategy':
        recommendations.push('Develop your strategic vision and key themes to provide clear direction');
        break;
      case 'metrics':
        recommendations.push('Define specific success metrics and target outcomes to measure progress');
        break;
      case 'implementation':
        recommendations.push('Focus on implementation details like priorities, constraints, and competitive positioning');
        break;
    }

    // Gap-specific recommendations
    if (gapResult.critical_gaps.length > 3) {
      recommendations.push('Consider focusing on the most critical gaps first to build a strong foundation');
    }
    
    if (gapResult.completeness_score < 30) {
      recommendations.push('Your vision needs significant development. Consider starting with basic company information and core strategic themes');
    } else if (gapResult.completeness_score < 70) {
      recommendations.push('Your vision foundation is good. Focus on adding specific metrics and implementation details');
    } else {
      recommendations.push('Your vision is well-developed. Consider refining details and ensuring all stakeholders are aligned');
    }

    return recommendations;
  }

  private getPriorityScore(priority: 'high' | 'medium' | 'low'): number {
    return { high: 1, medium: 2, low: 3 }[priority];
  }
}