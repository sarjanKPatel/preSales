'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import WorkspaceEmptyState from '@/components/workspaces/WorkspaceEmptyState';
import WorkspaceCreateModal from '@/components/workspaces/WorkspaceCreateModal';
import WorkspaceSelector from '@/components/workspaces/WorkspaceSelector';

interface WorkspaceGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function WorkspaceGate({ children, fallback }: WorkspaceGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, workspaces, loading: workspaceLoading } = useWorkspace();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // DEBUG: Log workspace gate state
  console.log('[WorkspaceGate] State check:', {
    user: !!user,
    authLoading,
    workspaceLoading,
    currentWorkspace: currentWorkspace?.id,
    workspacesCount: workspaces.length
  });

  // Show loading while checking auth or workspace state
  if (authLoading || workspaceLoading) {
    console.log('[WorkspaceGate] Showing loading state - authLoading:', authLoading, 'workspaceLoading:', workspaceLoading);
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // If not authenticated, this should be handled by ProtectedRoute
  if (!user) {
    return null;
  }

  // If user has no workspaces, show create workspace flow
  if (workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <WorkspaceEmptyState onCreateWorkspace={() => setShowCreateModal(true)} />
          <WorkspaceCreateModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => setShowCreateModal(false)}
          />
        </div>
      </div>
    );
  }

  // If user has workspaces but no current workspace selected, show workspace selector
  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <WorkspaceSelector />
        </div>
      </div>
    );
  }

  // If user has a current workspace, render the app
  return <>{children}</>;
}