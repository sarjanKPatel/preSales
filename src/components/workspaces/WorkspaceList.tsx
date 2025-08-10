'use client';

import React from 'react';
import Button from '@/components/Button';
import { Building2, Users, Calendar, ExternalLink, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface WorkspaceListProps {
  workspaces: Workspace[];
  onCreateWorkspace: () => void;
  loading?: boolean;
}

export default function WorkspaceList({ workspaces, onCreateWorkspace, loading }: WorkspaceListProps) {
  const handleWorkspaceClick = (workspace: Workspace) => {
    // For now, just stay on the current page
    // In the future, this could navigate to workspace-specific routes
    console.log('Navigate to workspace:', workspace.slug);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div>
                    <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your workspaces</h1>
          <p className="text-gray-600 mt-1">
            {workspaces.length === 1
              ? '1 workspace'
              : `${workspaces.length} workspaces`}
          </p>
        </div>
        <Button
          onClick={onCreateWorkspace}
          variant="primary"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New workspace
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => handleWorkspaceClick(workspace)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {workspace.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {workspace.slug}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                <span>1 member</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>
                  Created {formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Click to enter workspace
              </p>
            </div>
          </div>
        ))}
      </div>

      {workspaces.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first workspace.</p>
          <Button onClick={onCreateWorkspace} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Create workspace
          </Button>
        </div>
      )}
    </div>
  );
}