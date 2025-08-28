'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, supabase } from '@/lib/supabase';
import Layout from '@/components/layout/Layout';
import Button from '@/components/Button';
import { CheckCircle, AlertCircle, Loader2, XCircle, Building2 } from 'lucide-react';

function DeclineInvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);
  
  const inviteId = searchParams.get('id');

  useEffect(() => {
    if (inviteId) {
      loadInviteDetails();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [inviteId, user]);

  const loadInviteDetails = async () => {
    try {
      // Get basic invite details
      const { data: invite, error: inviteError } = await supabase
        .from('workspace_invites')
        .select('id, email, status, created_at, expires_at, workspace_id, invited_by')
        .eq('id', inviteId)
        .single();

      if (inviteError || !invite) {
        setError('Invitation not found or invalid');
        setLoading(false);
        return;
      }

      // Get workspace details separately
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name, slug')
        .eq('id', invite.workspace_id)
        .single();

      // Get inviter profile separately  
      const { data: inviterProfile } = invite.invited_by ? 
        await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', invite.invited_by)
          .single() : 
        { data: null };

      // Combine the data
      const enrichedInvite = {
        ...invite,
        workspaces: workspace,
        profiles: inviterProfile
      };

      // Check invite status
      if (invite.status === 'accepted') {
        setError('This invitation has already been accepted');
        setLoading(false);
        return;
      }

      if (invite.status === 'revoked') {
        setError('This invitation has been revoked by the workspace admin');
        setLoading(false);
        return;
      }

      if (invite.status === 'denied') {
        setSuccess('You have already declined this invitation');
        setLoading(false);
        return;
      }

      setInviteData(enrichedInvite);
      setLoading(false);

    } catch (err: any) {
      console.error('Failed to load invite details:', err);
      setError('Failed to load invitation details');
      setLoading(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!inviteId) {
      setError('Invalid invitation');
      return;
    }

    setDeclining(true);
    setError('');

    try {
      const { error } = await db.denyWorkspaceInvite(inviteId);
      
      if (error) {
        setError(error.message || 'Failed to decline invitation');
      } else {
        setSuccess(`You have declined the invitation to join ${inviteData.workspaces?.name}.`);
      }
    } catch (err: any) {
      console.error('Failed to decline invite:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
            <p className="text-gray-600">Loading invitation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Decline Invitation</h1>
          </div>

          {/* Success State */}
          {success && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invitation Declined</h2>
              <p className="text-gray-600 mb-6">{success}</p>
              
              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  Go to PropelIQ
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !success && (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Decline</h2>
              <p className="text-red-600 mb-6">{error}</p>
              
              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  Go Home
                </Button>
              </div>
            </div>
          )}

          {/* Decline Confirmation State */}
          {inviteData && !success && !error && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Decline invitation to join
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-900">{inviteData.workspaces?.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Invited by {inviteData.profiles?.full_name || 'Unknown'} • {' '}
                    {new Date(inviteData.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Are you sure you want to decline this invitation? You can always ask to be invited again later.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  variant="neutral"
                  onClick={handleDeclineInvite}
                  loading={declining}
                  disabled={declining}
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                >
                  {declining ? 'Declining...' : 'Yes, Decline Invitation'}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/invite/accept?id=${inviteId}`)}
                  disabled={declining}
                  className="w-full"
                >
                  Actually, Accept Instead
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function DeclineInvitePage() {
  return (
    <Suspense fallback={
      <Layout maxWidth="2xl" padding={true}>
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
            <p className="mt-4 text-gray-600">Loading invitation...</p>
          </div>
        </div>
      </Layout>
    }>
      <DeclineInvitePageContent />
    </Suspense>
  );
}