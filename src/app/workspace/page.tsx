'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ScrollReveal from '@/components/ScrollReveal';
import TypewriterText from '@/components/TypewriterText';
import { db } from '@/lib/supabase';
import WorkspaceSwitcher from '@/components/workspaces/WorkspaceSwitcher';
import { 
  Building2, 
  Users, 
  FileText, 
  MessageSquare, 
  Eye, 
  UserPlus,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Settings,
  Check,
  Plus,
  Mail,
  X,
  AlertCircle,
  CheckCircle,
  Crown,
  Shield,
  Send,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/Button';

export default function WorkspaceHomePage() {
  const router = useRouter();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const { profile } = useAuth();
  const [memberCount, setMemberCount] = useState<number>(0);
  
  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'member' | 'admin'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  
  // Pending invites state
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  
  // Workspace members and sent invites state
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [sentInvites, setSentInvites] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [revokingInvite, setRevokingInvite] = useState<string | null>(null);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [deletingInvite, setDeletingInvite] = useState<string | null>(null);

  const handleCreateWorkspace = () => {
    router.push('/workspace-setup');
  };

  const handleWorkspaceSelect = (workspace: any) => {
    if (currentWorkspace?.id !== workspace.id) {
      setCurrentWorkspace(workspace);
      // Force a page refresh to load the new workspace context
      window.location.href = '/workspace';
    }
  };

  const loadMemberCount = async () => {
    if (!currentWorkspace) return;
    
    try {
      const { data, error } = await db.getWorkspaceMembers(currentWorkspace.id);
      if (!error && data) {
        console.log('Loaded workspace members:', data);
        setMemberCount(data.length);
        setWorkspaceMembers(data);
      } else {
        console.error('Failed to load workspace members:', error);
      }
    } catch (error) {
      console.error('Failed to load member count:', error);
    }
  };

  const loadSentInvites = async () => {
    if (!currentWorkspace) return;
    
    try {
      const { data, error } = await db.getWorkspaceInvites(currentWorkspace.id);
      if (!error && data) {
        console.log('Loaded sent invites:', data);
        setSentInvites(data);
      } else {
        console.error('Failed to load sent invites:', error);
        // Set empty array on error to prevent loading states
        setSentInvites([]);
      }
    } catch (error) {
      console.error('Failed to load sent invites:', error);
      setSentInvites([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadPendingInvites = async () => {
    try {
      const { data, error } = await db.getMyPendingInvites();
      if (!error && data) {
        setPendingInvites(data);
      } else {
        console.error('Failed to load pending invites:', error);
        setPendingInvites([]);
      }
    } catch (error) {
      console.error('Failed to load pending invites:', error);
      setPendingInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string, workspaceName: string) => {
    try {
      const { error } = await db.acceptWorkspaceInvite(inviteId);
      if (error) {
        setInviteError(error.message || 'Failed to accept invitation');
        // Clear error message after 5 seconds
        setTimeout(() => setInviteError(''), 5000);
      } else {
        setInviteSuccess(`Successfully joined ${workspaceName}!`);
        loadPendingInvites(); // Refresh invites
        loadMemberCount(); // Refresh member count
        
        // Clear success message after 3 seconds
        setTimeout(() => setInviteSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
      setInviteError('An unexpected error occurred while accepting the invitation');
      setTimeout(() => setInviteError(''), 5000);
    }
  };

  const handleDenyInvite = async (inviteId: string, workspaceName: string) => {
    if (!confirm(`Are you sure you want to decline the invitation to join ${workspaceName}?`)) {
      return;
    }
    
    try {
      const { error } = await db.denyWorkspaceInvite(inviteId);
      if (!error) {
        loadPendingInvites(); // Refresh invites
      }
    } catch (error) {
      console.error('Failed to deny invite:', error);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      loadMemberCount();
      loadSentInvites();
      loadPendingInvites();
    }
  }, [currentWorkspace]);

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    setRevokingInvite(inviteId);
    
    try {
      const { error } = await db.revokeWorkspaceInvite(inviteId);
      if (error) {
        console.error('Failed to revoke invite:', error);
        setInviteError('Failed to revoke invitation. Please try again.');
        setTimeout(() => setInviteError(''), 5000);
      } else {
        // Refresh the sent invites list
        loadSentInvites();
        setInviteSuccess(`Invitation to ${email} has been revoked`);
        setTimeout(() => setInviteSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Failed to revoke invite:', error);
      setInviteError('Failed to revoke invitation. Please try again.');
      setTimeout(() => setInviteError(''), 5000);
    } finally {
      setRevokingInvite(null);
    }
  };

  const handleResendInvite = async (inviteId: string, email: string) => {
    setResendingInvite(inviteId);
    
    try {
      const { error } = await db.resendWorkspaceInvite(inviteId);
      if (error) {
        console.error('Failed to resend invite:', error);
        setInviteError('Failed to resend invitation. Please try again.');
        setTimeout(() => setInviteError(''), 5000);
      } else {
        // Refresh the sent invites list
        loadSentInvites();
        setInviteSuccess(`Invitation resent to ${email}`);
        setTimeout(() => setInviteSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Failed to resend invite:', error);
      setInviteError('Failed to resend invitation. Please try again.');
      setTimeout(() => setInviteError(''), 5000);
    } finally {
      setResendingInvite(null);
    }
  };

  const handleDeleteInvite = async (inviteId: string, email: string) => {
    setDeletingInvite(inviteId);
    
    try {
      const { error } = await db.deleteWorkspaceInvite(inviteId);
      if (error) {
        console.error('Failed to delete invite:', error);
        setInviteError('Failed to delete invitation. Please try again.');
        setTimeout(() => setInviteError(''), 5000);
      } else {
        // Refresh the sent invites list
        loadSentInvites();
        setInviteSuccess(`Invitation to ${email} has been deleted`);
        setTimeout(() => setInviteSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Failed to delete invite:', error);
      setInviteError('Failed to delete invitation. Please try again.');
      setTimeout(() => setInviteError(''), 5000);
    } finally {
      setDeletingInvite(null);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      setInviteError('Email address is required');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      setInviteError('Please enter a valid email address');
      return;
    }

    if (!currentWorkspace) {
      setInviteError('No workspace selected');
      return;
    }

    setIsInviting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const { error } = await db.createWorkspaceInvite(currentWorkspace.id, inviteEmail.trim(), inviteRole);
      
      if (error) {
        setInviteError(error.message || 'Failed to send invite');
      } else {
        setInviteSuccess(`Invite sent to ${inviteEmail} as ${inviteRole}!`);
        setInviteEmail('');
        setInviteRole('member'); // Reset to default
        loadMemberCount(); // Refresh member count
        loadSentInvites(); // Refresh sent invites
        
        // Auto-close modal after success
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteSuccess('');
        }, 2000);
      }
    } catch (err: any) {
      setInviteError('An unexpected error occurred. Please try again.');
      console.error('Send invite error:', err);
    } finally {
      setIsInviting(false);
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('member');
    setInviteError('');
    setInviteSuccess('');
  };

  const quickActions = [
    {
      title: 'Vision',
      description: 'Create and develop strategic visions with AI-powered assistance',
      href: '/vision',
      icon: FileText,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      title: 'Leads',
      description: 'Track and manage your sales opportunities',
      href: '/leads',
      icon: Users,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      title: 'Proposals',
      description: 'Build compelling proposals that win deals',
      href: '/proposals',
      icon: FileText,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      title: 'AI Assistant',
      description: 'Get AI-powered insights and assistance for your sales process',
      href: '/chat',
      icon: MessageSquare,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    }
  ];


  return (
    <Layout>
      <div className="space-y-8">
        {/* Header with Typewriter Effect */}
        <ScrollReveal direction="down">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 min-h-[2.25rem] flex items-center">
                <TypewriterText 
                  text={`Welcome to ${currentWorkspace?.name || 'your workspace'}!`}
                  speed={80}
                  className="text-3xl font-bold text-gray-900"
                  cursorClassName="bg-primary-600"
                />
              </h1>
            </div>
            
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Hey {profile?.full_name ? profile.full_name.split(' ')[0] : 'there'}! 
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

        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <ScrollReveal direction="up" delay={600}>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-blue-900">Pending Invitations</h2>
                  <p className="text-sm text-blue-700">You have workspace invitations waiting for your response</p>
                </div>
              </div>
              
              {/* Error Message for Invites */}
              {inviteError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{inviteError}</span>
                </div>
              )}
              
              {/* Success Message for Invites */}
              {inviteSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg mb-4">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{inviteSuccess}</span>
                </div>
              )}
              
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{invite.workspaces?.name}</h3>
                        <p className="text-sm text-gray-600">
                          Invited by {invite.profiles?.full_name || 'Unknown'} • 
                          {new Date(invite.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptInvite(invite.id, invite.workspaces?.name)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDenyInvite(invite.id, invite.workspaces?.name)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Workspace Management */}
        <ScrollReveal direction="up" delay={800}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Header with stats */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Workspace Management</h3>
                  <p className="text-sm text-gray-500 mt-1">Control your workspace settings and team</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">1</div>
                    <div className="text-xs text-gray-500">Active</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{memberCount}</div>
                    <div className="text-xs text-gray-500">Members</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Management Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Workspace Control */}
                <div className="space-y-4 h-fit">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Workspace</h4>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleCreateWorkspace}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create
                    </Button>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 h-80">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-gray-900">Select Workspace</p>
                        <p className="text-sm text-gray-600">Choose your active workspace</p>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    
                    {/* Workspace List with Scroll */}
                    <div className="h-56 overflow-y-auto space-y-3 pr-2" style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#CBD5E1 #F1F5F9'
                    }}>
                      {workspaces.map((workspace) => (
                        <div 
                          key={workspace.id}
                          onClick={() => handleWorkspaceSelect(workspace)}
                          className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-blue-100 hover:border-blue-200 cursor-pointer transition-all hover:shadow-sm group flex-shrink-0"
                        >
                          {/* Custom Checkbox */}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            currentWorkspace?.id === workspace.id 
                              ? 'bg-blue-600 border-blue-600' 
                              : 'border-gray-300 group-hover:border-blue-400'
                          }`}>
                            {currentWorkspace?.id === workspace.id && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          
                          {/* Workspace Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            currentWorkspace?.id === workspace.id 
                              ? 'bg-blue-100' 
                              : 'bg-gray-100'
                          }`}>
                            <Building2 className={`w-4 h-4 ${
                              currentWorkspace?.id === workspace.id 
                                ? 'text-blue-600' 
                                : 'text-gray-500'
                            }`} />
                          </div>
                          
                          {/* Workspace Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${
                              currentWorkspace?.id === workspace.id 
                                ? 'text-blue-900' 
                                : 'text-gray-900'
                            }`}>
                              {workspace.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{workspace.slug}</p>
                          </div>
                          
                          {/* Active Badge */}
                          {currentWorkspace?.id === workspace.id && (
                            <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              Active
                            </div>
                          )}
                        </div>
                      ))}
                      
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Sparkles className="w-4 h-4" />
                    <span>Switch seamlessly between projects</span>
                  </div>
                </div>

                {/* Team Management */}
                <div className="space-y-4 h-fit">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Team Members</h4>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowInviteModal(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100 h-80 overflow-y-auto">
                    {loadingMembers ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Current Members */}
                        {workspaceMembers && workspaceMembers.length > 0 ? (
                          <div>
                            <h5 className="font-medium text-green-800 mb-3 text-sm">Members ({workspaceMembers.length})</h5>
                            <div className="space-y-2">
                              {workspaceMembers.map((member) => {
                                const getRoleIcon = (role: string) => {
                                  switch (role) {
                                    case 'admin': return <Crown className="w-4 h-4 text-amber-600" />;
                                    case 'member': return <Shield className="w-4 h-4 text-blue-600" />;
                                    case 'viewer': return <FileText className="w-4 h-4 text-gray-600" />;
                                    default: return <Users className="w-4 h-4 text-gray-600" />;
                                  }
                                };
                                
                                const isCurrentUser = member.user_id === profile?.id;
                                
                                return (
                                  <div key={member.user_id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                      <Users className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900 text-sm">
                                        {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                                        {isCurrentUser && <span className="text-xs text-gray-500 ml-1">(You)</span>}
                                      </p>
                                      <p className="text-xs text-gray-600">{member.profiles?.email}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {getRoleIcon(member.role)}
                                      <span className="text-xs text-gray-600 capitalize">{member.role}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          !loadingMembers && (
                            <div>
                              <h5 className="font-medium text-green-800 mb-3 text-sm">Members (0)</h5>
                              <div className="text-center py-4">
                                <p className="text-sm text-gray-600">No members found. This might be a data loading issue.</p>
                              </div>
                            </div>
                          )
                        )}

                        {/* Sent Invites */}
                        {sentInvites && sentInvites.length > 0 && (
                          <div className={(workspaceMembers && workspaceMembers.length > 0) ? 'border-t border-green-200 pt-4' : ''}>
                            <h5 className="font-medium text-green-800 mb-3 text-sm">
                              Sent Invites ({sentInvites.length})
                            </h5>
                            <div className="space-y-2">
                              {sentInvites.map((invite) => (
                                <div key={invite.id} className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-green-200">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    invite.status === 'pending' 
                                      ? 'bg-yellow-100' 
                                      : 'bg-red-100'
                                  }`}>
                                    <Mail className={`w-4 h-4 ${
                                      invite.status === 'pending' 
                                        ? 'text-yellow-600' 
                                        : 'text-red-600'
                                    }`} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 text-sm">{invite.email}</p>
                                    <p className="text-xs text-gray-600">
                                      Invited {new Date(invite.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                                      invite.status === 'pending' 
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : invite.status === 'revoked'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {invite.status || 'pending'}
                                    </span>
                                    
                                    {invite.status === 'pending' && (
                                      <button
                                        onClick={() => handleRevokeInvite(invite.id, invite.email)}
                                        disabled={revokingInvite === invite.id}
                                        className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                        title="Revoke invitation"
                                      >
                                        {revokingInvite === invite.id ? 'Revoking...' : 'Revoke'}
                                      </button>
                                    )}
                                    
                                    {invite.status === 'revoked' && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleResendInvite(invite.id, invite.email)}
                                          disabled={resendingInvite === invite.id}
                                          className="text-xs text-green-600 hover:text-green-800 px-2 py-1 hover:bg-green-50 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                          title="Resend invitation"
                                        >
                                          <Send className="w-3 h-3" />
                                          {resendingInvite === invite.id ? 'Resending...' : 'Resend'}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteInvite(invite.id, invite.email)}
                                          disabled={deletingInvite === invite.id}
                                          className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                          title="Delete invitation permanently"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          {deletingInvite === invite.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Empty State */}
                        {(!workspaceMembers || workspaceMembers.length === 0) && (!sentInvites || sentInvites.length === 0) && !loadingMembers && (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <UserPlus className="w-6 h-6 text-green-600" />
                            </div>
                            <h5 className="font-semibold text-gray-900 mb-2">Ready to collaborate?</h5>
                            <p className="text-sm text-gray-600 mb-4">Invite team members to work together on proposals</p>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
                              onClick={() => setShowInviteModal(true)}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Invite Team
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <TrendingUp className="w-4 h-4" />
                    <span>Boost productivity with teamwork</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>System Status: All Good</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link 
                    href="/settings" 
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Advanced Settings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Invite Team Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
              <button
                onClick={closeInviteModal}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleInviteSubmit} className="p-6">
              {/* Success Message */}
              {inviteSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg mb-4">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{inviteSuccess}</span>
                </div>
              )}

              {/* Error Message */}
              {inviteError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{inviteError}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="mb-6">
                <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600" />
                  <input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      if (inviteError) setInviteError('');
                    }}
                    placeholder="colleague@company.com"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    required
                    disabled={isInviting}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  They'll receive an email invitation to join <strong>{currentWorkspace?.name}</strong>
                </p>
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Role
                </label>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <input
                      id="role-viewer"
                      type="radio"
                      name="role"
                      value="viewer"
                      checked={inviteRole === 'viewer'}
                      onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'member' | 'admin')}
                      className="mt-1 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      disabled={isInviting}
                    />
                    <label htmlFor="role-viewer" className="ml-3 text-sm">
                      <div className="font-medium text-gray-900">Viewer</div>
                      <div className="text-gray-500">Can view content but cannot edit or create</div>
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      id="role-member"
                      type="radio"
                      name="role"
                      value="member"
                      checked={inviteRole === 'member'}
                      onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'member' | 'admin')}
                      className="mt-1 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      disabled={isInviting}
                    />
                    <label htmlFor="role-member" className="ml-3 text-sm">
                      <div className="font-medium text-gray-900">Member</div>
                      <div className="text-gray-500">Can create, edit, and collaborate on content</div>
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      id="role-admin"
                      type="radio"
                      name="role"
                      value="admin"
                      checked={inviteRole === 'admin'}
                      onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'member' | 'admin')}
                      className="mt-1 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      disabled={isInviting}
                    />
                    <label htmlFor="role-admin" className="ml-3 text-sm">
                      <div className="font-medium text-gray-900">Admin</div>
                      <div className="text-gray-500">Full access including workspace management</div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeInviteModal}
                  disabled={isInviting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isInviting}
                  disabled={isInviting || !inviteEmail.trim()}
                >
                  Send Invite
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}