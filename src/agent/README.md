# PropelIQ AI Agent System

A comprehensive AI agent system for strategic vision development, lead qualification, and proposal generation. Built with TypeScript, supporting multiple LLM providers, RAG capabilities, and robust observability.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Core Components](#core-components)
- [Tools System](#tools-system)
- [LLM Integration](#llm-integration)
- [Memory & Context Management](#memory--context-management)
- [RAG System](#rag-system)
- [Observability & Monitoring](#observability--monitoring)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

The agent system follows a modular architecture with clear separation of concerns:

```
src/agent/
├── types.ts                 # Core type definitions
├── index.ts                 # Main export file
├── handleTurn.ts            # Core turn handling logic
├── routing.ts               # Agent routing and configuration
├── memory/                  # Context and memory management
│   ├── context.ts           # Session context loading/saving
│   └── processors.ts        # Message processing and pruning
├── llm/                     # LLM provider integration
│   ├── provider.ts          # Provider implementations
│   ├── adapters.ts          # Prompt adapters
│   └── routing.ts           # LLM routing and fallbacks
├── tools/                   # Agent tools and capabilities
│   ├── types.ts             # Tool type definitions
│   ├── index.ts             # Tool registry and router
│   ├── gapDetector.ts       # Information gap detection
│   ├── questionGen.ts       # Question generation
│   └── visionState.ts       # Vision state management
├── rag/                     # Retrieval-Augmented Generation
│   ├── store.ts             # Vector store implementations
│   ├── chunkers.ts          # Document chunking strategies
│   └── quality.ts           # RAG quality assessment
├── prompts/                 # Prompt templates and validation
│   ├── templates/           # Prompt templates
│   │   ├── vision.ts        # Vision-specific templates
│   │   └── index.ts         # Template exports
│   └── validators.ts        # Content validation
└── observability/           # Monitoring and tracing
    └── tracing.ts           # Performance monitoring
```

## Quick Start

### Basic Usage

```typescript
import { initializeAgent, processVisionMessage } from '@/agent';

// Initialize the agent
const agent = await initializeAgent({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  enableValidation: true,
});

// Process a user message
const response = await processVisionMessage(
  'session_123', // sessionId
  'I want to create a vision for my tech startup',
  {
    workspaceId: 'workspace_456',
    userId: 'user_789',
  }
);

console.log(response);
```

### Streaming Responses

```typescript
import { processVisionMessage } from '@/agent';

const streamResponse = await processVisionMessage(
  'session_123',
  'My company is Acme Corp, we work in manufacturing',
  {
    workspaceId: 'workspace_456',
    userId: 'user_789',
    streaming: true,
  }
) as AsyncGenerator<StreamResponse>;

for await (const chunk of streamResponse) {
  switch (chunk.type) {
    case 'token':
      process.stdout.write(chunk.content || '');
      break;
    case 'metadata':
      console.log('Step:', chunk.metadata?.step);
      break;
    case 'error':
      console.error('Error:', chunk.error);
      break;
    case 'done':
      console.log('\nCompleted');
      break;
  }
}
```

## Core Components

### 1. Turn Handler (`handleTurn.ts`)

The central orchestrator that manages the agent's response flow:

```typescript
interface TurnConfig {
  sessionId: string;
  userMessage: string;
  userId?: string;
  workspaceId?: string;
  enableRAG?: boolean;
  maxRetries?: number;
  budgetTokens?: number;
}

class TurnHandler {
  async *handleTurn(config: TurnConfig): AsyncGenerator<StreamResponse>
}
```

**Processing Steps:**
1. **Load Context** - Retrieves session history and vision state
2. **Information Extraction** - Extracts company info using AI
3. **Gap Detection** - Identifies missing information
4. **RAG Query** (Optional) - Searches relevant documents
5. **Draft Generation** - Creates vision content using LLM
6. **Validation** - Checks generated content quality
7. **Context Update** - Saves new state and metadata

### 2. Agent Router (`routing.ts`)

High-level interface for agent configuration and management:

```typescript
interface AgentConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  enableRAG?: boolean;
  enableValidation?: boolean;
  maxMessages?: number;
  maxTokens?: number;
}

class AgentRouter {
  constructor(config: AgentConfig)
  async *handleTurn(config: TurnConfig): AsyncGenerator<StreamResponse>
  async processMessage(config: TurnConfig): Promise<string>
  async healthCheck(): Promise<HealthStatus>
}
```

## Tools System

The agent uses a modular tool system for different capabilities:

### Gap Detector (`tools/gapDetector.ts`)

Analyzes vision state to identify missing information:

```typescript
interface GapDetectorInput {
  vision_state: VisionState;
  metadata: VisionMetadata;
  context?: string[];
}

interface GapDetectorOutput {
  gaps_found: boolean;
  analysis: GapAnalysis;
  next_questions: string[];
}

class GapDetector implements Tool<GapDetectorInput, GapDetectorOutput> {
  async execute(input: GapDetectorInput): Promise<ToolResult<GapDetectorOutput>>
}
```

**Key Features:**
- Checks required fields (company_name, vision_statement, key_themes, success_metrics)
- Validates field quality and completeness
- Looks for industry context in vision_state (FIXED: previously looked in metadata)
- Generates prioritized questions to fill gaps

### Question Generator (`tools/questionGen.ts`)

Generates strategic questions based on missing information:

```typescript
interface QuestionGeneratorInput {
  missing_fields: string[];
  weak_areas: string[];
  context_history: string[];
  priority?: 'high' | 'medium' | 'low';
}

class QuestionGenerator {
  async execute(input: QuestionGeneratorInput): Promise<ToolResult<QuestionGeneratorOutput>>
}
```

### Vision State Manager (`tools/visionState.ts`)

Manages and validates vision state updates:

```typescript
interface VisionStateInput {
  current_state: VisionState;
  updates: Partial<VisionState>;
  metadata?: Partial<VisionMetadata>;
  validation?: boolean;
}

class VisionStateManager {
  async execute(input: VisionStateInput): Promise<ToolResult<VisionStateOutput>>
}
```

## LLM Integration

### Provider System (`llm/provider.ts`)

Supports multiple LLM providers with fallback capabilities:

```typescript
interface LLMProvider {
  name: string;
  complete(prompt: string | LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  stream?(prompt: string | LLMMessage[], options?: LLMOptions): AsyncGenerator<string>;
  embed?(text: string): Promise<number[]>;
  getAvailableModels(): string[];
  validateApiKey(): Promise<boolean>;
}

// Supported providers:
class OpenAIProvider implements LLMProvider
class AnthropicProvider implements LLMProvider
class LLMProviderManager // Multi-provider management
```

**Configuration:**
- **OpenAI**: Set `OPENAI_API_KEY` environment variable
- **Anthropic**: Set `ANTHROPIC_API_KEY` environment variable

### LLM Routing (`llm/routing.ts`)

Intelligent routing with fallbacks and retry logic:

```typescript
interface RoutingOptions extends LLMOptions {
  provider?: string;
  fallbackProvider?: string;
  maxRetries?: number;
  retryDelay?: number;
}

class LLMRouter {
  async complete(prompt: string | LLMMessage[], options: RoutingOptions): Promise<LLMResponse>
  async *stream(prompt: string | LLMMessage[], options: RoutingOptions): AsyncGenerator<string>
}
```

### Prompt Adapters (`llm/adapters.ts`)

Handles prompt formatting and model selection:

```typescript
class OpenAIAdapter {
  createDraftPrompt(context: PromptContext): LLMMessage[]
  createRepairPrompt(originalContent: string, repairContext: RepairContext): LLMMessage[]
  createExtractionPrompt(userMessage: string): LLMMessage[]
  selectModel(taskType: 'vision' | 'extraction' | 'repair' | 'analysis', budgetTokens?: number): string
}
```

**Model Selection:**
- **Vision Creation**: `gpt-4-turbo` (best for complex strategic thinking)
- **Information Extraction**: `gpt-4-turbo` (most reliable for structured extraction)
- **Content Repair**: `gpt-4` (good balance for refinement)
- **Budget Mode**: `gpt-3.5-turbo` (when budgetTokens < 1000)

## Memory & Context Management

### Context Loader (`memory/context.ts`)

Manages session persistence and state loading:

```typescript
interface ContextLoaderConfig {
  supabaseUrl: string;
  supabaseKey: string;
  maxMessages?: number;
  includeSummary?: boolean;
}

class ContextLoader {
  async loadContext(sessionId: string, workspaceId?: string, userId?: string): Promise<AgentContext>
  async saveContext(context: AgentContext): Promise<void>
}
```

**Data Structure:**
```typescript
interface AgentContext {
  messages: AgentMessage[];
  session: SessionData;
  summary?: string;
  vision_state?: VisionState;
  metadata?: VisionMetadata;
}
```

**Storage Strategy:**
- **Messages**: Stored in `chat_messages` table
- **Vision State**: Stored in `session.metadata.vision_state`
- **Metadata**: Stored in `session.metadata.vision_metadata`

### Message Processor (`memory/processors.ts`)

Handles message pruning and summarization:

```typescript
interface MessageProcessorConfig {
  maxTokens?: number;
  maxMessages?: number;
  summarizeThreshold?: number;
}

class MessageProcessor {
  async processMessages(messages: AgentMessage[]): Promise<AgentMessage[]>
  async shouldSummarize(messages: AgentMessage[]): Promise<boolean>
  async createSummary(messages: AgentMessage[]): Promise<string>
}
```

## RAG System

### Vector Store (`rag/store.ts`)

Document storage and retrieval:

```typescript
interface VectorStore {
  addDocument(document: Document): Promise<string>;
  search(query: string, options?: RAGSearchOptions): Promise<Document[]>;
  hybridSearch(query: string, options?: RAGSearchOptions): Promise<Document[]>;
}

// Implementations:
class SupabaseVectorStore implements VectorStore
class InMemoryVectorStore implements VectorStore
```

### Document Chunking (`rag/chunkers.ts`)

Multiple chunking strategies for different content types:

```typescript
interface DocumentChunker {
  chunk(document: Document, options?: ChunkingOptions): Document[];
}

class TextChunker implements DocumentChunker      // General text chunking
class MarkdownChunker implements DocumentChunker  // Markdown-aware chunking
class CodeChunker implements DocumentChunker      // Code function chunking
```

### Quality Assessment (`rag/quality.ts`)

RAG result quality evaluation:

```typescript
interface QualityMetrics {
  relevance: number;
  coherence: number;
  completeness: number;
  avgRelevance: number;
  diversity: number;
}

class RAGQualityChecker {
  async checkQuality(documents: Document[], query: string): Promise<QualityResult>
  async performMMR(documents: Document[], lambda?: number): Promise<Document[]>
}
```

## Observability & Monitoring

### Tracing System (`observability/tracing.ts`)

Performance monitoring and debugging:

```typescript
// Span management
export function withRootSpan<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>

// Metrics recording
export const metrics = {
  recordCount: (name: string, value?: number) => void,
  recordLatency: (name: string, duration: number) => void,
  getSummary: () => Record<string, any>,
}

// Decorators
export function traced(spanName?: string): MethodDecorator
```

**Usage Example:**
```typescript
@traced('vision.generation')
async generateVision(context: VisionContext): Promise<string> {
  metrics.recordCount('vision.requests');
  const timer = createTimer();
  
  try {
    const result = await this.llmProvider.complete(prompt);
    metrics.recordLatency('vision.duration', timer.end());
    return result;
  } catch (error) {
    trackError(error, { context: 'vision_generation' });
    throw error;
  }
}
```

## API Reference

### Core Types

```typescript
// Vision Data Structure
interface VisionState {
  company_name: string;
  vision_statement?: string;
  key_themes?: string[];
  target_outcomes?: string[];
  success_metrics?: string[];
  timeline?: string;
  constraints?: string[];
  assumptions?: string[];
  industry?: string;
  company_size?: number;
}

// Session Metadata
interface VisionMetadata {
  session_id: string;
  workspace_id: string;
  user_id: string;
  version: number;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'in_progress' | 'completed' | 'validated';
  validation_score?: number;
  gap_analysis?: GapAnalysis;
  custom_fields?: Record<string, any>;
}

// Streaming Response
interface StreamResponse {
  type: 'token' | 'metadata' | 'error' | 'done';
  content?: string;
  metadata?: Record<string, any>;
  error?: string;
}
```

### Main Functions

```typescript
// Agent initialization
function initializeAgent(config?: AgentConfig): Promise<AgentRouter>
function createAgent(config?: AgentConfig): AgentRouter
function getGlobalAgent(config?: AgentConfig): AgentRouter

// Message processing
function processVisionMessage(
  sessionId: string,
  userMessage: string,
  options?: {
    workspaceId?: string;
    userId?: string;
    streaming?: boolean;
  }
): Promise<string | AsyncGenerator<StreamResponse>>

// Health monitoring
function checkAgentHealth(): Promise<HealthStatus>
```

## Configuration

### Environment Variables

```bash
# Required for LLM functionality
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Required for persistent storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...

# Optional: RAG configuration
VECTOR_STORE_TYPE=supabase  # or 'memory'
```

### Agent Configuration

```typescript
const agentConfig: AgentConfig = {
  // Database
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY,
  
  // LLM providers
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  
  // Features
  enableRAG: false,           // Disable RAG for now
  enableValidation: true,     // Enable content validation
  
  // Performance
  maxMessages: 50,            // Max conversation history
  maxTokens: 8000,           // Max context window
};
```

## Troubleshooting

### Common Issues

1. **"No API key provided" Error**
   - Ensure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set
   - Check environment variable loading

2. **"Failed to load context" Error**
   - Verify Supabase configuration
   - Check database table existence (`chat_sessions`, `chat_messages`)

3. **"Gap detection failed" Error**
   - Usually indicates vision_state is undefined
   - Check session initialization

4. **"Tool not found" Error**
   - Ensure tools are properly initialized
   - Check tool registry in console logs

5. **Extraction Not Working**
   - The system now uses AI extraction instead of regex patterns
   - Check LLM provider availability
   - Verify prompt templates

### Debug Logging

Enable detailed logging:

```typescript
// Set debug environment
process.env.NODE_ENV = 'development';

// Monitor metrics
const agent = getGlobalAgent();
setInterval(() => {
  console.log('Agent Metrics:', agent.getMetrics());
}, 30000);

// Health checks
const health = await agent.healthCheck();
console.log('Agent Health:', health);
```

### Performance Monitoring

```typescript
import { metrics, spans } from '@/agent';

// View performance metrics
console.log('Metrics Summary:', metrics.getSummary());

// View recent spans
console.log('Recent Operations:', spans.getRecent(10));

// View errors
console.log('Error Spans:', spans.getErrors());
```

---

## Recent Fixes and Improvements

### Fixed Information Extraction Issue

**Problem**: The agent wasn't using company information provided by users after the initial greeting.

**Root Cause**: Gap detector was looking for `industry` in `metadata.custom_fields.industry` but extraction was storing it in `vision_state.industry`.

**Solution**: 
1. Updated GapDetector to check `vision_state.industry` first, then fall back to `metadata.custom_fields.industry`
2. Switched to pure AI extraction using GPT-4 Turbo instead of regex patterns
3. Fixed context loading to properly retrieve vision state from session metadata

**Files Modified**:
- `tools/gapDetector.ts` - Fixed industry detection logic
- `handleTurn.ts` - Improved AI extraction with GPT-4 Turbo
- `memory/context.ts` - Fixed vision state loading from session metadata

The agent now properly extracts and persists company information between conversation turns.

---

For additional support or questions, please refer to the [AI Architecture Documentation](../AI_ARCHITECTURE_README.md) or check the troubleshooting section above.