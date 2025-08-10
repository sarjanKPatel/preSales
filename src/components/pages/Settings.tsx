'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import WorkspaceGate from '@/components/workspaces/WorkspaceGate';
import Layout from '@/components/layout/Layout';
import SettingsProfile from '@/components/settings/SettingsProfile';
import SettingsInvites from '@/components/settings/SettingsInvites';
import SettingsWorkspace from '@/components/settings/SettingsWorkspace';
import { User, UserPlus, Settings } from 'lucide-react';

type SettingsTab = 'profile' | 'invites' | 'workspace';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs = [
    {
      id: 'profile' as SettingsTab,
      name: 'Profile',
      icon: User,
      description: 'Manage your personal information'
    },
    {
      id: 'invites' as SettingsTab,
      name: 'Team & Invites',
      icon: UserPlus,
      description: 'Invite team members and manage workspace access'
    },
    {
      id: 'workspace' as SettingsTab,
      name: 'Workspace',
      icon: Settings,
      description: 'Manage workspace settings and membership'
    }
  ];

  return (
    <ProtectedRoute>
      <WorkspaceGate>
        <Layout padding={false} maxWidth="full">
          <div className="min-h-screen bg-gray-50">
            <div className="flex">
              {/* Sidebar */}
              <div className="w-72 bg-white shadow-sm border-r border-gray-200 min-h-screen">
                <div className="p-6 border-b border-gray-200">
                  <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
                  <p className="text-sm text-gray-500 mt-1">Manage your account and workspace</p>
                </div>
                
                <nav className="p-4">
                  <div className="space-y-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left rounded-lg ${
                          activeTab === tab.id
                            ? 'bg-primary-50 text-primary-600 border border-primary-200'
                            : 'text-gray-700'
                        }`}
                      >
                        <tab.icon className={`w-5 h-5 mt-0.5 ${
                          activeTab === tab.id ? 'text-primary-600' : 'text-gray-500'
                        }`} />
                        <div>
                          <div className="font-medium">{tab.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{tab.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </nav>
              </div>

              {/* Main Content */}
              <div className="flex-1">
                <div className="max-w-4xl mx-auto py-8 px-6">
                  {activeTab === 'profile' && <SettingsProfile />}
                  {activeTab === 'invites' && <SettingsInvites />}
                  {activeTab === 'workspace' && <SettingsWorkspace />}
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </WorkspaceGate>
    </ProtectedRoute>
  );
}