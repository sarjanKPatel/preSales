import { AgentContext, AgentMessage, StreamResponse } from '../types';
import { ContextLoader } from './memory/context';
import { LLMProviderManager } from './llm/provider';
import { toolRegistry } from './tools';
import { metrics, trackError, createTimer } from './observability/tracing';
import { IntentType, IntentClassifierInput } from './types/intent';
import { VectorStore } from './rag/vectorStore';

export interface TurnConfig {
  sessionId: string;
  userMessage: string;
  userId?: string;
  workspaceId?: string;
  visionId?: string;
  maxRetries?: number;
  budgetTokens?: number;
  uiAction?: {
    type: 'skip' | 'approve' | 'finalize' | 'add_more' | 'custom';
    fieldName?: string;
    metadata?: any;
  };
}

export interface TurnHandlerDependencies {
  contextLoader: ContextLoader;
  llmProvider: LLMProviderManager;
  vectorStore?: VectorStore;
}

export class TurnHandler {
  private deps: TurnHandlerDependencies;
  private vectorStore: VectorStore;

  constructor(dependencies: TurnHandlerDependencies) {
    this.deps = dependencies;
    this.vectorStore = dependencies.vectorStore || new VectorStore();
  }

  async *handleTurn(config: TurnConfig): AsyncGenerator<StreamResponse> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer = createTimer();
    
