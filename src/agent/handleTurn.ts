import { AgentContext, AgentMessage, StreamResponse } from '../types';
import { ContextLoader } from './memory/context';
import { LLMProviderManager } from './llm/provider';
import { OpenAIAdapter } from './llm/adapters';
import { toolRegistry, initializeTools } from './tools';
import { metrics, trackError, createTimer } from './observability/tracing';

export interface TurnConfig {
  sessionId: string;
  userMessage: string;
  userId?: string;
  workspaceId?: string;
  visionId?: string; // Add visionId for vision-centric operations
  maxRetries?: number;
  budgetTokens?: number;
}

export interface TurnHandlerDependencies {
  contextLoader: ContextLoader;
  llmProvider: LLMProviderManager;
}

export class TurnHandler {
  private deps: TurnHandlerDependencies;
  private adapter: OpenAIAdapter;

  constructor(dependencies: TurnHandlerDependencies) {
    this.deps = dependencies;
    this.adapter = new OpenAIAdapter();
    
    // Initialize tools with LLM provider for dynamic question generation
    initializeTools(dependencies.llmProvider.getProvider());
  }

  private async traceStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const timer = createTimer();
    try {
      const result = await fn();
      metrics.recordLatency(`agent.step.${name}`, timer.end());
      return result;
    } catch (error) {
      metrics.recordCount(`agent.step.${name}.error`);
      trackError(error as Error, { step: name });
      throw error;
    }
  }

  async *handleTurn(config: TurnConfig): AsyncGenerator<StreamResponse> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer = createTimer();
    
    try {
      // Step 1: Load context with tracing
      yield { type: 'metadata', metadata: { step: 'loading_context', runId } };
      
      // Require visionId for vision-centric operations
      if (!config.visionId) {
        throw new Error('visionId is required for vision context');
      }
      if (!config.workspaceId) {
        throw new Error('workspaceId is required for vision context');
      }
      
      const context = await this.traceStep('load_context', async () => {
        return this.deps.contextLoader.loadVisionContext(
          config.visionId!,
          config.sessionId,
          config.workspaceId!,
          config.userId
        );
      });
      
      // Add user message to context
      const userMessage: AgentMessage = {
        role: 'user',
        content: config.userMessage,
      };
      context.messages.push(userMessage);
      

      // Step 2: Information Extraction using InformationExtractor tool directly
      yield { type: 'metadata', metadata: { step: 'information_extraction' } };
      
      const extractor = toolRegistry.get('InformationExtractor');
      if (extractor) {
        const extractionResult = await extractor.execute({
          user_message: config.userMessage,
          current_vision: context.vision_state,
          session_context: context.messages.slice(-5).map(m => m.content),
          persistence_config: config.visionId && config.workspaceId && config.userId ? {
            vision_id: config.visionId,
            workspace_id: config.workspaceId,
            user_id: config.userId,
          } : undefined,
        });

        if (extractionResult.success && extractionResult.data) {
          // Update context with the processed vision state from extraction
          context.vision_state = extractionResult.data.updated_vision_state || context.vision_state;
        }
      } else {
        console.warn('InformationExtractor tool not available');
      }

      // Step 3: Gap Detection using GapDetector tool directly
      yield { type: 'metadata', metadata: { step: 'gap_detection' } };
      
      let gapResult = { gaps_found: false, next_questions: [] };
      
      if (context.vision_state) {
        const gapDetector = toolRegistry.get('GapDetector');
        if (gapDetector) {
          const result = await gapDetector.execute({
            vision_state: context.vision_state,
            context: context.messages.slice(-5).map(m => m.content),
          });
          
          gapResult = result.success ? result.data : { gaps_found: false, next_questions: [] };
        } else {
          console.warn('GapDetector tool not available');
        }
      }
      
      if (gapResult.gaps_found && gapResult.next_questions) {
        // Return questions to user instead of proceeding
        const questionsMessage = this.formatQuestionsResponse(gapResult.next_questions);
        yield { type: 'token', content: questionsMessage };
        yield { type: 'done' };
        return;
      }

      // If no gaps found, return a simple completion message for now
      yield { type: 'token', content: 'Great! I have all the information needed. The vision processing pipeline is ready for the next steps.' };
      yield { type: 'done' };

      // Record success metrics
      metrics.recordLatency('agent.turn.duration', timer.end());
      metrics.recordCount('agent.turn.completed');

    } catch (error) {
      const duration = timer.end();
      trackError(error as Error, { 
        runId, 
        sessionId: config.sessionId,
        duration 
      });
      
      metrics.recordLatency('agent.turn.error.duration', duration);
      metrics.recordCount('agent.turn.error');
      
      console.error('Turn handling failed:', error);
      yield { 
        type: 'error', 
        error: `Turn handling failed: ${error}`,
        metadata: { runId, duration }
      };
    }
  }




  private formatQuestionsResponse(questions: string[]): string {
    if (questions.length === 0) {
      return "I have all the information I need to help you create your vision. Let me work on that for you.";
    }

    const intro = questions.length === 1 
      ? "I need one more piece of information to create the best possible vision for you:"
      : `I need a bit more information to create the best possible vision for you. Here are my questions:`;

    const questionList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    
    return `${intro}\n\n${questionList}\n\nPlease answer these questions, and I'll incorporate your responses into a comprehensive strategic vision.`;
  }

  


}