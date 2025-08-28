'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface WorkspaceGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function WorkspaceGate({ children, fallback }: WorkspaceGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, workspaces, loading: workspaceLoading, setCurrentWorkspace } = useWorkspace();

  // Don't apply workspace gate logic to workspace setup page
  const isWorkspaceSetupPage = pathname === '/workspace-setup';

  useEffect(() => {
    if (authLoading || workspaceLoading || isWorkspaceSetupPage) return;

    if (!user) {
      return; // ProtectedRoute will handle this
    }

    // If user has no workspaces, redirect to workspace setup
    if (workspaces.length === 0) {
      router.push('/workspace-setup');
      return;
    }

    // If user has workspaces but no current workspace selected, select the first one
    if (!currentWorkspace && workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0]);
      // Redirect to workspace home page
      router.push('/workspace');
      return;
    }
  }, [user, currentWorkspace, workspaces, authLoading, workspaceLoading, router, isWorkspaceSetupPage, setCurrentWorkspace]);

  // Show loading while checking auth or workspace state
  if (authLoading || workspaceLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't gate workspace setup page
  if (isWorkspaceSetupPage) {
    return <>{children}</>;
  }

  // If not authenticated, this should be handled by ProtectedRoute
  if (!user) {
    return null;
  }

  // If workspace checks are in progress, show loading
  if (workspaces.length === 0 || !currentWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Setting up workspace...</p>
        </div>
      </div>
    );
  }

  // If user has a current workspace, render the app
  return <>{children}</>;
}