'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface WaitlistGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function WaitlistGate({ children, fallback }: WaitlistGateProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return;

    // Redirect unauthenticated users to login
    if (!user) {
      router.push('/login');
      return;
    }

    // Redirect pending waitlist users to waitlist page
    if (profile?.waitlist_status === 'pending') {
      router.push('/waitlist');
      return;
    }
  }, [user, profile, loading, router]);

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-4 h-4 bg-white rounded"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show fallback if not authenticated
  if (!user) {
    return fallback || null;
  }

  // Show fallback if on waitlist
  if (profile?.waitlist_status === 'pending') {
    return fallback || null;
  }

  // User is authenticated and approved - show protected content
  return <>{children}</>;
}