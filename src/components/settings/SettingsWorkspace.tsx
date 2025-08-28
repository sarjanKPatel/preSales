'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { 
  AlertTriangle, 
  Users, 
  Crown, 
  Shield, 
  FileText,
  Trash2,
  LogOut,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

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

export default function SettingsWorkspace() {
  const { user } = useAuth();
  const { 
    currentWorkspace, 
    currentUserRole, 
    deleteWorkspace, 
    leaveWorkspace,
    getWorkspaceMembers 
  } = useWorkspace();
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const loadMembers = async () => {
    if (!currentWorkspace) return;
    
    console.log('Loading members for workspace:', currentWorkspace.id);
    try {
      setError('');
      const result = await getWorkspaceMembers(currentWorkspace.id);
      console.log('getWorkspaceMembers result:', result);
      
      if (result.error) {
        console.error('Members loading error:', result.error);
        setError('Failed to load workspace members');
      } else if (result.members) {
        console.log('Members loaded successfully:', result.members);
        setMembers(result.members);
      }
    } catch (err: any) {
      setError('Failed to load workspace members');
      console.error('Load members error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentWorkspace]);

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return;
    
    console.log('Starting delete workspace:', currentWorkspace.id);
    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      const result = await deleteWorkspace(currentWorkspace.id);
      console.log('Delete workspace result:', result);
      
      if (result.error) {
        console.error('Delete workspace error:', result.error);
        setError(result.error.message || 'Failed to delete workspace');
      } else if (result.success) {
        setSuccess('Workspace deleted successfully');
        setShowDeleteConfirm(false);
        // Context will handle navigation to another workspace or empty state
      }
    } catch (err: any) {
      setError('An unexpected error occurred');
      console.error('Delete workspace error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspace) return;
    
    console.log('Starting leave workspace:', currentWorkspace.id);
    setIsLeaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await leaveWorkspace(currentWorkspace.id);
      console.log('Leave workspace result:', result);
      
      if (result.error) {
        console.error('Leave workspace error:', result.error);
        setError(result.error.message || 'Failed to leave workspace');
      } else if (result.success) {
        setSuccess('Left workspace successfully');
        setShowLeaveConfirm(false);
        // Context will handle navigation to another workspace or empty state
      }
    } catch (err: any) {
      setError('An unexpected error occurred');
      console.error('Leave workspace error:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'member':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <FileText className="w-4 h-4 text-gray-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'member':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'viewer':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const adminCount = members.filter(member => member.role === 'admin').length;
  const canDelete = currentUserRole === 'admin'; // Admins can always delete workspace
  const canLeave = currentUserRole !== 'admin' || adminCount > 1; // Only admin can't leave if they're the only admin
  
  console.log('Button state:', 
    'members:', members.length, 
    'adminCount:', adminCount, 
    'currentUserRole:', currentUserRole, 
    'canDelete:', canDelete, 
    'canLeave:', canLeave
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Workspace Settings</h2>
        <p className="text-gray-600 mt-2">
          Manage settings for <span className="font-medium">{currentWorkspace?.name}</span>
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Workspace Members */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workspace Members</h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading members...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between min-h-16 px-6 py-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                      {member.user_id === user?.id && (
                        <span className="ml-2 text-sm text-gray-500">(You)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{member.profiles?.email}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getRoleColor(member.role)}`}>
                  {getRoleIcon(member.role)}
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h4 className="font-medium text-red-900">Danger Zone</h4>
            <p className="text-sm text-red-700">
              These actions are irreversible. Please be certain before proceeding.
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
              {/* Leave Workspace */}
              <div className="flex items-center justify-between min-h-16 px-6 py-4 bg-white rounded-lg border border-red-200">
                <div>
                  <h5 className="text-sm font-medium text-gray-900">Leave Workspace</h5>
                  <p className="text-sm text-gray-600">
                    {canLeave 
                      ? "Remove yourself from this workspace"
                      : "You cannot leave as you are the only admin. Promote another member to admin first."
                    }
                  </p>
                </div>
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={() => {
                    console.log('Leave button clicked');
                    setShowLeaveConfirm(true);
                  }}
                  disabled={!canLeave}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave
                </Button>
              </div>

              {/* Delete Workspace - Admin Only */}
              {currentUserRole === 'admin' && (
                <div className="flex items-center justify-between min-h-16 px-6 py-4 bg-white rounded-lg border border-red-200">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900">Delete Workspace</h5>
                    <p className="text-sm text-gray-600">
                      {canDelete
                        ? "Permanently delete this workspace and all its data"
                        : "Cannot delete workspace. Ensure there is at least one other admin."
                      }
                    </p>
                  </div>
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => {
                      console.log('Delete button clicked');
                      setShowDeleteConfirm(true);
                    }}
                    disabled={!canDelete}
                    className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Workspace</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{currentWorkspace?.name}</strong>? 
                This action cannot be undone and will permanently delete all data.
              </p>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="neutral"
                  onClick={handleDeleteWorkspace}
                  loading={isDeleting}
                  disabled={isDeleting}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  Delete Workspace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Leave Workspace</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to leave <strong>{currentWorkspace?.name}</strong>? 
                You will lose access to all data and will need to be re-invited to rejoin.
              </p>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowLeaveConfirm(false)}
                  disabled={isLeaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="neutral"
                  onClick={handleLeaveWorkspace}
                  loading={isLeaving}
                  disabled={isLeaving}
                  className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 hover:border-yellow-400"
                >
                  Leave Workspace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}