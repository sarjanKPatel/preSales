'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import WaitlistGate from '@/components/auth/WaitlistGate';
import WorkspaceGate from '@/components/workspaces/WorkspaceGate';
import { VisionChatLayout } from '@/components/chat';
import { useAuth } from '@/contexts/AuthContext';

// Remove mock sessions - ChatLayout now fetches its own data from the database

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [chatType, setChatType] = useState<'vision' | 'lead' | 'proposal'>('vision');
  const [visionId, setVisionId] = useState<string | undefined>(undefined);
  const [agentInitialized, setAgentInitialized] = useState(false);
  
  // Check agent health via API
  useEffect(() => {
    const checkAgentHealth = async () => {
      try {
        const response = await fetch('/api/agent');
        if (response.ok) {
          setAgentInitialized(true);
          console.log('AI Agent is ready');
        } else {
          console.error('AI Agent health check failed');
        }
      } catch (error) {
        console.error('Failed to check AI agent status:', error);
      }
    };
    
    checkAgentHealth();
  }, []);

  useEffect(() => {
    const type = searchParams.get('type') as 'vision' | 'lead' | 'proposal';
    if (type && ['vision', 'lead', 'proposal'].includes(type)) {
      setChatType(type);
    }
    
    const visionIdParam = searchParams.get('visionId');
    if (visionIdParam) {
      setVisionId(visionIdParam);
    }
  }, [searchParams]);


  if (!agentInitialized) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Initializing AI Agent...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <WaitlistGate>
        <WorkspaceGate>
          <Layout maxWidth="full" padding={false}>
            <div className="h-[calc(100vh-4rem)] w-full">
              <VisionChatLayout
                key={`vision-chat-${visionId || 'default'}`}
                className="h-full"
                visionId={visionId}
              />
            </div>
          </Layout>
        </WorkspaceGate>
      </WaitlistGate>
    </ProtectedRoute>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}