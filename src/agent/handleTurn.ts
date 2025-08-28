import { AgentContext, AgentMessage, StreamResponse } from '../types';
import { LLMProviderManager } from './llm/provider';
import { toolRegistry } from './tools';
import { metrics, trackError, createTimer } from './observability/tracing';
import { IntentType, IntentClassifierInput } from './types/intent';
import { ChatGPTMemoryManager } from './memory/chatGPTMemory';
// Removed supabase import - using ChatGPT memory system instead

export interface TurnConfig {
  sessionId: string;
  userMessage: string;
  userId: string;      // Required for ChatGPT memory
  workspaceId: string; // Required for ChatGPT memory
  visionId?: string;
  maxRetries?: number;
  budgetTokens?: number;
  uiAction?: {
    type: 'skip' | 'approve' | 'add_more' | 'custom';
    fieldName?: string;
    metadata?: any;
  };
}

export interface TurnHandlerDependencies {
  llmProvider: LLMProviderManager;
  memoryManager?: ChatGPTMemoryManager;
  contextLoader: any; // Add context loader for backward compatibility
}

export class TurnHandler {
  private deps: TurnHandlerDependencies;
  private memoryManager: ChatGPTMemoryManager;
  private conversationTurnCounter = new Map<string, number>();

  constructor(dependencies: TurnHandlerDependencies) {
    this.deps = dependencies;
    this.memoryManager = dependencies.memoryManager || new ChatGPTMemoryManager();
  }

  async *handleTurn(config: TurnConfig): AsyncGenerator<StreamResponse> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer = createTimer();
    
