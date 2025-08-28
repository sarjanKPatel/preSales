'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import WaitlistGate from '@/components/auth/WaitlistGate';
import WorkspaceGate from '@/components/workspaces/WorkspaceGate';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  Users, 
  FileText, 
  MessageSquare,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { profile } = useAuth();

  return (
    <ProtectedRoute>
      <WaitlistGate>
        <WorkspaceGate>
          <Layout maxWidth="7xl" padding>
            <div className="py-12">
              <div className="text-center mb-12">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Welcome to {currentWorkspace?.name}! 🎉
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Your workspace is ready. Let's start building amazing proposals with AI-powered insights.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Company Vision */}
                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 hover:border-blue-200">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Brain className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Company Vision</h3>
                  <p className="text-gray-600 mb-6 text-center leading-relaxed">
                    Define your company's vision, values, and strategic goals to create compelling proposals.
                  </p>
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => router.push('/workspace')}
                    className="w-full group"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                {/* Lead Information */}
                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 hover:border-green-200">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Users className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Lead Information</h3>
                  <p className="text-gray-600 mb-6 text-center leading-relaxed">
                    Manage your sales leads, opportunities, and prospect information in one place.
                  </p>
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => router.push('/leads')}
                    className="w-full group"
                  >
                    Manage Leads
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                {/* Proposals */}
                <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 hover:border-purple-200">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-7 h-7 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">AI Proposals</h3>
                  <p className="text-gray-600 mb-6 text-center leading-relaxed">
                    Create intelligent, data-driven proposals that win deals and impress clients.
                  </p>
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => router.push('/proposals')}
                    className="w-full group"
                  >
                    Create Proposal
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>

              {/* AI Chat CTA */}
              <div className="mt-16 max-w-4xl mx-auto">
                <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl p-8 text-center text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                  <div className="relative z-10">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-90" />
                    <h3 className="text-2xl font-bold mb-3">Need help getting started?</h3>
                    <p className="text-lg mb-6 opacity-90">
                      Chat with our AI assistant to brainstorm ideas, refine strategies, and get instant insights.
                    </p>
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      onClick={() => router.push('/chat')}
                      className="bg-white text-primary hover:bg-gray-100 font-semibold"
                    >
                      Start AI Chat
                      <MessageSquare className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Layout>
        </WorkspaceGate>
      </WaitlistGate>
    </ProtectedRoute>
  );
}