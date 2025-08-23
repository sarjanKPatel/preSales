'use client';

import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ScrollReveal from '@/components/ScrollReveal';
import { 
  Building2, 
  Users, 
  FileText, 
  MessageSquare, 
  Eye, 
  UserPlus,
  TrendingUp,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/Button';

export default function WorkspaceHomePage() {
  const { currentWorkspace } = useWorkspace();
  const { profile } = useAuth();

  const quickActions = [
    {
      title: 'Create Proposal',
      description: 'Start building a new proposal for your client',
      href: '/proposals',
      icon: FileText,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      title: 'AI Assistant',
      description: 'Get AI-powered insights and assistance',
      href: '/chat',
      icon: MessageSquare,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      title: 'Manage Leads',
      description: 'Track and organize your sales opportunities',
      href: '/leads',
      icon: TrendingUp,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      title: 'Vision Board',
      description: 'Visualize your sales strategy and goals',
      href: '/vision',
      icon: Eye,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    }
  ];


  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <ScrollReveal direction="down">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentWorkspace?.name || 'Workspace'}
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Welcome back, {profile?.full_name ? profile.full_name.split(' ')[0] : 'there'}! 
              Ready to create winning proposals with AI?
            </p>
          </div>
        </ScrollReveal>

        {/* Quick Actions Grid */}
        <ScrollReveal direction="up" delay={200}>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group block"
                >
                  <div className="glass-floating rounded-2xl p-6 border-0 hover:scale-105 transition-all duration-200">
                    <div className={`w-12 h-12 ${action.color} ${action.hoverColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-200`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">{action.description}</p>
                    <div className="flex items-center text-sm text-primary-600 group-hover:text-primary-700 transition-colors">
                      <span>Get started</span>
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>


        {/* Team Invitation CTA */}
        <ScrollReveal direction="up" delay={800}>
          <div className="glass-floating rounded-2xl p-8 border-0 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Invite Your Team</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Collaborate better by inviting team members to your workspace
            </p>
            <Button variant="primary" size="lg">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Team Members
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </Layout>
  );
}