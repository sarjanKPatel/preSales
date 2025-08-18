import { NextRequest, NextResponse } from 'next/server';
import { initializeAgent, processVisionMessage } from '@/agent';

// Initialize agent on server side with environment variables
let agentInitialized = false;
let agent: any = null;

async function ensureAgentInitialized() {
  if (!agentInitialized) {
    try {
      // No need to pass Supabase config - the agent will use the shared instance
      agent = await initializeAgent();
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
    const body = await request.json();
    const { sessionId, userMessage, userId, workspaceId, visionId } = body;

    console.log('[API] Received request:', {
      sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : 'undefined',
      userMessage: userMessage ? `${userMessage.substring(0, 20)}...` : 'undefined',
      userId: userId ? `${userId.substring(0, 8)}...` : 'undefined',
      workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : 'undefined',
      visionId: visionId ? `${visionId.substring(0, 8)}...` : 'undefined'
    });

    // Validate required fields
    if (!sessionId || !userMessage) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, userMessage' },
        { status: 400 }
      );
    }

    // Ensure agent is initialized
    await ensureAgentInitialized();

    // Process the message using the initialized agent
    const streamGenerator = agent.handleTurn({
      sessionId,
      userMessage,
      userId,
      workspaceId,
      visionId,
    });

    // Collect the streamed response
    let response = '';
    for await (const chunk of streamGenerator) {
      if (chunk.type === 'token' && chunk.content) {
        response += chunk.content;
      } else if (chunk.type === 'error') {
        throw new Error(chunk.error || 'Agent processing failed');
      }
    }

    return NextResponse.json({ response });
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