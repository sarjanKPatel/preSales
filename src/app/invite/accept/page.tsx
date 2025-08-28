'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, supabase } from '@/lib/supabase';
import Layout from '@/components/layout/Layout';
import Button from '@/components/Button';
import { CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react';

function AcceptInvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
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
      // Get invite details
      const { data: invite, error: inviteError } = await supabase
        .from('workspace_invites')
        .select(`
          id,
          email,
          status,
          created_at,
          expires_at,
          workspaces!workspace_invites_workspace_id_fkey(name, slug),
          profiles!workspace_invites_invited_by_fkey(full_name)
        `)
        .eq('id', inviteId)
        .single();

      if (inviteError || !invite) {
        setError('Invitation not found or invalid');
        setLoading(false);
        return;
      }

      // Check if invite is expired
      if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      // Check invite status
      if (invite.status === 'accepted') {
        setSuccess('You have already accepted this invitation');
        setLoading(false);
        return;
      }

      if (invite.status === 'revoked') {
        setError('This invitation has been revoked by the workspace admin');
        setLoading(false);
        return;
      }

      if (invite.status === 'denied') {
        setError('You have already declined this invitation');
        setLoading(false);
        return;
      }

      setInviteData(invite);
      setLoading(false);

    } catch (err: any) {
      console.error('Failed to load invite details:', err);
      setError('Failed to load invitation details');
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteId || !user) {
      setError('Please sign in to accept this invitation');
      return;
    }

    // Check if user's email matches invite email
    if (profile?.email !== inviteData?.email) {
      setError(`This invitation was sent to ${inviteData?.email}. Please sign in with that email address.`);
      return;
    }

    setAccepting(true);
    setError('');

    try {
      const { error } = await db.acceptWorkspaceInvite(inviteId);
      
      if (error) {
        setError(error.message || 'Failed to accept invitation');
      } else {
        setSuccess(`Successfully joined ${inviteData.workspaces?.name}!`);
        
        // Redirect to workspace after 3 seconds
        setTimeout(() => {
          router.push('/workspace');
        }, 3000);
      }
    } catch (err: any) {
      console.error('Failed to accept invite:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleSignIn = () => {
    // Store the current URL to redirect back after sign in
    localStorage.setItem('redirect_after_auth', window.location.href);
    router.push('/auth/signin');
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
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Workspace Invitation</h1>
          </div>

          {/* Success State */}
          {success && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome aboard! 🎉</h2>
              <p className="text-gray-600 mb-4">{success}</p>
              <p className="text-sm text-gray-500">Redirecting you to your workspace...</p>
            </div>
          )}

          {/* Error State */}
          {error && !success && (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Accept Invitation</h2>
              <p className="text-red-600 mb-6">{error}</p>
              
              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={() => router.push('/workspace')}
                  className="w-full"
                >
                  Go to Workspaces
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  Go Home
                </Button>
              </div>
            </div>
          )}

          {/* Accept Invitation State */}
          {inviteData && !success && !error && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  You're invited to join
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-900">{inviteData.workspaces?.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Invited by {inviteData.profiles?.full_name || 'Unknown'} • {' '}
                    {new Date(inviteData.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Join this workspace to collaborate on proposals and access AI-powered insights.
                </p>
              </div>

              {!user ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 text-center">
                    Please sign in to accept this invitation
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleSignIn}
                    className="w-full"
                  >
                    Sign In to Accept
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    variant="primary"
                    onClick={handleAcceptInvite}
                    loading={accepting}
                    disabled={accepting}
                    className="w-full"
                  >
                    {accepting ? 'Accepting...' : 'Accept Invitation'}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/invite/decline?id=${inviteId}`)}
                    disabled={accepting}
                    className="w-full"
                  >
                    Decline
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function AcceptInvitePage() {
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
      <AcceptInvitePageContent />
    </Suspense>
  );
}