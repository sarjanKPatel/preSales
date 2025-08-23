'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface WorkspaceSwitcherProps {
  onCreateWorkspace: () => void;
  compact?: boolean;
  useFixedDropdown?: boolean;
}

export default function WorkspaceSwitcher({ onCreateWorkspace, compact = false, useFixedDropdown = false }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { currentWorkspace, workspaces, loading, setCurrentWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Check both button and dropdown for click outside detection
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return; // Don't close if clicking the button
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleWorkspaceSelect = (workspace: any) => {
    // Only redirect if switching to a different workspace
    const isChangingWorkspace = currentWorkspace?.id !== workspace.id;
    
    setCurrentWorkspace(workspace);
    setIsOpen(false);
    
    // Redirect to workspace home page when workspace is changed
    if (isChangingWorkspace) {
      router.push('/workspace');
    }
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    onCreateWorkspace();
  };

  const handleToggleDropdown = () => {
    if (useFixedDropdown && buttonRef.current && !isOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + 4, // 4px gap
        left: rect.left
      });
    }
    setIsOpen(!isOpen);
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-200 rounded-lg animate-pulse ${
        compact ? 'max-w-32' : 'max-w-48'
      } h-10`}>
        <div className="w-4 h-4 bg-gray-300 rounded" />
        <div className="flex-1 h-4 bg-gray-300 rounded" />
        <div className="w-4 h-4 bg-gray-300 rounded" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return null; // Don't show switcher if no workspaces
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className={`flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors h-10 ${
          compact ? 'max-w-32' : 'max-w-48'
        }`}
      >
        <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="truncate font-medium text-gray-900">
          {currentWorkspace?.name || 'Select workspace'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
      </button>

      {isOpen && !useFixedDropdown && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[60] transform transition-all duration-150 ease-out animate-dropdown-in">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Your workspaces
              </p>
            </div>
            
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleWorkspaceSelect(workspace)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-6 h-6 bg-primary-100 rounded flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3 h-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {workspace.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {workspace.slug}
                  </p>
                </div>
                {currentWorkspace?.id === workspace.id && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
            
            <div className="border-t border-gray-100 mt-1">
              <button
                onClick={handleCreateWorkspace}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <Plus className="w-3 h-3 text-gray-600" />
                </div>
                <span className="text-sm text-gray-700">Create workspace</span>
              </button>
            </div>
        </div>
      )}
      
      {/* Fixed dropdown rendered via portal */}
      {isOpen && useFixedDropdown && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[9999]"
          style={{
            top: buttonPosition.top + 'px',
            left: buttonPosition.left + 'px'
          }}
          ref={dropdownRef}
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Your workspaces
            </p>
          </div>
          
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => handleWorkspaceSelect(workspace)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 bg-primary-100 rounded flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {workspace.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {workspace.slug}
                </p>
              </div>
              {currentWorkspace?.id === workspace.id && (
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
          
          <div className="border-t border-gray-100 mt-1">
            <button
              onClick={handleCreateWorkspace}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                <Plus className="w-3 h-3 text-gray-600" />
              </div>
              <span className="text-sm text-gray-700">Create workspace</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}