'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import { Brain, Clock, CheckCircle } from 'lucide-react';

export default function WaitlistPage() {
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();

  // Redirect if user is approved or not authenticated
  useEffect(() => {
    if (loading) return; // Wait for auth to load
    
    if (!user) {
      // Not authenticated, redirect to login
      router.push('/login');
      return;
    }
    
    if (profile?.waitlist_status === 'approved') {
      // User is approved, redirect to vision page
      router.push('/vision');
      return;
    }
  }, [user, profile, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-primary">PropelIQ</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're on the waitlist!</h1>
          <p className="text-gray-600">Thanks for signing up. We'll notify you when your account is ready.</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Pending Approval</h2>
            <p className="text-gray-600 text-sm">
              Your account for <strong>{user?.email}</strong> is currently being reviewed.
            </p>
          </div>

          {/* What's Next */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              What happens next?
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Our team will review your account within 24-48 hours</li>
              <li>• You'll receive an email notification when approved</li>
              <li>• Once approved, you can access all PropelIQ features</li>
            </ul>
          </div>

          {/* Debug Info - Temporary */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-yellow-800 mb-2">Debug Info:</h3>
              <p className="text-xs text-yellow-700">
                Status: {profile?.waitlist_status || 'undefined'}<br/>
                User ID: {user?.id}<br/>
                Profile ID: {profile?.id}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {profile?.waitlist_status === 'approved' && (
              <Button
                onClick={() => router.push('/vision')}
                variant="primary"
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Continue to Dashboard
              </Button>
            )}
            <Button
              onClick={handleSignOut}
              variant={profile?.waitlist_status === 'approved' ? 'ghost' : 'primary'}
              size="lg"
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Questions? Email us at{' '}
            <a href="mailto:support@propeliq.ai" className="text-primary hover:text-primary-600">
              support@propeliq.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}