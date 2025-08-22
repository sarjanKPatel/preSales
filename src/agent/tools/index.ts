import { Tool, ToolRegistry as IToolRegistry, ToolRouter as IToolRouter } from './types';
import { ToolResult } from '../../types';
import { GapDetector } from './gapDetector';
import { VisionStateManager } from './visionState';
import { InformationExtractor } from './informationExtractor';
import { IntentClassifier } from './IntentClassifier';
import { QuestionAnswering } from './QuestionAnswering';
import { ResponseFormatter } from './ResponseFormatter';
import { VisionFinalizer } from './VisionFinalizer';
import { UIActionHandler } from './UIActionHandler';
import { LLMProvider, OpenAIProvider } from '../llm/provider';

// Tool Registry Implementation
class ToolRegistryImpl implements IToolRegistry {
  private tools = new Map<string, Tool>();

  register<T extends Tool>(tool: T): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }

  async execute(name: string, input: any): Promise<ToolResult> {
    const tool = this.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found. Available tools: ${this.list().join(', ')}`,
      };
    }

    try {
      return await tool.execute(input);
    } catch (error) {
      return {
        success: false,
        error: `Tool execution failed: ${String(error)}`,
      };
    }
  }
}

// Tool Router Implementation
class ToolRouterImpl implements IToolRouter {
  constructor(private registry: IToolRegistry) {}

  async execute(toolName: string, input: any): Promise<ToolResult> {
    return this.registry.execute(toolName, input);
  }

  registerTool(tool: Tool): void {
    this.registry.register(tool);
  }

  getAvailableTools(): string[] {
    return this.registry.list();
  }
}

// Create global instances
export const toolRegistry = new ToolRegistryImpl();
export const toolRouter = new ToolRouterImpl(toolRegistry);

// Register default tools
export function initializeTools(llmProvider?: LLMProvider): void {
  try {
    // Create OpenAI provider if not provided
    const openaiProvider = llmProvider instanceof OpenAIProvider 
      ? llmProvider 
      : new OpenAIProvider();
    
    // Core tools
    toolRegistry.register(new GapDetector());
    toolRegistry.register(new VisionStateManager());
    toolRegistry.register(new InformationExtractor(openaiProvider));
    toolRegistry.register(new IntentClassifier(openaiProvider));
    
    // Question answering and response tools
    toolRegistry.register(new QuestionAnswering(openaiProvider));
    toolRegistry.register(new ResponseFormatter());
    
    // Finalization and UI tools
    toolRegistry.register(new VisionFinalizer());
    toolRegistry.register(new UIActionHandler());
  } catch (error) {
    console.error('[Tools] Failed to initialize tools:', error);
    throw error;
  }
}

// Initialize tools immediately
initializeTools();

// Export tool classes for direct use
export { 
  GapDetector, 
  VisionStateManager, 
  InformationExtractor, 
  IntentClassifier,
  QuestionAnswering,
  ResponseFormatter,
  VisionFinalizer,
  UIActionHandler
};

// Export types
export * from './types';