import { NextRequest, NextResponse } from 'next/server';
import { createAgent, processVisionMessage } from '@/agent/routing';

// Initialize agent on server side with environment variables
let agentInitialized = false;
let agent: any = null;

async function ensureAgentInitialized() {
  if (!agentInitialized) {
    try {
      // No need to pass Supabase config - the agent will use the shared instance
      agent = createAgent();
      agentInitialized = true;
    } catch (error) {
      console.error('[API] Failed to initialize AI agent:', error);
      throw error;
    }
  }
  return agent;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST request received');
    const body = await request.json();
    const { sessionId, userMessage, userId, workspaceId, visionId, uiAction } = body;

    console.log('[API] Request body parsed, received request:', {
      sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : 'undefined',
      userMessage: userMessage ? `${userMessage.substring(0, 50)}...` : 'undefined',
      userId: userId ? `${userId.substring(0, 8)}...` : 'undefined',
      workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : 'undefined',
      visionId: visionId ? `${visionId.substring(0, 8)}...` : 'undefined',
      hasUIAction: !!uiAction,
      bodyKeys: Object.keys(body)
    });

    // Validate required fields
    if (!sessionId || !userMessage) {
      console.error('[API] Validation failed - missing required fields:', {
        hasSessionId: !!sessionId,
        hasUserMessage: !!userMessage
      });
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, userMessage' },
        { status: 400 }
      );
    }

    // Ensure agent is initialized
    console.log('[API] Ensuring agent is initialized...');
    await ensureAgentInitialized();
    console.log('[API] Agent initialized successfully');

    // Process the message using the initialized agent
    console.log('[API] Starting agent processing...');
    const streamGenerator = agent.handleTurn({
      sessionId,
      userMessage,
      userId,
      workspaceId,
      visionId,
      uiAction: uiAction || undefined,
    });

    // Collect the streamed response
    console.log('[API] Collecting streamed response...');
    let response = '';
    let ui_actions: any = null;
    let chunkCount = 0;
    
    for await (const chunk of streamGenerator) {
      chunkCount++;
      console.log(`[API] Processing chunk ${chunkCount}:`, {
        type: chunk.type,
        hasContent: !!chunk.content,
        contentLength: chunk.content?.length || 0,
        hasUIActions: !!chunk.ui_actions
      });
      
      if (chunk.type === 'token' && chunk.content) {
        response += chunk.content;
      } else if (chunk.type === 'ui_actions' && chunk.ui_actions) {
        ui_actions = chunk.ui_actions;
        console.log('[API] 🔴 UI actions received:', JSON.stringify(ui_actions, null, 2));
      } else if (chunk.type === 'error') {
        console.error('[API] Agent error chunk received:', chunk.error);
        throw new Error(chunk.error || 'Agent processing failed');
      }
    }

    console.log('[API] Agent processing completed:', {
      responseLength: response.length,
      hasUIActions: !!ui_actions
    });
    
    return NextResponse.json({ 
      response,
      ui_actions: ui_actions || null
    });
  } catch (error) {
    console.error('[API] Agent processing failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Health check endpoint
    const agent = await ensureAgentInitialized();
    const health = await agent.healthCheck();
    
    return NextResponse.json({
      status: 'ok',
      agent_health: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Agent initialization failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}