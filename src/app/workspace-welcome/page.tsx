'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Button from '@/components/Button';
import ScrollReveal from '@/components/ScrollReveal';
import { Building2, Users, FileText, MessageSquare, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';

function WorkspaceWelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const { currentWorkspace, setCurrentWorkspaceById, workspaces } = useWorkspace();
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    // Get workspace name from URL params or current workspace
    const nameFromParams = searchParams.get('name');
    const workspaceIdFromParams = searchParams.get('id');
    const nameFromWorkspace = currentWorkspace?.name;
    
    // If we have a workspace ID in params and no current workspace, set it
    if (workspaceIdFromParams && !currentWorkspace && workspaces.length > 0) {
      setCurrentWorkspaceById(workspaceIdFromParams);
    }
    
    // If we have a workspace name in params but no current workspace, find and set it
    if (nameFromParams && !currentWorkspace && workspaces.length > 0) {
      const matchingWorkspace = workspaces.find(w => w.name === nameFromParams);
      if (matchingWorkspace) {
        setCurrentWorkspaceById(matchingWorkspace.id);
      }
    }
    
    setWorkspaceName(nameFromParams || nameFromWorkspace || 'Your Workspace');
  }, [searchParams, currentWorkspace, workspaces, setCurrentWorkspaceById]);

  const handleContinue = () => {
    router.push('/vision');
  };

  const features = [
    {
      icon: FileText,
      title: 'Vision Builder',
      description: 'Create detailed project visions and requirements',
      href: '/vision'
    },
    {
      icon: Users,
      title: 'Lead Management',
      description: 'Track and manage your sales prospects',
      href: '/leads'
    },
    {
      icon: Building2,
      title: 'Proposals',
      description: 'Generate winning proposals with AI assistance',
      href: '/proposals'
    },
    {
      icon: MessageSquare,
      title: 'AI Assistant',
      description: 'Get intelligent help throughout your workflow',
      href: '/chat'
    }
  ];

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
      
      <div className="relative z-10 w-full max-w-4xl">
        {/* Header */}
        <ScrollReveal direction="down">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-600">PropelIQ</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-700 mb-6 leading-tight">
              Welcome to{' '}
              <span className="text-green-600">{workspaceName}</span>! 🎉
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Your workspace is ready! Here's what you can do with PropelIQ to accelerate your sales success.
            </p>
          </div>
        </ScrollReveal>

        {/* Success Message */}
        <ScrollReveal direction="up" delay={200}>
          <div className="glass-floating rounded-3xl p-8 border-0 mb-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              Workspace Created Successfully!
            </h2>
            <p className="text-gray-500">
              Hi {profile?.full_name ? profile.full_name.split(' ')[0] : 'there'}! 
              Your <strong>{workspaceName}</strong> workspace is now ready for your team.
            </p>
          </div>
        </ScrollReveal>

        {/* Features Grid */}
        <ScrollReveal direction="up" delay={400}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="glass-floating rounded-2xl p-6 border-0 hover:bg-white/70 transition-all duration-300 cursor-pointer group"
                onClick={() => router.push(feature.href)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-600 group-hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-700 mb-2 group-hover:text-gray-800 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Quick Actions */}
        <ScrollReveal direction="up" delay={600}>
          <div className="glass-floating rounded-3xl p-8 border-0">
            <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">
              Ready to get started?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleContinue}
                variant="primary"
                size="lg"
                className="bg-gray-600 hover:bg-gray-700 text-white border-0 rounded-xl"
              >
                Explore Your Workspace
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => router.push('/settings')}
                variant="outline"
                size="lg"
                className="border-2 border-gray-300 text-gray-600 hover:border-gray-400 rounded-xl"
              >
                Invite Team Members
                <Users className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </ScrollReveal>

        {/* Footer Message */}
        <ScrollReveal direction="up" delay={800}>
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Need help getting started?{' '}
              <a href="mailto:support@propeliq.ai" className="text-gray-700 hover:text-gray-800 font-medium transition-colors">
                Contact our support team
              </a>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

export default function WorkspaceWelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <WorkspaceWelcomeContent />
    </Suspense>
  );
}