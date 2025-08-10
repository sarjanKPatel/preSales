'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { db } from '@/lib/supabase';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { 
  Plus, 
  Mail, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Users,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Invite {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  created_at: string;
  invited_by: string;
}

export default function SettingsInvites() {
  const { currentWorkspace } = useWorkspace();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInvites = async () => {
    if (!currentWorkspace) return;
    
    try {
      setError('');
      // TODO: Replace with actual API call when invite functionality is implemented
      // For now, showing placeholder data
      setInvites([]);
    } catch (err: any) {
      setError('Failed to load invites');
      console.error('Load invites error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [currentWorkspace]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      setError('Email address is required');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!currentWorkspace) {
      setError('No workspace selected');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await db.createWorkspaceInvite(currentWorkspace.id, inviteEmail.trim());
      
      if (error) {
        setError(error.message || 'Failed to send invite');
      } else {
        setSuccess(`Invite sent to ${inviteEmail}`);
        setInviteEmail('');
        setShowInviteForm(false);
        loadInvites(); // Refresh the list
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Send invite error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'revoked':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'accepted':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'revoked':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'expired':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Team & Invites</h2>
        <p className="text-gray-600 mt-2">
          Invite team members to collaborate in <span className="font-medium">{currentWorkspace?.name}</span>
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

      {/* Invite Form */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Send Invitation</h3>
          {!showInviteForm && (
            <Button
              onClick={() => setShowInviteForm(true)}
              variant="primary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>

        {showInviteForm && (
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="colleague@company.com"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                They'll receive an email invitation to join your workspace
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                  if (error) setError('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting || !inviteEmail.trim()}
              >
                Send Invite
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Invites List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pending Invitations</h3>
          <Button
            onClick={loadInvites}
            variant="ghost"
            size="sm"
            loading={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading invitations...</p>
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations yet</h3>
            <p className="text-gray-500 mb-4">
              Invite team members to collaborate in your workspace.
            </p>
            {!showInviteForm && (
              <Button
                onClick={() => setShowInviteForm(true)}
                variant="primary"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Send First Invite
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between min-h-16 px-6 py-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{invite.email}</div>
                    <div className="text-sm text-gray-500">
                      Invited {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(invite.status)}`}>
                    {getStatusIcon(invite.status)}
                    {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                  </span>
                  {invite.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Team Collaboration</h4>
            <p className="text-sm text-blue-700">
              Invited members will have access to all workspace features including proposals, leads, and AI chat. 
              They can collaborate on projects and contribute to your team's success.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}