    try {
      // Validate required fields
      if (!config.userId || !config.workspaceId) {
        throw new Error('userId and workspaceId are required for ChatGPT memory system');
      }

      const conversationId = config.sessionId;
      const turnNumber = this.getTurnNumber(conversationId);

      // Step 1: Store user message in ChatGPT memory system
      yield { type: 'metadata', metadata: { step: 'storing_user_message', runId } };
      console.log('[TurnHandler] Storing user message in ChatGPT memory system');
      
      await this.memoryManager.storeMessage(
        config.userMessage,
        conversationId,
        config.userId,
        config.workspaceId,
        'user',
        turnNumber
      );

      // Step 2: Get optimized context using multi-layered memory
      yield { type: 'metadata', metadata: { step: 'building_chatgpt_context', runId } };
      console.log('[TurnHandler] Building ChatGPT-style context');
      
      const contextResult = await this.memoryManager.getContextForQuery(
        config.userMessage,
        conversationId,
        config.userId,
        config.workspaceId
      );

      console.log(`[TurnHandler] ChatGPT context built: ${contextResult.tokenCount} tokens from ${contextResult.sources.length} sources`);

      // Step 3: Classify intent with memory context
      yield { type: 'metadata', metadata: { step: 'classifying_intent' } };
      const intent = await this.classifyIntentWithMemory(config, contextResult.context);
      
      console.log('[HandleTurn] Classified intent:', {
        type: intent.intent,
        confidence: intent.confidence,
        subIntent: intent.subIntent,
        entities: intent.entities,
        reasoning: intent.reasoning
      });

      // Step 4: Route based on intent with ChatGPT memory context
      yield { type: 'metadata', metadata: { step: `routing_${intent.intent.toLowerCase()}` } };
      
      switch (intent.intent) {
        case IntentType.QUESTION:
          yield* this.handleQuestion(config, contextResult, intent, turnNumber);
          break;
          
        case IntentType.INFORMATION:
          yield* this.handleInformation(config, contextResult, intent, turnNumber);
          break;
          
        case IntentType.CLARIFICATION:
          yield* this.handleClarification(config, contextResult, intent, turnNumber);
          break;
          
        case IntentType.COMMAND:
          yield* this.handleCommand(config, contextResult, intent, turnNumber);
          break;
          
        case IntentType.UI_ACTION:
          yield* this.handleUIAction(config, contextResult, intent, turnNumber);
          break;
          
        case IntentType.GREETING:
          yield* this.handleGreeting(config, contextResult, intent, turnNumber);
          break;
          
        case IntentType.UNKNOWN:
        default:
          yield* this.handleUnknown(config, contextResult, intent, turnNumber);
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







  

  // Route: Handle Questions with ChatGPT Memory
  private async *handleQuestion(
    config: TurnConfig, 
    contextResult: any, 
    intent: any,
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    const questionAnswering = toolRegistry.get('QuestionAnswering');
    if (!questionAnswering) {
      yield { type: 'token', content: 'Question answering is not available at the moment. {fallback from QuestionAnswering tool}' };
      yield { type: 'done' };
      return;
    }

    console.log('[TurnHandler] Using ChatGPT memory context for question answering');

    // Load current vision state for accurate answers
    const context = await this.loadContext(config);

    // Use the ChatGPT memory-optimized context directly
    const result = await questionAnswering.execute({
      user_question: config.userMessage,
      memory_context: contextResult.context, // Rich multi-layered context
      context_sources: contextResult.sources,
      intent_details: intent,
      vision_state: context.vision_state // Add current vision state
    });

    if (result.success && result.data) {
      // Stream the question answer directly
      let assistantResponse = '';
      if (result.data.answer) {
        assistantResponse = result.data.answer;
        yield { type: 'token', content: result.data.answer };
        
        // Add gap-based follow-up question if available
        if (result.data.followup_question) {
          assistantResponse += `\n\n${result.data.followup_question}`;
          yield { type: 'token', content: `\n\n${result.data.followup_question}` };
          
          // Generate UI buttons for the follow-up question
          const fieldName = this.extractFieldNameFromQuestion(result.data.followup_question);
          if (fieldName) {
            console.log('[HandleQuestion] Generating UI button for followup field:', fieldName);
            yield this.generateUIButtons('after_question', fieldName);
          } else {
            console.warn('[HandleQuestion] No field name found for followup question:', result.data.followup_question);
          }
        }
      } else {
        assistantResponse = JSON.stringify(result.data);
        yield { type: 'token', content: assistantResponse };
      }
      
      // Store assistant response in ChatGPT memory
      await this.memoryManager.storeMessage(
        assistantResponse,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
      
      yield { type: 'done' };
    } else {
      const errorResponse = "I couldn't find an answer to your question.";
      yield { type: 'token', content: errorResponse };
      
      // Store error response in memory
      await this.memoryManager.storeMessage(
        errorResponse,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
      
      yield { type: 'done' };
    }
  }

  // Route: Handle Information with ChatGPT Memory
  private async *handleInformation(
    config: TurnConfig, 
    contextResult: any, 
    intent: any, 
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    const extractor = toolRegistry.get('InformationExtractor');
    if (!extractor) {
      const errorResponse = 'Information processing is not available. {fallback from InformationExtractor tool}';
      yield { type: 'token', content: errorResponse };
      
      // Store error in memory
      await this.memoryManager.storeMessage(
        errorResponse,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
      
      yield { type: 'done' };
      return;
    }

    // Load vision context using traditional context loader for now
    const context = await this.loadContext(config);
    
    const extractionResult = await extractor.execute({
      user_message: config.userMessage,
      current_vision: context.vision_state,
      session_context: [contextResult.context], // Use ChatGPT memory context
      persistence_config: {
        vision_id: config.visionId!,
        workspace_id: config.workspaceId!,
        user_id: config.userId!,
      },
    });

    if (extractionResult.success && extractionResult.data) {
      // Generate dynamic response using LLM with ChatGPT memory context
      const dynamicGenerator = toolRegistry.get('DynamicResponseGenerator');
      let assistantResponse = '';
      
      if (dynamicGenerator) {
        const dynamicResult = await dynamicGenerator.execute({
          userMessage: config.userMessage,
          conversationHistory: [{ role: 'system', content: contextResult.context }], // Use ChatGPT memory
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
          assistantResponse = dynamicResult.data.response;
          yield { type: 'token', content: dynamicResult.data.response };
          
          // Ask follow-up if recommended
          if (dynamicResult.data.shouldAskFollowUp && dynamicResult.data.followUpQuestion) {
            assistantResponse += `\n\n${dynamicResult.data.followUpQuestion}`;
            yield { type: 'token', content: `\n\n${dynamicResult.data.followUpQuestion}` };
            
            // Add skip button for follow-up question
            const fieldName = this.extractFieldNameFromQuestion(dynamicResult.data.followUpQuestion);
            if (fieldName) {
              console.log('[HandleInformation] Generating UI button for followup field:', fieldName);
              yield this.generateUIButtons('after_question', fieldName);
            } else {
              console.warn('[HandleInformation] No field name found for followup question:', dynamicResult.data.followUpQuestion);
            }
          } else {
            // Add "add more details" button when no follow-up is generated
            yield this.generateUIButtons('after_information');
          }
        } else {
          // Fallback response
          assistantResponse = 'Thank you for that information. I\'ve updated your vision. {fallback from DynamicResponseGenerator in handleInformation}';
          yield { type: 'token', content: assistantResponse };
          yield* this.checkGapsAndGenerateQuestions(config, context, extractionResult.data.updated_vision_state!, turnNumber);
        }
      } else {
        // Fallback if tool not available
        assistantResponse = 'Thank you for that information. I\'ve updated your vision. {fallback from DynamicResponseGenerator not available in handleInformation}';
        yield { type: 'token', content: assistantResponse };
        yield* this.checkGapsAndGenerateQuestions(config, context, extractionResult.data.updated_vision_state!, turnNumber);
      }
      
      // Store assistant response in ChatGPT memory
      await this.memoryManager.storeMessage(
        assistantResponse,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
      
      yield { type: 'done' };
    } else {
      const errorResponse = 'I couldn\'t process that information. Could you please try again?';
      yield { type: 'token', content: errorResponse };
      
      // Store error in memory
      await this.memoryManager.storeMessage(
        errorResponse,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
      
      yield { type: 'done' };
    }
  }

  // Route: Handle Clarification with ChatGPT Memory
  private async *handleClarification(
    config: TurnConfig, 
    contextResult: any, 
    intent: any, 
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    // Similar to information but with awareness that user is answering our questions
    yield* this.handleInformation(config, contextResult, intent, turnNumber);
  }

  // Route: Handle Commands with ChatGPT Memory
  private async *handleCommand(
    config: TurnConfig, 
    contextResult: any, 
    intent: any, 
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    const { subIntent } = intent;
    let assistantResponse = '';
    
    // Load vision context for commands that need it
    const context = await this.loadContext(config);
    
    console.log('[HandleCommand] Routing command with subIntent:', subIntent);
    
    switch (subIntent) {
      case 'focus_on_vision':
        console.log('[HandleCommand] Routing to handleFocusOnVision');
        yield* this.handleFocusOnVision(config, context, contextResult, turnNumber);
        return;
        
      case 'summarize':
        console.log('[HandleCommand] Routing to handleSummarize');
        yield* this.handleSummarize(config, context, turnNumber);
        return;
        
      case 'update_vision':
        console.log('[HandleCommand] Routing to handleUpdateVision');
        yield* this.handleUpdateVision(config, context, contextResult, intent, turnNumber);
        return;
        
        
      case 'export':
        assistantResponse = 'Export functionality will be available soon.';
        yield { type: 'token', content: assistantResponse };
        break;
        
      default:
        assistantResponse = `Command "${subIntent}" is not yet implemented.`;
        yield { type: 'token', content: assistantResponse };
    }
    
    // Store assistant response in ChatGPT memory
    await this.memoryManager.storeMessage(
      assistantResponse,
      config.sessionId,
      config.userId,
      config.workspaceId,
      'assistant',
      turnNumber
    );
    
    yield { type: 'done' };
  }

  // Route: Handle UI Actions with ChatGPT Memory
  private async *handleUIAction(
    config: TurnConfig, 
    contextResult: any, 
    intent: any, 
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    if (!config.uiAction) {
      const errorResponse = 'No UI action specified.';
      yield { type: 'token', content: errorResponse };
      
      // Store error in memory
      await this.memoryManager.storeMessage(
        errorResponse,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
      
      yield { type: 'done' };
      return;
    }

    const uiHandler = toolRegistry.get('UIActionHandler');
    if (!uiHandler) {
      const errorResponse = 'UI action handling is not available. {fallback from UIActionHandler tool}';
      yield { type: 'token', content: errorResponse };
      
      // Store error in memory
      await this.memoryManager.storeMessage(
        errorResponse,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
      
      yield { type: 'done' };
      return;
    }

    // Load vision context for UI actions
    let context = await this.loadContext(config);
    
    console.log('[HandleTurn] About to call UIActionHandler with vision state:', {
      actionType: config.uiAction.type,
      fieldName: config.uiAction.fieldName,
      currentSkippedFields: context.vision_state?.metadata?.skipped_fields,
      hasMetadata: !!context.vision_state?.metadata
    });
    
    const result = await uiHandler.execute({
      action: config.uiAction,
      vision_state: context.vision_state,
      context: context
    });

    let assistantResponse = '';
    if (result.success && result.data) {
      assistantResponse = result.data.response || 'UI action completed.';
      yield { type: 'token', content: assistantResponse };

      // Persist state updates to database if they exist
      if (result.data.state_updates && config.visionId) {
        console.log('[HandleTurn] UI Action has state updates, persisting to database...', {
          visionId: config.visionId,
          actionType: config.uiAction.type,
          hasStateUpdates: !!result.data.state_updates
        });

        try {
          const { VisionPersistence } = await import('./persistence/visionPersistence');
          const visionPersistence = new VisionPersistence();

          // Properly merge current vision state with updates (including nested metadata)
          const updatedVisionState = {
            ...context.vision_state,
            ...result.data.state_updates,
            metadata: {
              ...context.vision_state?.metadata,
              ...result.data.state_updates?.metadata
            }
          };

          const persistResult = await visionPersistence.updateVisionAtomic({
            visionId: config.visionId,
            visionState: updatedVisionState,
            workspaceId: config.workspaceId,
            userId: config.userId,
          });

          if (persistResult.success) {
            console.log(`[HandleTurn] ✅ UI Action state updates persisted successfully - Completeness: ${persistResult.completenessScore}%`);
            
            // CRITICAL FIX: Refresh context after database update to prevent stale state
            console.log('[HandleTurn] Refreshing context after UI action database update...');
            context = await this.loadContext(config);
            console.log('[HandleTurn] Context refreshed with updated skipped fields:', context.vision_state?.metadata?.skipped_fields);
            
            // If the UIActionHandler returned UI actions, regenerate them with fresh context to ensure
            // they don't ask questions about newly skipped fields
            if (result.data.ui_actions) {
              console.log('[HandleTurn] Regenerating UI actions with fresh context to avoid stale state questions...');
              const gapDetector = toolRegistry.get('GapDetector');
              if (gapDetector) {
                const gapResult = await gapDetector.execute({
                  vision_state: context.vision_state, // Use fresh context
                  context: []
                });
                
                if (gapResult.success && gapResult.data?.next_questions && gapResult.data.next_questions.length > 0) {
                  const nextQuestion = gapResult.data.next_questions[0];
                  const smartQuestions = gapResult.data.smart_questions;
                  
                  if (smartQuestions && smartQuestions.length > 0) {
                    const targetField = smartQuestions[0].target_fields?.[0];
                    if (targetField) {
                      // Update the assistant response with fresh question
                      const baseResponse = result.data.response.split('\n\n')[0];
                      assistantResponse = baseResponse + `\n\n${nextQuestion}`;
                      
                      // Update UI actions with fresh field
                      result.data.ui_actions = {
                        type: 'buttons',
                        context: 'after_question',
                        actions: [{
                          id: `skip_${targetField}_${Date.now()}`,
                          label: 'Skip this question',
                          action_type: 'skip',
                          field_name: targetField,
                          variant: 'outline'
                        }]
                      };
                      
                      console.log('[HandleTurn] Updated assistant response and UI actions with fresh target field:', targetField);
                      console.log('[HandleTurn] Fresh assistant response:', assistantResponse);
                    }
                  }
                }
              }
            }
          } else {
            console.error('[HandleTurn] ❌ Failed to persist UI action state updates:', persistResult.error);
          }
        } catch (persistError) {
          console.error('[HandleTurn] ❌ UI Action persistence exception:', persistError);
        }
      } else {
        console.log('[HandleTurn] No state updates to persist for UI action:', config.uiAction.type);
      }
    } else {
      assistantResponse = 'UI action failed.';
      yield { type: 'token', content: assistantResponse };
    }
    
    // Store assistant response in ChatGPT memory
    await this.memoryManager.storeMessage(
      assistantResponse,
      config.sessionId,
      config.userId,
      config.workspaceId,
      'assistant',
      turnNumber
    );
    
    // Yield UI actions if the UIActionHandler provided them (may have been updated with fresh context)
    if (result.success && result.data && result.data.ui_actions) {
      console.log('[HandleTurn] UI Action returned UI actions, yielding:', result.data.ui_actions);
      yield {
        type: 'ui_actions',
        ui_actions: result.data.ui_actions
      };
    }
    
    yield { type: 'done' };
  }

  // Route: Handle Greeting with ChatGPT Memory
  private async *handleGreeting(
    config: TurnConfig, 
    contextResult: any, 
    intent: any, 
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    // Generate dynamic greeting response with ChatGPT memory context
    const dynamicGenerator = toolRegistry.get('DynamicResponseGenerator');
    let assistantResponse = '';
    
    if (dynamicGenerator) {
      // Load vision context for greetings that might need it
      const context = await this.loadContext(config);
      
      const dynamicResult = await dynamicGenerator.execute({
        userMessage: config.userMessage,
        conversationHistory: [{ role: 'system', content: contextResult.content }], // Use ChatGPT memory
        visionState: context.vision_state,
        intent: intent,
        context: {
          sessionId: config.sessionId,
          workspaceId: config.workspaceId!,
          userId: config.userId!,
        }
      });
      
      if (dynamicResult.success && dynamicResult.data) {
        assistantResponse = dynamicResult.data.response;
        yield { type: 'token', content: dynamicResult.data.response };
        
        // Ask follow-up if recommended
        if (dynamicResult.data.shouldAskFollowUp && dynamicResult.data.followUpQuestion) {
          assistantResponse += `\n\n${dynamicResult.data.followUpQuestion}`;
          yield { type: 'token', content: `\n\n${dynamicResult.data.followUpQuestion}` };
        }
        
        // Store response in memory
        await this.memoryManager.storeMessage(
          assistantResponse,
          config.sessionId,
          config.userId,
          config.workspaceId,
          'assistant',
          turnNumber
        );
        
        yield { type: 'done' };
        return;
      }
    }

    // Fallback if dynamic generation fails
    assistantResponse = 'Hello! How can I help you with your vision today? {fallback from DynamicResponseGenerator in handleGreeting}';
    yield { type: 'token', content: assistantResponse };
    
    // Store fallback response in memory
    await this.memoryManager.storeMessage(
      assistantResponse,
      config.sessionId,
      config.userId,
      config.workspaceId,
      'assistant',
      turnNumber
    );
    
    yield { type: 'done' };
  }

  // Route: Handle Unknown with ChatGPT Memory
  private async *handleUnknown(
    config: TurnConfig, 
    contextResult: any, 
    intent: any, 
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    // Try to generate a dynamic response for unknown intents with ChatGPT memory
    const dynamicGenerator = toolRegistry.get('DynamicResponseGenerator');
    let assistantResponse = '';
    
    if (dynamicGenerator) {
      // Load vision context for unknown intents
      const context = await this.loadContext(config);
      
      const dynamicResult = await dynamicGenerator.execute({
        userMessage: config.userMessage,
        conversationHistory: [{ role: 'system', content: contextResult.content }], // Use ChatGPT memory
        visionState: context.vision_state,
        intent: intent,
        context: {
          sessionId: config.sessionId,
          workspaceId: config.workspaceId!,
          userId: config.userId!,
        }
      });
      
      if (dynamicResult.success && dynamicResult.data) {
        assistantResponse = dynamicResult.data.response;
        yield { type: 'token', content: dynamicResult.data.response };
        
        // Ask follow-up if recommended
        if (dynamicResult.data.shouldAskFollowUp && dynamicResult.data.followUpQuestion) {
          assistantResponse += `\n\n${dynamicResult.data.followUpQuestion}`;
          yield { type: 'token', content: `\n\n${dynamicResult.data.followUpQuestion}` };
        }
        
        // Store response in memory
        await this.memoryManager.storeMessage(
          assistantResponse,
          config.sessionId,
          config.userId,
          config.workspaceId,
          'assistant',
          turnNumber
        );
        
        yield { type: 'done' };
        return;
      }
    }
    
    // Fallback if dynamic generation fails
    assistantResponse = "I'm not sure how to help with that. Could you please rephrase or ask something specific about your vision? {fallback from DynamicResponseGenerator in handleUnknown}";
    yield { type: 'token', content: assistantResponse };
    
    // Store fallback response in memory
    await this.memoryManager.storeMessage(
      assistantResponse,
      config.sessionId,
      config.userId,
      config.workspaceId,
      'assistant',
      turnNumber
    );
    
    yield { type: 'done' };
  }

  // Helper: Check gaps and generate questions
  private async *checkGapsAndGenerateQuestions(
    config: TurnConfig, 
    context: any, 
    visionState: any, 
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    // First use GapDetector
    const gapDetector = toolRegistry.get('GapDetector');
    if (!gapDetector) {
      const response = 'Thank you for that information.';
      yield { type: 'token', content: response };
      
      // Store response in memory
      await this.memoryManager.storeMessage(
        response,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
      
      yield { type: 'done' };
      return;
    }

    const gapResult = await gapDetector.execute({
      vision_state: visionState,
      context: ['Recent conversation context'], // Simplified context
    });

    let gapResponse = '';
    if (gapResult.success && gapResult.data?.gaps_found) {
      // Use gap detector questions
      if (gapResult.data.next_questions && gapResult.data.next_questions.length > 0) {
        // Take the first question for simplicity
        const firstQuestion = gapResult.data.next_questions[0];
        gapResponse = `I need some more information:\n\n${firstQuestion}`;
        yield { type: 'token', content: gapResponse };
        
        // Add skip button for the question - use smart_questions data if available from GapDetector
        let fieldName: string | undefined;
        if (gapResult.data && gapResult.data.smart_questions) {
          // Try to find the smart question that matches this question text
          const smartQuestion = gapResult.data.smart_questions.find(sq => sq.question === firstQuestion);
          if (smartQuestion && smartQuestion.target_fields && smartQuestion.target_fields.length > 0) {
            fieldName = smartQuestion.target_fields[0];
            console.log('[CheckGaps] Using smart question target field:', fieldName);
          }
        }
        
        // Fallback to pattern matching
        if (!fieldName) {
          fieldName = this.extractFieldNameFromQuestion(firstQuestion);
          console.log('[CheckGaps] Using pattern matching fallback, extracted field:', fieldName);
        }
        
        console.log('[TurnHandler] Button generation debug:', {
          question: firstQuestion,
          extractedFieldName: fieldName,
          willGenerateButton: !!fieldName
        });
        if (fieldName) {
          const buttonResponse = this.generateUIButtons('after_question', fieldName);
          console.log('[TurnHandler] Generated button response:', buttonResponse);
          yield buttonResponse;
        } else {
          console.warn('[CheckGaps] No field name found for question:', firstQuestion);
        }
      } else {
        gapResponse = 'Thank you for that information!';
        yield { type: 'token', content: gapResponse };
      }
    } else {
      // No gaps found - vision is complete
      const assistantResponse = "Great! Your vision is looking comprehensive. Is there anything specific you'd like to add or refine?";
      yield { type: 'token', content: assistantResponse };
      
      // Store response in memory
      await this.memoryManager.storeMessage(
        assistantResponse,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
      
      yield { type: 'done' };
      return;
    }
    
    // Store gap response in memory
    if (gapResponse) {
      await this.memoryManager.storeMessage(
        gapResponse,
        config.sessionId,
        config.userId,
        config.workspaceId,
        'assistant',
        turnNumber
      );
    }
    
    yield { type: 'done' };
  }



  // Phase 1 Command Handlers

  // Handle focus_on_vision command
  private async *handleFocusOnVision(
    config: TurnConfig,
    context: any,
    contextResult: any,
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    console.log('[HandleCommand] Starting focus_on_vision handler', {
      sessionId: config.sessionId,
      userId: config.userId,
      visionId: config.visionId,
      completeness: context.vision_state?.metadata?.validation_score || 0
    });
    let assistantResponse = '';
    
    try {
      // 1. Analyze current vision state and gaps
      console.log('[HandleCommand] Attempting to get GapDetector tool');
      const gapDetector = toolRegistry.get('GapDetector');
      if (!gapDetector) {
        console.warn('[HandleCommand] GapDetector tool not available');
        assistantResponse = 'Let me help you work on your vision! What specific area would you like to focus on?';
        yield { type: 'token', content: assistantResponse };
        
        await this.memoryManager.storeMessage(
          assistantResponse,
          config.sessionId,
          config.userId,
          config.workspaceId,
          'assistant',
          turnNumber
        );
        
        yield { type: 'done' };
        return;
      }

      console.log('[HandleCommand] Executing GapDetector with vision state');
      const gapResult = await gapDetector.execute({
        vision_state: context.vision_state,
        context: [contextResult.context], // Use ChatGPT memory context
      });
      console.log('[HandleCommand] GapDetector result:', {
        success: gapResult.success,
        gapsFound: gapResult.data?.gaps_found,
        questionsCount: gapResult.data?.next_questions?.length || 0
      });

      if (gapResult.success && gapResult.data?.gaps_found) {
        // Generate focused response based on gaps and context
        console.log('[HandleCommand] Attempting to get DynamicResponseGenerator for focus response');
        const dynamicGenerator = toolRegistry.get('DynamicResponseGenerator');
        if (dynamicGenerator) {
          const dynamicResult = await dynamicGenerator.execute({
            userMessage: config.userMessage,
            conversationHistory: [{ role: 'system', content: contextResult.context }],
            visionState: context.vision_state,
            intent: { intent: 'command', subIntent: 'focus_on_vision' },
            context: {
              sessionId: config.sessionId,
              workspaceId: config.workspaceId!,
              userId: config.userId!,
              gaps: gapResult.data
            }
          });
          
          if (dynamicResult.success && dynamicResult.data) {
            assistantResponse = dynamicResult.data.response;
            yield { type: 'token', content: dynamicResult.data.response };
            
            // Add gap-specific questions with skip button
            if (gapResult.data.next_questions && gapResult.data.next_questions.length > 0) {
              const firstQuestion = gapResult.data.next_questions[0];
              const questionsText = `\n\n${firstQuestion}`;
              assistantResponse += questionsText;
              yield { type: 'token', content: questionsText };
              
              // Add skip button for the question - use smart_questions data for accurate field mapping
              let fieldName: string | undefined;
              if (gapResult.data.smart_questions && gapResult.data.smart_questions.length > 0) {
                // Use the target_fields from smart_questions for accurate mapping
                const smartQuestion = gapResult.data.smart_questions.find(sq => sq.question === firstQuestion);
                if (smartQuestion && smartQuestion.target_fields && smartQuestion.target_fields.length > 0) {
                  fieldName = smartQuestion.target_fields[0]; // Use the first target field
                  console.log('[HandleFocusOnVision] Using smart question target field:', fieldName);
                }
              }
              
              // Fallback to pattern matching if smart question data not available
              if (!fieldName) {
                fieldName = this.extractFieldNameFromQuestion(firstQuestion);
                console.log('[HandleFocusOnVision] Using pattern matching fallback, extracted field:', fieldName);
              }
              
              if (fieldName) {
                console.log('[HandleFocusOnVision] Generating UI button for field:', fieldName);
                yield this.generateUIButtons('after_question', fieldName);
              } else {
                console.warn('[HandleFocusOnVision] No field name found for question:', firstQuestion);
              }
            }
          } else {
            // Simple fallback if dynamic generation fails
            assistantResponse = "I'm ready to help with your vision. What would you like to focus on? {fallback from DynamicResponseGenerator in handleFocusOnVision}";
            yield { type: 'token', content: assistantResponse };
          }
        } else {
          // Simple fallback when dynamic generator not available
          assistantResponse = "I'm ready to help with your vision. What would you like to focus on? {fallback from DynamicResponseGenerator not available in handleFocusOnVision}";
          yield { type: 'token', content: assistantResponse };
        }
      } else {
        // No gaps found - vision looks comprehensive
        const completeness = context.vision_state?.metadata?.validation_score || 0;
        if (completeness >= 80) {
          assistantResponse = `Excellent! Your vision for ${context.vision_state?.company_name || 'your company'} is ${completeness}% complete. Is there anything specific you'd like to add or refine?`;
        } else {
          assistantResponse = `Your vision is coming together well! It's ${completeness}% complete. Let me ask a few more questions to strengthen it further. What's your primary success metric for this vision?`;
        }
        yield { type: 'token', content: assistantResponse };
      }
      
    } catch (error) {
      console.error('[HandleCommand] Focus on vision failed:', error);
      assistantResponse = "I'm ready to help you work on your vision! What aspect would you like to focus on - your company's mission, target market, or success metrics? {fallback from catch error in handleFocusOnVision}";
      yield { type: 'token', content: assistantResponse };
    }
    
    // Store response in memory
    await this.memoryManager.storeMessage(
      assistantResponse,
      config.sessionId,
      config.userId,
      config.workspaceId,
      'assistant',
      turnNumber
    );
    
    yield { type: 'done' };
  }

  // Handle summarize command - Use LLM to generate business summary
  private async *handleSummarize(
    config: TurnConfig,
    context: any,
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    console.log('[HandleCommand] Starting summarize handler', {
      sessionId: config.sessionId,
      userId: config.userId,
      visionId: config.visionId,
      visionStateKeys: Object.keys(context.vision_state || {})
    });
    let assistantResponse = '';
    
    try {
      const visionState = context.vision_state;
      
      // Use DynamicResponseGenerator with LLM to create intelligent summary
      console.log('[HandleCommand] Attempting to get DynamicResponseGenerator for summary');
      const dynamicGenerator = toolRegistry.get('DynamicResponseGenerator');
      if (!dynamicGenerator) {
        assistantResponse = 'Summary generation is not available right now. {fallback from DynamicResponseGenerator not available in handleSummarize}';
        yield { type: 'token', content: assistantResponse };
        
        await this.memoryManager.storeMessage(
          assistantResponse,
          config.sessionId,
          config.userId,
          config.workspaceId,
          'assistant',
          turnNumber
        );
        
        yield { type: 'done' };
        return;
      }
      
      // Create intelligent summary using LLM with full vision context
      console.log('[HandleCommand] Executing DynamicResponseGenerator for summary');
      const summaryResult = await dynamicGenerator.execute({
        userMessage: 'Please provide a comprehensive business summary of our current vision state',
        conversationHistory: [],
        visionState: visionState,
        intent: { intent: 'command', subIntent: 'summarize' },
        context: {
          sessionId: config.sessionId,
          workspaceId: config.workspaceId!,
          userId: config.userId!,
          requestType: 'business_summary',
          includeCompleteness: true,
          includeNextSteps: true
        }
      });
      
      if (summaryResult.success && summaryResult.data) {
        assistantResponse = summaryResult.data.response;
        yield { type: 'token', content: summaryResult.data.response };
      } else {
        // Fallback: basic summary if LLM fails
        const companyName = visionState?.company_name || 'your company';
        const completeness = visionState?.metadata?.validation_score || 0;
        assistantResponse = `Here's a quick summary for ${companyName}: Your vision is ${completeness}% complete. We have some foundational elements defined, but there's more work to do to fully develop your business vision. {fallback from DynamicResponseGenerator failed in handleSummarize}`;
        yield { type: 'token', content: assistantResponse };
      }
      
    } catch (error) {
      console.error('[HandleCommand] Summarize failed:', error);
      assistantResponse = "I can't generate a summary right now. Would you like to continue working on your vision instead? {fallback from catch error in handleSummarize}";
      yield { type: 'token', content: assistantResponse };
    }
    
    // Store response in memory
    await this.memoryManager.storeMessage(
      assistantResponse,
      config.sessionId,
      config.userId,
      config.workspaceId,
      'assistant',
      turnNumber
    );
    
    yield { type: 'done' };
  }

  // Handle update_vision command - Phase 2
  private async *handleUpdateVision(
    config: TurnConfig,
    context: any,
    contextResult: any,
    intent: any,
    turnNumber: number
  ): AsyncGenerator<StreamResponse> {
    console.log('[HandleCommand] Starting update_vision handler', {
      sessionId: config.sessionId,
      userId: config.userId,
      visionId: config.visionId,
      userMessage: config.userMessage,
      entities: intent.entities
    });
    let assistantResponse = '';
    
    try {
      // Step 1: Parse user intent using LLM - What do they want to change?
      console.log('[HandleCommand] Step 1: Using LLM to parse user intent for vision update');
      const updateTarget = await this.parseUpdateIntentWithLLM(config.userMessage, intent.entities, context.vision_state);
      
      if (!updateTarget.field && !updateTarget.section) {
        // Ask for clarification about which field to update
        assistantResponse = this.generateUpdateClarificationQuestion(context.vision_state);
        yield { type: 'token', content: assistantResponse };
        
        // No pending operation needed for this case - user needs to specify field first
        
        await this.memoryManager.storeMessage(
          assistantResponse,
          config.sessionId,
          config.userId,
          config.workspaceId,
          'assistant',
          turnNumber
        );
        
        yield { type: 'done' };
        return;
      }
      
      // Step 2: Identify scope - Section, field, or freeform content
      console.log('[HandleCommand] Step 2: Identified update scope:', {
        field: updateTarget.field,
        section: updateTarget.section,
        scope: updateTarget.scope
      });
      
      // Step 3: Show current value
      console.log('[HandleCommand] Step 3: Showing current value');
      const currentValue = this.getCurrentValue(context.vision_state, updateTarget);
      
      // Step 4: Collect new input using LLM (check if user provided new value)
      const newValue = await this.extractNewValueWithLLM(config.userMessage, updateTarget);
      
      if (!newValue) {
        // Ask for the new value
        assistantResponse = this.generateUpdatePrompt(updateTarget, currentValue);
        yield { type: 'token', content: assistantResponse };
        
        await this.memoryManager.storeMessage(
          assistantResponse,
          config.sessionId,
          config.userId,
          config.workspaceId,
          'assistant',
          turnNumber
        );
        
        yield { type: 'done' };
        return;
      }
      
      // Step 5: Update vision state - Persist the changes
      console.log('[HandleCommand] Step 5: Updating vision state with new value:', newValue);
      const updatedVisionState = await this.updateVisionState(
        config,
        context.vision_state,
        updateTarget,
        newValue
      );
      
      if (!updatedVisionState) {
        assistantResponse = 'I encountered an error while updating your vision. Please try again. {fallback from vision state update failed in handleUpdateVision}';
        yield { type: 'token', content: assistantResponse };
        
        await this.memoryManager.storeMessage(
          assistantResponse,
          config.sessionId,
          config.userId,
          config.workspaceId,
          'assistant',
          turnNumber
        );
        
        yield { type: 'done' };
        return;
      }
      
      // Step 6: Confirm changes
      console.log('[HandleCommand] Step 6: Confirming changes');
      assistantResponse = `Great! I've updated your ${updateTarget.displayName || updateTarget.field || updateTarget.section}.`;
      
      // Step 7: Use GapDetector to ask the next logical question
      console.log('[HandleCommand] Step 7: Using GapDetector for follow-up question');
      const gapDetector = toolRegistry.get('GapDetector');
      if (gapDetector) {
        const gapResult = await gapDetector.execute({
          vision_state: updatedVisionState,
          context: [contextResult.context],
        });
        
        console.log('[HandleCommand] GapDetector follow-up result:', {
          success: gapResult.success,
          gapsFound: gapResult.data?.gaps_found,
          questionsCount: gapResult.data?.next_questions?.length || 0
        });
        
        if (gapResult.success && gapResult.data?.gaps_found && gapResult.data.next_questions?.length > 0) {
          assistantResponse += `\n\nNow let's work on: ${gapResult.data.next_questions[0]}`;
        } else {
          assistantResponse += `\n\nWhat else would you like to work on with your vision?`;
        }
      } else {
        console.warn('[HandleCommand] GapDetector not available for follow-up');
        assistantResponse += `\n\nWhat else would you like to work on with your vision?`;
      }
      
      yield { type: 'token', content: assistantResponse };
      
    } catch (error) {
      console.error('[HandleCommand] Update vision failed:', error);
      assistantResponse = 'I encountered an error while updating your vision. Please try again. {fallback from catch error in handleUpdateVision}';
      yield { type: 'token', content: assistantResponse };
    }
    
    // Store response in memory
    await this.memoryManager.storeMessage(
      assistantResponse,
      config.sessionId,
      config.userId,
      config.workspaceId,
      'assistant',
      turnNumber
    );
    
    yield { type: 'done' };
  }



  // Helper methods for update_vision command
  
  private async parseUpdateIntentWithLLM(userMessage: string, entities: any, visionState: any): Promise<{
    field?: string;
    section?: string;
    scope: 'field' | 'section' | 'freeform';
    displayName?: string;
  }> {
    try {
      // Use specialized UpdateIntentParsingAgent
      const intentParser = toolRegistry.get('UpdateIntentParsingAgent');
      if (!intentParser) {
        console.warn('[UpdateVision] {fallback from UpdateIntentParsingAgent} not available, using pattern fallback');
        return this.parseUpdateIntentFallback(userMessage, entities, visionState);
      }

      const parseResult = await intentParser.execute({
        userMessage: userMessage,
        entities: entities,
        visionState: visionState
      });

      if (parseResult.success && parseResult.data) {
        const result = parseResult.data;
        return {
          field: result.field,
          section: result.section,
          scope: result.scope,
          displayName: result.displayName
        };
      } else {
        console.warn('[UpdateVision] {fallback from UpdateIntentParsingAgent} failed, using pattern fallback');
        return this.parseUpdateIntentFallback(userMessage, entities, visionState);
      }
      
    } catch (error) {
      console.error('[UpdateVision] {fallback from UpdateIntentParsingAgent} error:', error);
      return this.parseUpdateIntentFallback(userMessage, entities, visionState);
    }
  }
  
  private parseUpdateIntentFallback(userMessage: string, entities: any, visionState: any): {
    field?: string;
    section?: string;
    scope: 'field' | 'section' | 'freeform';
    displayName?: string;
  } {
    const message = userMessage.toLowerCase();
    
    // Basic field detection as fallback
    if (message.includes('company')) return { field: 'company_name', scope: 'field', displayName: 'company name' };
    if (message.includes('industry')) return { field: 'industry', scope: 'field', displayName: 'industry' };
    if (message.includes('vision')) return { field: 'vision_statement', scope: 'field', displayName: 'vision statement' };
    if (message.includes('target') || message.includes('market')) return { field: 'target_outcomes', scope: 'field', displayName: 'target market' };
    if (message.includes('success') || message.includes('metrics')) return { field: 'success_metrics', scope: 'field', displayName: 'success metrics' };
    if (message.includes('timeline')) return { field: 'timeline', scope: 'field', displayName: 'timeline' };
    
    return { scope: 'freeform' };
  }
  
  private getCurrentValue(visionState: any, updateTarget: any): string {
    if (updateTarget.field && visionState?.[updateTarget.field]) {
      return visionState[updateTarget.field];
    }
    if (updateTarget.section && visionState?.[updateTarget.section]) {
      return JSON.stringify(visionState[updateTarget.section]);
    }
    return 'Not yet defined';
  }
  
  private async extractNewValueWithLLM(userMessage: string, updateTarget: any): Promise<string | null> {
    try {
      // Use specialized ValueExtractionAgent
      const valueExtractor = toolRegistry.get('ValueExtractionAgent');
      if (!valueExtractor) {
        console.warn('[UpdateVision] {fallback from ValueExtractionAgent} not available, using pattern fallback');
        return this.extractNewValueFallback(userMessage, updateTarget);
      }

      const currentValue = this.getCurrentValue(null, updateTarget); // Pass null for visionState to avoid circular dependency
      
      const extractionResult = await valueExtractor.execute({
        userMessage: userMessage,
        targetField: updateTarget.field || updateTarget.section || 'unknown',
        displayName: updateTarget.displayName || updateTarget.field || 'field',
        currentValue: currentValue
      });

      if (extractionResult.success && extractionResult.data) {
        const result = extractionResult.data;
        
        if (result.hasValue && result.extractedValue) {
          console.log('[UpdateVision] ValueExtractionAgent extracted value:', result.extractedValue);
          return result.extractedValue;
        } else if (result.needsClarification) {
          console.log('[UpdateVision] ValueExtractionAgent determined value needs clarification');
          return null;
        }
      }

      console.warn('[UpdateVision] {fallback from ValueExtractionAgent} failed, using pattern fallback');
      return this.extractNewValueFallback(userMessage, updateTarget);
      
    } catch (error) {
      console.error('[UpdateVision] {fallback from ValueExtractionAgent} error:', error);
      return this.extractNewValueFallback(userMessage, updateTarget);
    }
  }
  
  private extractNewValueFallback(userMessage: string, updateTarget: any): string | null {
    console.log('[UpdateVision] {fallback from extractNewValueFallback} - using pattern matching');
    
    // Fallback to simple pattern matching
    const patterns = [
      /(?:update|change|set|modify).*(?:to|as)\s+"([^"]+)"/i,
      /(?:update|change|set|modify).*(?:to|as)\s+(.+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        // Don't return the field name itself or empty strings
        if (value && value.length > 2 && !value.toLowerCase().includes('industry')) {
          return value;
        }
      }
    }
    
    console.log('[UpdateVision] {fallback from extractNewValueFallback} - no value found in patterns');
    return null;
  }
  
  private generateUpdateClarificationQuestion(visionState: any): string {
    const availableFields = [];
    
    if (visionState?.company_name) availableFields.push('company name');
    if (visionState?.industry) availableFields.push('industry');
    if (visionState?.vision_statement) availableFields.push('vision statement');
    if (visionState?.target_outcomes) availableFields.push('target market');
    if (visionState?.success_metrics) availableFields.push('success metrics');
    if (visionState?.timeline) availableFields.push('timeline');
    
    if (availableFields.length > 0) {
      return `Which part of your vision would you like to update? You currently have: ${availableFields.join(', ')}.`;
    } else {
      return 'What aspect of your vision would you like to work on?';
    }
  }
  
  private generateUpdatePrompt(updateTarget: any, currentValue: string): string {
    const fieldName = updateTarget.displayName || updateTarget.field || updateTarget.section;
    
    if (currentValue === 'Not yet defined') {
      return `What would you like to set for your ${fieldName}?`;
    } else {
      return `Your current ${fieldName} is: "${currentValue}". What would you like to change it to?`;
    }
  }
  
  private async updateVisionState(
    config: TurnConfig,
    currentVisionState: any,
    updateTarget: any,
    newValue: string
  ): Promise<any | null> {
    try {
      // Use InformationExtractor to properly update the vision state
      const extractor = toolRegistry.get('InformationExtractor');
      if (!extractor) {
        console.error('[UpdateVision] InformationExtractor not available');
        return null;
      }
      
      // Create a message that the InformationExtractor can process
      const updateMessage = `Update ${updateTarget.displayName || updateTarget.field}: ${newValue}`;
      
      const extractionResult = await extractor.execute({
        user_message: updateMessage,
        current_vision: currentVisionState,
        session_context: [],
        persistence_config: {
          vision_id: config.visionId!,
          workspace_id: config.workspaceId!,
          user_id: config.userId!,
        },
      });
      
      if (extractionResult.success && extractionResult.data?.updated_vision_state) {
        return extractionResult.data.updated_vision_state;
      } else {
        console.error('[UpdateVision] InformationExtractor failed:', extractionResult.error);
        return null;
      }
      
    } catch (error) {
      console.error('[UpdateVision] Failed to update vision state:', error);
      return null;
    }
  }

  // TODO: Implement update_section command properly
  // Should allow users to modify specific sections of their vision
  // Will be implemented in Phase 2


  // Note: RAG indexing methods removed - using ChatGPT memory system instead

  // Helper: Load context
  private async loadContext(config: TurnConfig): Promise<AgentContext> {
    return await this.deps.contextLoader.loadVisionContext(
      config.visionId!,
      config.sessionId,
      config.workspaceId!,
      config.userId
    );
  }

  // Helper: Classify intent with ChatGPT memory context
  private async classifyIntentWithMemory(config: TurnConfig, memoryContext: string) {
    const classifier = toolRegistry.get('IntentClassifier');
    if (!classifier) {
      throw new Error('IntentClassifier tool not found');
    }

    // Load traditional context for vision_context (backward compatibility)
    const context = await this.loadContext(config);
    
    const visionContext = context.vision_state ? {
      has_company_name: !!context.vision_state.company_name,
      has_industry: !!context.vision_state.industry,
      has_vision_statement: !!context.vision_state.vision_statement,
      completeness_score: context.vision_state.metadata?.validation_score || 0,
      last_agent_message: 'Context from ChatGPT memory',
    } : undefined;

    // Use ChatGPT memory context instead of traditional conversation history
    const conversationHistory = [memoryContext];

    const input: IntentClassifierInput = {
      user_message: config.userMessage,
      conversation_history: conversationHistory,
      vision_context: visionContext,
      ui_context: config.uiAction ? {
        buttons_shown: ['skip', 'approve'],
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

  // Helper: Get turn number for conversation
  private getTurnNumber(conversationId: string): number {
    const current = this.conversationTurnCounter.get(conversationId) || 0;
    const turnNumber = current + 1;
    this.conversationTurnCounter.set(conversationId, turnNumber);
    return turnNumber;
  }

  // Helper: Generate UI buttons for questions
  private generateUIButtons(
    context: 'after_question' | 'after_information',
    fieldName?: string
  ): StreamResponse {
    const actions: Array<{
      id: string;
      label: string;
      action_type: 'skip' | 'approve' | 'add_more';
      field_name?: string;
      variant?: 'primary' | 'secondary' | 'outline';
    }> = [];

    switch (context) {
      case 'after_question':
        // Show skip button for questions about specific fields
        if (fieldName) {
          actions.push({
            id: `skip_${fieldName}_${Date.now()}`,
            label: 'Skip this question',
            action_type: 'skip',
            field_name: fieldName,
            variant: 'outline'
          });
        }
        break;
        
      case 'after_information':
        // Show add more details button after information is processed
        actions.push({
          id: `add_more_${Date.now()}`,
          label: 'Add more details',
          action_type: 'add_more',
          variant: 'secondary'
        });
        break;
        
    }

    return {
      type: 'ui_actions',
      ui_actions: {
        type: 'buttons',
        context,
        actions
      }
    };
  }

  // Helper: Extract field name from question text
  private extractFieldNameFromQuestion(questionText: string): string | undefined {
    // Map common question patterns to field names
    const fieldPatterns: Record<string, string> = {
      'company name': 'company_name',
      'organization\'s name': 'company_name',  // Added for "What is your organization's name?"
      'industry': 'industry', 
      'vision statement': 'vision_statement',
      'success metrics': 'success_metrics',
      'measure success': 'success_metrics',  // Added for "How will you measure success?"
      'target outcomes': 'target_outcomes',
      'specific outcomes': 'target_outcomes',  // Added for "specific outcomes or results"
      'outcomes or results': 'target_outcomes',  // Added for "outcomes or results"
      'results you want to achieve': 'target_outcomes',  // Added for "results do you want to achieve"
      'timeline': 'timeline',
      'timeframe': 'timeline',  // Added for "What is your target timeframe"
      'strategic themes': 'key_themes',
      'main strategic themes': 'key_themes',  // Added for "What are the main strategic themes"
      'current strategy': 'current_strategy',
      'strategic direction': 'current_strategy',  // Added for "current strategic direction"
      'competitive landscape': 'competitive_landscape',
      'market size': 'market_size',
      'constraints': 'constraints',
      'assumptions': 'assumptions',
      'strategic priorities': 'strategic_priorities',
      'company size': 'company_size'
    };

    const questionLower = questionText.toLowerCase();
    
    for (const [pattern, fieldName] of Object.entries(fieldPatterns)) {
      if (questionLower.includes(pattern)) {
        return fieldName;
      }
    }
    
    return undefined;
  }

  // Note: Conversation message indexing removed - using ChatGPT memory system instead
}