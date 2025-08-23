'use client';

import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import WorkspaceGate from '@/components/workspaces/WorkspaceGate';
import WaitlistGate from '@/components/auth/WaitlistGate';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import EnhancedVisionChatLayout from '@/components/chat/chatVision/EnhancedVisionChatLayout';
export default function CompanyVisionPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  // DEBUG: Log component mounting and dependencies
  useEffect(() => {
    console.log('[VisionPage] Component mounted');
    console.log('[VisionPage] user:', !!user, user?.id);
    console.log('[VisionPage] currentWorkspace:', currentWorkspace?.id, currentWorkspace?.name);
  }, [user, currentWorkspace]);

  return (
    <ProtectedRoute>
      <WaitlistGate>
        <WorkspaceGate>
          <Layout maxWidth="full" padding={false}>
            <div className="h-[calc(100vh-4rem)] w-full">
              <EnhancedVisionChatLayout
                className="h-full"
              />
            </div>
          </Layout>
        </WorkspaceGate>
      </WaitlistGate>
    </ProtectedRoute>
  );
}