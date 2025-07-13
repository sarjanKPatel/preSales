'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Proposal, ProposalSection } from '@/types';
import { db } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import SectionManager from '@/components/sections/SectionManager';
import ChatInterface from '@/components/chat/ChatInterface';
import Button from '@/components/Button';
import { 
  ArrowLeft, 
  MessageSquare, 
  FileText, 
  Download,
  Share,
  Loader2,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Users,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatWidth, setChatWidth] = useState(350); // Default chat width
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchProposal();
    }
  }, [id]);

  const fetchProposal = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await db.getProposal(id);
      
      if (fetchError) throw fetchError;
      
      if (!data) {
        throw new Error('Proposal not found');
      }

      setProposal(data);
    } catch (err) {
      console.error('Error fetching proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionsChange = (sections: ProposalSection[]) => {
    if (proposal) {
      setProposal({
        ...proposal,
        proposal_sections: sections,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newChatWidth = e.clientX - containerRect.left;
    
    // Constrain chat width between 300px and 60% of container width
    const minWidth = 300;
    const maxWidth = containerRect.width * 0.6;
    
    if (newChatWidth >= minWidth && newChatWidth <= maxWidth) {
      setChatWidth(newChatWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const formatAmount = (amount?: number | null) => {
    if (!amount) return 'TBD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-600">
            Please sign in to view this proposal.
          </p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
          <span className="text-gray-600">Loading proposal...</span>
        </div>
      </Layout>
    );
  }

  if (error || !proposal) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Proposal
          </h3>
          <p className="text-gray-600 mb-4">{error || 'Proposal not found'}</p>
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={() => router.back()}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={fetchProposal}
              variant="primary"
            >
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentChatSession = proposal.chat_sessions?.[0] || null;

  return (
    <Layout padding={false} maxWidth="full">
      <div className="flex h-screen" ref={containerRef}>
        {/* Chat Panel - Left Side */}
        <div 
          className="bg-white border-r border-gray-200 flex flex-col"
          style={{ width: chatWidth }}
        >
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h2 className="font-medium text-gray-900">AI Assistant</h2>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Get help with your proposal content
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              proposalId={proposal.id}
              session={currentChatSession}
              onSessionCreated={(session) => {
                setProposal(prev => prev ? {
                  ...prev,
                  chat_sessions: [session, ...(prev.chat_sessions || [])]
                } : null);
              }}
              className="h-full"
            />
          </div>
        </div>

        {/* Resizer */}
        <div
          className={cn(
            'w-1 bg-gray-200 hover:bg-primary cursor-col-resize flex items-center justify-center transition-colors',
            isResizing && 'bg-primary'
          )}
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>

        {/* Main Content - Right Side */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => router.back()}
                  variant="ghost"
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {proposal.title}
                    </h1>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-md border capitalize',
                      proposal.status === 'ready' && 'bg-success/10 text-success border-success/20',
                      proposal.status === 'draft' && 'bg-warning/10 text-warning border-warning/20',
                      proposal.status === 'archived' && 'bg-gray-100 text-gray-600 border-gray-200'
                    )}>
                      {proposal.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-1" />
                      {proposal.company_name}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(proposal.created_at)}
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {formatAmount(proposal.amount)}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {proposal.proposal_sections?.length || 0} sections
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Status Actions */}
                {proposal.status === 'draft' && (
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={async () => {
                      try {
                        const { data } = await db.updateProposal(proposal.id, { 
                          status: 'ready',
                          updated_at: new Date().toISOString()
                        });
                        if (data) {
                          setProposal(prev => prev ? { ...prev, status: 'ready' as const } : null);
                        }
                      } catch (err) {
                        console.error('Error updating status:', err);
                      }
                    }}
                  >
                    Mark Ready
                  </Button>
                )}
                
                {proposal.status !== 'archived' && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={async () => {
                      try {
                        const { data } = await db.updateProposal(proposal.id, { 
                          status: 'archived',
                          updated_at: new Date().toISOString()
                        });
                        if (data) {
                          setProposal(prev => prev ? { ...prev, status: 'archived' as const } : null);
                        }
                      } catch (err) {
                        console.error('Error archiving proposal:', err);
                      }
                    }}
                  >
                    Archive
                  </Button>
                )}

                {/* Action Buttons */}
                <Button variant="ghost" size="sm" disabled>
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="ghost" size="sm" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Description */}
            {proposal.description && (
              <p className="text-gray-600">{proposal.description}</p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <SectionManager
              proposalId={proposal.id}
              sections={proposal.proposal_sections || []}
              onSectionsChange={handleSectionsChange}
              editable={true}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}