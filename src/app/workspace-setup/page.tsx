'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Button from '@/components/Button';
import ScrollReveal from '@/components/ScrollReveal';
import { Building2, Users, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

export default function WorkspaceSetupPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { workspaces, loading: workspaceLoading, createWorkspace } = useWorkspace();
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (profile?.waitlist_status === 'pending') {
      router.push('/waitlist');
      return;
    }
  }, [user, profile, authLoading, workspaceLoading, router]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!workspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }
    
    if (workspaceName.length < 2) {
      setError('Workspace name must be at least 2 characters long');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const result = await createWorkspace(workspaceName.trim());
      if (result.success && result.workspace) {
        // Redirect to main workspace home page
        router.push('/workspace');
      } else {
        setError(result.error || 'Failed to create workspace');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Workspace creation error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (value: string) => {
    setWorkspaceName(value);
    if (error) setError('');
  };

  // Show loading state
  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      {/* Full-width dot pattern background */}
      <div 
        className="absolute inset-0 w-full h-full dot-grid-bg"
        style={{
          width: '100vw',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      ></div>
      
      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <ScrollReveal direction="down">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center">
                <svg 
                  className="w-7 h-7 text-white" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2L14 8H10L12 2Z" fill="currentColor" opacity="0.9" />
                  <path d="M8 8L6 12L10 10L8 8Z" fill="currentColor" opacity="0.7" />
                  <path d="M16 8L18 12L14 10L16 8Z" fill="currentColor" opacity="0.7" />
                  <circle cx="12" cy="10" r="2" fill="currentColor" />
                  <path d="M6 14L12 16L18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
                  <path d="M7 17L12 18.5L17 17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
                  <path d="M10 16L11 20L12 18L13 20L14 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-600">PropelIQ</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-700 mb-6 leading-tight">
              Create your workspace
            </h1>
            <p className="text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
              Set up your team's workspace to start creating winning proposals together
            </p>
          </div>
        </ScrollReveal>

        {/* Features Grid */}
        <ScrollReveal direction="up" delay={200}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="glass-floating rounded-2xl p-6 text-center border-0">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-2">Organized Space</h3>
              <p className="text-sm text-gray-500">Keep all your proposals and projects organized in one place</p>
            </div>
            <div className="glass-floating rounded-2xl p-6 text-center border-0">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-2">Team Collaboration</h3>
              <p className="text-sm text-gray-500">Invite team members and work together seamlessly</p>
            </div>
            <div className="glass-floating rounded-2xl p-6 text-center border-0">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-2">AI-Powered</h3>
              <p className="text-sm text-gray-500">Leverage AI to create compelling proposals faster</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Create Workspace Form */}
        <ScrollReveal direction="up" delay={400}>
          <div className="glass-floating rounded-3xl p-8 border-0">
            <form onSubmit={handleCreateWorkspace} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50/90 backdrop-blur-sm border border-red-200/50 text-red-700 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Workspace Name Input */}
              <div>
                <label htmlFor="workspaceName" className="block text-lg font-semibold text-gray-700 mb-4 text-center">
                  What would you like to name your workspace?
                </label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center z-10 border border-white/40">
                    <Building2 className="w-4 h-4 text-gray-900" />
                  </div>
                  <input
                    id="workspaceName"
                    type="text"
                    value={workspaceName}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="e.g., Acme Sales Team, Marketing Department..."
                    className="w-full pl-11 pr-4 py-4 border-0 rounded-xl focus:ring-2 focus:ring-gray-400 focus:outline-none transition-all text-gray-900 placeholder-gray-500 text-lg"
                    required
                    disabled={isCreating}
                    maxLength={50}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Choose a name that represents your team or organization
                </p>
              </div>

              {/* Create Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-gray-600 hover:bg-gray-700 text-white border-0 rounded-xl text-lg py-4"
                loading={isCreating}
                disabled={isCreating || !workspaceName.trim()}
              >
                Create Workspace
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>

            {/* Welcome Message */}
            <div className="mt-6 text-center pt-6 border-t border-white/30">
              <p className="text-sm text-gray-600">
                Welcome to PropelIQ, {profile?.full_name ? profile.full_name.split(' ')[0] : 'there'}! 🎉
                <br />
                <span className="text-xs text-gray-500 mt-1 block">
                  Your workspace will be ready in seconds
                </span>
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}