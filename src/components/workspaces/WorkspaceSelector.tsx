'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Button from '@/components/Button';
import WorkspaceCreateModal from '@/components/workspaces/WorkspaceCreateModal';
import { Building2, Plus, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function WorkspaceSelector() {
  const { workspaces, setCurrentWorkspace } = useWorkspace();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleWorkspaceSelect = (workspace: any) => {
    setCurrentWorkspace(workspace);
  };

  const handleCreateWorkspace = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Select a workspace</h1>
        <p className="text-gray-600">Choose which workspace you'd like to enter</p>
      </div>

      <div className="space-y-3 mb-6">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            onClick={() => handleWorkspaceSelect(workspace)}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{workspace.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created {formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Button
          onClick={handleCreateWorkspace}
          variant="ghost"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create new workspace
        </Button>
      </div>

      <WorkspaceCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => setShowCreateModal(false)}
      />
    </div>
  );
}