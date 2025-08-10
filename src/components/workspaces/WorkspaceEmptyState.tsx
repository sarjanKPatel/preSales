'use client';

import React from 'react';
import Button from '@/components/Button';
import { Building2, Plus, Users } from 'lucide-react';

interface WorkspaceEmptyStateProps {
  onCreateWorkspace: () => void;
}

export default function WorkspaceEmptyState({ onCreateWorkspace }: WorkspaceEmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto">
        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-12 h-12 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Create your first workspace
        </h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Workspaces help you organize your proposals, collaborate with team members, 
          and keep everything in one place. Get started by creating your first workspace.
        </p>
        
        <Button
          onClick={onCreateWorkspace}
          variant="primary"
          size="lg"
          className="mx-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create workspace
        </Button>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">What you can do with workspaces:</p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2 text-primary" />
              Team collaboration
            </div>
            <div className="flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-primary" />
              Organize proposals
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}