    try {
      // Validate required fields
      if (!config.visionId || !config.workspaceId) {
        throw new Error('visionId and workspaceId are required');
      }

      // Step 1: Load context
      yield { type: 'metadata', metadata: { step: 'loading_context', runId } };
      const context = await this.loadContext(config);
      
      // Index vision in RAG if not already indexed
      if (context.vision_state) {
        await this.ensureVisionIndexed(config.visionId!, context.vision_state, config.workspaceId!);
      }
      
      // Add user message to context
      const userMessage: AgentMessage = {
        role: 'user',
        content: config.userMessage,
        metadata: config.uiAction ? { uiAction: config.uiAction } : undefined
      };
      context.messages.push(userMessage);

      // Step 2: Classify intent using AI
      yield { type: 'metadata', metadata: { step: 'classifying_intent' } };
      const intent = await this.classifyIntent(config, context);
      
      console.log('[HandleTurn] Classified intent:', {
        type: intent.intent,
        confidence: intent.confidence,
        subIntent: intent.subIntent,
        entities: intent.entities,
        reasoning: intent.reasoning
      });

      // Step 3: Route based on intent
      yield { type: 'metadata', metadata: { step: `routing_${intent.intent.toLowerCase()}` } };
      
      switch (intent.intent) {
        //(still need to be implemented)
        case IntentType.QUESTION:
          yield* this.handleQuestion(config, context, intent);
          break;
          
        case IntentType.INFORMATION:
          yield* this.handleInformation(config, context, intent);
          break;
          
        case IntentType.CLARIFICATION:
          yield* this.handleClarification(config, context, intent);
          break;
          
        case IntentType.COMMAND:
          yield* this.handleCommand(config, context, intent);
          break;
          
        case IntentType.UI_ACTION:
          yield* this.handleUIAction(config, context, intent);
          break;
          
        case IntentType.GREETING:
          yield* this.handleGreeting(config, context, intent);
          break;
          
        case IntentType.UNKNOWN:
        default:
          yield* this.handleUnknown(config, context, intent);
          break;
      }

      // Record metrics
      metrics.recordLatency('agent.turn.duration', timer.end());
      metrics.recordCount('agent.turn.completed');
      metrics.recordCount(`agent.intent.${intent.intent.toLowerCase()}`);

    } catch (error) {
      const duration = timer.end();
      trackError(error as Error, { 
        runId, 
        sessionId: config.sessionId,
        duration 
      });
      
      yield { 
        type: 'error', 
        error: `Turn handling failed: ${error}`,
        metadata: { runId, duration }
      };
    }
  }







  

  // Route: Handle Questions
  private async *handleQuestion(config: TurnConfig, context: AgentContext, intent: any): AsyncGenerator<StreamResponse> {
    const questionAnswering = toolRegistry.get('QuestionAnswering');
    if (!questionAnswering) {
      yield { type: 'token', content: 'Question answering is not available at the moment.' };
      yield { type: 'done' };
      return;
    }

    // Enhance with RAG
    const ragResults = await this.vectorStore.hybridSearch(
      config.userMessage,
      config.workspaceId!,
      { documentType: 'vision', limit: 3 }
    );

    console.log('[HandleTurn] RAG search results:', {
      query: config.userMessage,
      workspaceId: config.workspaceId,
      resultsCount: ragResults.length,
      results: ragResults.map(r => ({
        similarity: r.similarity,
        content: r.content.substring(0, 50) + '...',
        metadata: r.metadata
      }))
    });

    const result = await questionAnswering.execute({
      user_question: config.userMessage,
      vision_state: context.vision_state,
      rag_context: ragResults,
      intent_details: intent
    });

    if (result.success && result.data) {
      // Stream the question answer directly
      if (result.data.answer) {
        yield { type: 'token', content: result.data.answer };
        
        // Add gap-based follow-up question if available
        if (result.data.followup_question) {
          yield { type: 'token', content: `\n\n${result.data.followup_question}` };
        }
      } else {
        yield { type: 'token', content: JSON.stringify(result.data) };
      }
      yield { type: 'done' };
    } else {
      yield { type: 'token', content: "I couldn't find an answer to your question." };
      yield { type: 'done' };
    }
  }

  // Route: Handle Information
  private async *handleInformation(config: TurnConfig, context: AgentContext, intent: any): AsyncGenerator<StreamResponse> {
    const extractor = toolRegistry.get('InformationExtractor');
    if (!extractor) {
      yield { type: 'token', content: 'Information processing is not available.' };
      yield { type: 'done' };
      return;
    }

    const extractionResult = await extractor.execute({
      user_message: config.userMessage,
      current_vision: context.vision_state,
      session_context: context.messages.slice(-5).map(m => m.content),
      persistence_config: {
        vision_id: config.visionId!,
        workspace_id: config.workspaceId!,
        user_id: config.userId!,
      },
    });

    if (extractionResult.success && extractionResult.data) {
      // Update RAG index
      await this.updateRAGIndex(config.visionId!, extractionResult.data.updated_vision_state!, config.workspaceId!);
      
      // Generate dynamic response using LLM
      const dynamicGenerator = toolRegistry.get('DynamicResponseGenerator');
      if (dynamicGenerator) {
        const dynamicResult = await dynamicGenerator.execute({
          userMessage: config.userMessage,
          conversationHistory: context.messages,
          visionState: extractionResult.data.updated_vision_state,
          intent: intent,
          context: {
            sessionId: config.sessionId,
            workspaceId: config.workspaceId!,
            userId: config.userId!,
            extractionResult: extractionResult.data
          }
        });
        
        if (dynamicResult.success && dynamicResult.data) {
          yield { type: 'token', content: dynamicResult.data.response };
          
          // Ask follow-up if recommended
          if (dynamicResult.data.shouldAskFollowUp && dynamicResult.data.followUpQuestion) {
            yield { type: 'token', content: `\n\n${dynamicResult.data.followUpQuestion}` };
          }
          yield { type: 'done' };
        } else {
          // Fallback to gap detection if dynamic response fails
          yield { type: 'token', content: 'Thank you for that information. I\'ve updated your vision.' };
          yield* this.checkGapsAndGenerateQuestions(config, context, extractionResult.data.updated_vision_state!);
        }
      } else {
        // Fallback to old method if tool not available
        yield { type: 'token', content: 'Thank you for that information. I\'ve updated your vision.' };
        yield* this.checkGapsAndGenerateQuestions(config, context, extractionResult.data.updated_vision_state!);
      }
    } else {
      yield { type: 'token', content: 'I couldn\'t process that information. Could you please try again?' };
      yield { type: 'done' };
    }
  }

  // Route: Handle Clarification
  private async *handleClarification(config: TurnConfig, context: AgentContext, intent: any): AsyncGenerator<StreamResponse> {
    // Similar to information but with awareness that user is answering our questions
    yield* this.handleInformation(config, context, intent);
  }

  // Route: Handle Commands
  private async *handleCommand(config: TurnConfig, context: AgentContext, intent: any): AsyncGenerator<StreamResponse> {
    const { subIntent } = intent;
    
    switch (subIntent) {
      case 'finalize':
        const finalizer = toolRegistry.get('VisionFinalizer');
        if (finalizer) {
          const result = await finalizer.execute({
            vision_id: config.visionId!,
            vision_state: context.vision_state,
            workspace_id: config.workspaceId!
          });
          if (result.success && result.data) {
            yield { type: 'token', content: result.data.message || 'Vision finalized successfully!' };
          } else {
            yield { type: 'token', content: 'Failed to finalize vision.' };
          }
        }
        break;
        
      case 'export':
        yield { type: 'token', content: 'Export functionality will be available soon.' };
        break;
        
      default:
        yield { type: 'token', content: `Command "${subIntent}" is not yet implemented.` };
    }
    
    yield { type: 'done' };
  }

  // Route: Handle UI Actions
  private async *handleUIAction(config: TurnConfig, context: AgentContext, intent: any): AsyncGenerator<StreamResponse> {
    if (!config.uiAction) {
      yield { type: 'token', content: 'No UI action specified.' };
      yield { type: 'done' };
      return;
    }

    const uiHandler = toolRegistry.get('UIActionHandler');
    if (!uiHandler) {
      yield { type: 'token', content: 'UI action handling is not available.' };
      yield { type: 'done' };
      return;
    }

    const result = await uiHandler.execute({
      action: config.uiAction,
      vision_state: context.vision_state,
      context: context
    });

    if (result.success && result.data) {
      yield { type: 'token', content: result.data.message || 'UI action completed.' };
    } else {
      yield { type: 'token', content: 'UI action failed.' };
    }
    yield { type: 'done' };
  }

  // Route: Handle Greeting
  private async *handleGreeting(config: TurnConfig, context: AgentContext, intent: any): AsyncGenerator<StreamResponse> {
    // Generate dynamic greeting response
    const dynamicGenerator = toolRegistry.get('DynamicResponseGenerator');
    if (dynamicGenerator) {
      const dynamicResult = await dynamicGenerator.execute({
        userMessage: config.userMessage,
        conversationHistory: context.messages,
        visionState: context.vision_state,
        intent: intent,
        context: {
          sessionId: config.sessionId,
          workspaceId: config.workspaceId!,
          userId: config.userId!,
        }
      });
      
      if (dynamicResult.success && dynamicResult.data) {
        yield { type: 'token', content: dynamicResult.data.response };
        
        // Ask follow-up if recommended
        if (dynamicResult.data.shouldAskFollowUp && dynamicResult.data.followUpQuestion) {
          yield { type: 'token', content: `\n\n${dynamicResult.data.followUpQuestion}` };
        }
        yield { type: 'done' };
        return;
      }
    }

    // Fallback if dynamic generation fails
    yield { type: 'token', content: 'Hello! How can I help you with your vision today?' };
    yield { type: 'done' };
  }

  // Route: Handle Unknown
  private async *handleUnknown(config: TurnConfig, context: AgentContext, intent: any): AsyncGenerator<StreamResponse> {
    // Try to generate a dynamic response for unknown intents
    const dynamicGenerator = toolRegistry.get('DynamicResponseGenerator');
    if (dynamicGenerator) {
      const dynamicResult = await dynamicGenerator.execute({
        userMessage: config.userMessage,
        conversationHistory: context.messages,
        visionState: context.vision_state,
        intent: intent,
        context: {
          sessionId: config.sessionId,
          workspaceId: config.workspaceId!,
          userId: config.userId!,
        }
      });
      
      if (dynamicResult.success && dynamicResult.data) {
        yield { type: 'token', content: dynamicResult.data.response };
        
        // Ask follow-up if recommended
        if (dynamicResult.data.shouldAskFollowUp && dynamicResult.data.followUpQuestion) {
          yield { type: 'token', content: `\n\n${dynamicResult.data.followUpQuestion}` };
        }
        yield { type: 'done' };
        return;
      }
    }
    
    // Fallback if dynamic generation fails
    yield { 
      type: 'token', 
      content: "I'm not sure how to help with that. Could you please rephrase or ask something specific about your vision?" 
    };
    yield { type: 'done' };
  }

  // Helper: Check gaps and generate questions
  private async *checkGapsAndGenerateQuestions(config: TurnConfig, context: AgentContext, visionState: any): AsyncGenerator<StreamResponse> {
    // First use GapDetector
    const gapDetector = toolRegistry.get('GapDetector');
    if (!gapDetector) {
      yield { type: 'token', content: 'Thank you for that information.' };
      yield { type: 'done' };
      return;
    }

    const gapResult = await gapDetector.execute({
      vision_state: visionState,
      context: context.messages.slice(-5).map(m => m.content),
    });

    if (gapResult.success && gapResult.data?.gaps_found) {
      // Use gap detector questions
      if (gapResult.data.next_questions && gapResult.data.next_questions.length > 0) {
        const questionsText = gapResult.data.next_questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n');
        yield { type: 'token', content: `I need some more information:\n\n${questionsText}` };
      } else {
        yield { type: 'token', content: 'Thank you for that information!' };
      }
      yield { type: 'done' };
    } else {
      // No gaps found - check if ready to finalize
      yield* this.checkReadyToFinalize(visionState);
    }
  }

  // Helper: Check if ready to finalize
  private async *checkReadyToFinalize(visionState: any): AsyncGenerator<StreamResponse> {
    const completeness = visionState.metadata?.validation_score || 0;
    
    if (completeness >= 80) {
      yield { 
        type: 'token', 
        content: `Great! Your vision is ${completeness}% complete. Would you like to finalize it?` 
      };
    } else {
      yield { type: 'token', content: 'Thank you for that information. Your vision is taking shape!' };
    }
    yield { type: 'done' };
  }


  // Helper: Update RAG index
  private async updateRAGIndex(visionId: string, visionState: any, workspaceId: string): Promise<void> {
    try {
      await this.vectorStore.indexVision(visionId, visionState, workspaceId);
      console.log('[HandleTurn] RAG index updated');
    } catch (error) {
      console.error('[HandleTurn] Failed to update RAG:', error);
    }
  }

  // Helper: Ensure vision is indexed in RAG
  private async ensureVisionIndexed(visionId: string, visionState: any, workspaceId: string): Promise<void> {
    try {
      // Check if vision has meaningful content to index
      const hasContent = visionState.company_name || 
                        visionState.vision_statement || 
                        visionState.industry ||
                        visionState.strategic_priorities?.length > 0;
      
      if (hasContent) {
        // Index the vision (vectorStore will handle deduplication)
        await this.vectorStore.indexVision(visionId, visionState, workspaceId);
        console.log('[HandleTurn] Vision indexed in RAG');
      }
    } catch (error) {
      console.error('[HandleTurn] Failed to index vision:', error);
      // Don't throw - RAG indexing failure shouldn't break the flow
    }
  }

  // Helper: Load context
  private async loadContext(config: TurnConfig): Promise<AgentContext> {
    return await this.deps.contextLoader.loadVisionContext(
      config.visionId!,
      config.sessionId,
      config.workspaceId!,
      config.userId
    );
  }

  // Helper: Classify intent
  private async classifyIntent(config: TurnConfig, context: AgentContext) {
    const classifier = toolRegistry.get('IntentClassifier');
    if (!classifier) {
      throw new Error('IntentClassifier tool not found');
    }

    const visionContext = context.vision_state ? {
      has_company_name: !!context.vision_state.company_name,
      has_industry: !!context.vision_state.industry,
      has_vision_statement: !!context.vision_state.vision_statement,
      completeness_score: context.vision_state.metadata?.validation_score || 0,
      last_agent_message: this.getLastAgentMessage(context.messages),
    } : undefined;

    const conversationHistory = context.messages
      .slice(-5)
      .map(m => `${m.role}: ${m.content}`);

    const input: IntentClassifierInput = {
      user_message: config.userMessage,
      conversation_history: conversationHistory,
      vision_context: visionContext,
      ui_context: config.uiAction ? {
        buttons_shown: ['skip', 'approve', 'finalize'],
        awaiting_response: true
      } : undefined
    };

    const result = await classifier.execute(input);
    
    if (!result.success || !result.data) {
      throw new Error('Intent classification failed');
    }

    return result.data;
  }

  private getLastAgentMessage(messages: AgentMessage[]): string | undefined {
    const lastAgentMsg = messages
      .slice()
      .reverse()
      .find(m => m.role === 'assistant');
    
    return lastAgentMsg?.content;
  }
}