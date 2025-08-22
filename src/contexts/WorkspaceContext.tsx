'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/supabase';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'viewer' | 'member' | 'admin';
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  currentUserRole: 'viewer' | 'member' | 'admin' | null;
  loading: boolean;
  workspaceLoading: boolean;
  error: string | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<{ workspace?: Workspace; error?: any }>;
  deleteWorkspace: (workspaceId: string) => Promise<{ success?: boolean; error?: any }>;
  leaveWorkspace: (workspaceId: string) => Promise<{ success?: boolean; error?: any }>;
  getWorkspaceMembers: (workspaceId: string) => Promise<{ members?: WorkspaceMember[]; error?: any }>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'viewer' | 'member' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = async () => {
    console.log('[WorkspaceContext] refreshWorkspaces called, user:', !!user);
    if (!user) {
      console.log('[WorkspaceContext] No user, clearing workspaces');
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentUserRole(null);
      setLoading(false);
      return;
    }

    try {
      console.log('[WorkspaceContext] Fetching memberships...');
      setError(null);
      const { data, error } = await db.getMyMemberships();
      
      if (error) {
        console.error('[WorkspaceContext] Error fetching memberships:', error);
        setError(error.message);
        setWorkspaces([]);
        setCurrentWorkspace(null);
        setCurrentUserRole(null);
      } else if (data) {
        console.log('[WorkspaceContext] Found memberships:', data.length);
        // Convert memberships to workspaces format
        const workspaceData = data.map(membership => ({
          id: membership.workspace_id,
          name: membership.name,
          slug: membership.slug,
          created_at: membership.joined_at,
          updated_at: membership.joined_at,
          created_by: '' // Will be populated separately if needed
        }));
        
        // Create role mapping
        const roleMapping: Record<string, 'viewer' | 'member' | 'admin'> = {};
        data.forEach(membership => {
          roleMapping[membership.workspace_id] = membership.role;
        });
        
        setWorkspaces(workspaceData);
        
        // Auto-select workspace logic
        if (workspaceData.length > 0) {
          let selectedWorkspace = currentWorkspace;
          let selectedRole = currentUserRole;
          
          // If no current workspace set, or current workspace not in list, select first one
          if (!currentWorkspace || !workspaceData.find(w => w.id === currentWorkspace.id)) {
            selectedWorkspace = workspaceData[0];
            selectedRole = roleMapping[workspaceData[0].id];
            setCurrentWorkspace(selectedWorkspace);
          } else {
            // Update role for current workspace
            selectedRole = roleMapping[currentWorkspace.id] || null;
          }
          
          setCurrentUserRole(selectedRole);
        } else {
          setCurrentWorkspace(null);
          setCurrentUserRole(null);
        }
      }
    } catch (err: any) {
      setError('Failed to load workspaces');
      console.error('[WorkspaceContext] Error loading workspaces:', err);
    } finally {
      console.log('[WorkspaceContext] Setting loading to false');
      setLoading(false);
    }
  };

  const createWorkspace = async (name: string) => {
    try {
      setError(null);
      setLoading(true); // Show loading during creation
      
      const { data, error } = await db.createWorkspace(name);
      
      if (error) {
        setError(typeof error === 'string' ? error : error.message || 'Unknown error');
        return { error };
      } else if (data) {
        // Add the new workspace to the current list immediately
        setWorkspaces(prev => [...prev, data]);
        setCurrentWorkspace(data);
        setCurrentUserRole('admin'); // Creator is always admin
        return { workspace: data };
      }
      
      return { error: 'Unknown error' };
    } catch (err: any) {
      setError('Failed to create workspace');
      console.error('Error creating workspace:', err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkspace = async (workspaceId: string) => {
    try {
      console.log('WorkspaceContext deleteWorkspace called:', { workspaceId, currentUserRole });
      setError(null);
      
      // Check if user is admin
      if (currentUserRole !== 'admin') {
        console.log('User is not admin, cannot delete workspace');
        return { error: new Error('Only admins can delete workspaces') };
      }

      // Note: When deleting entire workspace, admin count restriction doesn't apply
      // since the workspace and all members will be removed
      console.log('Proceeding to delete entire workspace (admin restriction not applicable for workspace deletion)');

      console.log('Attempting to delete workspace...');
      const { error } = await db.deleteWorkspace(workspaceId);
      console.log('Delete result:', { error });
      
      if (error) {
        setError(error.message);
        return { error };
      } else {
        // Remove workspace from list
        setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
        
        // If this was the current workspace, select another one
        if (currentWorkspace?.id === workspaceId) {
          const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);
          if (remainingWorkspaces.length > 0) {
            setCurrentWorkspace(remainingWorkspaces[0]);
            // We'll need to refresh to get the correct role for the new workspace
            await refreshWorkspaces();
          } else {
            setCurrentWorkspace(null);
            setCurrentUserRole(null);
          }
        }
        
        console.log('Workspace deleted successfully');
        return { success: true };
      }
    } catch (err: any) {
      setError('Failed to delete workspace');
      console.error('Error deleting workspace:', err);
      return { error: err };
    }
  };

  const leaveWorkspace = async (workspaceId: string) => {
    try {
      console.log('WorkspaceContext leaveWorkspace called:', { workspaceId, currentUserRole });
      setError(null);
      
      // Check if user is the only admin
      if (currentUserRole === 'admin') {
        console.log('User is admin, checking for other admins...');
        const { members, error: membersError } = await getWorkspaceMembers(workspaceId);
        console.log('Members check result:', { members, membersError });
        
        if (membersError) {
          console.error('Error fetching members:', membersError);
          return { error: membersError };
        }
        
        if (members) {
          const adminCount = members.filter(member => member.role === 'admin').length;
          console.log('Admin count:', adminCount);
          if (adminCount <= 1) {
            console.log('Cannot leave - user is only admin');
            return { error: new Error('Cannot leave workspace: You are the only admin. Please promote another member to admin first.') };
          }
        }
      }

      console.log('Attempting to leave workspace...');
      const { error } = await db.leaveWorkspace(workspaceId);
      console.log('Leave result:', { error });
      
      if (error) {
        setError(error.message);
        return { error };
      } else {
        // Remove workspace from list
        setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
        
        // If this was the current workspace, select another one
        if (currentWorkspace?.id === workspaceId) {
          const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);
          if (remainingWorkspaces.length > 0) {
            setCurrentWorkspace(remainingWorkspaces[0]);
            // We'll need to refresh to get the correct role for the new workspace
            await refreshWorkspaces();
          } else {
            setCurrentWorkspace(null);
            setCurrentUserRole(null);
          }
        }
        
        console.log('Left workspace successfully');
        return { success: true };
      }
    } catch (err: any) {
      setError('Failed to leave workspace');
      console.error('Error leaving workspace:', err);
      return { error: err };
    }
  };

  const getWorkspaceMembers = async (workspaceId: string) => {
    try {
      const { data, error } = await db.getWorkspaceMembers(workspaceId);
      
      if (error) {
        return { error };
      } else {
        return { members: data };
      }
    } catch (err: any) {
      console.error('Error getting workspace members:', err);
      return { error: err };
    }
  };

  useEffect(() => {
    console.log('[WorkspaceContext] useEffect triggered - authLoading:', authLoading, 'user:', !!user);
    if (!authLoading && user) {
      console.log('[WorkspaceContext] Auth loaded with user, refreshing workspaces');
      refreshWorkspaces();
    } else if (!authLoading && !user) {
      console.log('[WorkspaceContext] Auth loaded without user, clearing state');
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
    } else {
      console.log('[WorkspaceContext] Still waiting for auth to load');
    }
  }, [user, authLoading]);

  // Debug log the combined loading state (only when not loading)
  const combinedLoading = authLoading || loading;
  
  // Only log when we have meaningful data (not during initial load)

    console.log('[WorkspaceContext] State:', {
      authLoading,
      workspaceLoading: loading,
      combinedLoading,
      hasUser: !!user,
      workspacesCount: workspaces.length,
      currentWorkspace: currentWorkspace?.name || 'None selected',
      currentWorkspaceId: currentWorkspace?.id
    });
  

  // Log when everything is fully loaded
  useEffect(() => {
    if (!authLoading && !loading && user && currentWorkspace) {
      console.log('[WorkspaceContext] ✅ FULLY LOADED:', {
        user: user.email,
        currentWorkspace: currentWorkspace.name,
        workspaceId: currentWorkspace.id,
        userRole: currentUserRole,
        totalWorkspaces: workspaces.length
      });
    }
  }, [authLoading, loading, user, currentWorkspace, currentUserRole, workspaces.length]);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    currentUserRole,
    loading: combinedLoading,
    workspaceLoading: loading,
    error,
    setCurrentWorkspace,
    refreshWorkspaces,
    createWorkspace,
    deleteWorkspace,
    leaveWorkspace,
    getWorkspaceMembers,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}