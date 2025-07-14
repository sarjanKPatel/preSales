'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Proposal, ProposalSection } from '@/types';
import { db, supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import SectionManager from '@/components/sections/SectionManager';
import ChatInterface from '@/components/chat/ChatInterface';
import Button from '@/components/Button';
import { 
  ArrowLeft, 
  Download,
  Share,
  Loader2,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Users,
  GripVertical,
  Edit2,
  Check,
  X,
  MoreHorizontal,
  Archive
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
  const [chatWidth, setChatWidth] = useState(0); // Will be set based on screen width
  const [isResizing, setIsResizing] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchProposal();
    }
  }, [id]);

  // Set initial chat width based on screen width (35% on desktop, 100% on mobile)
  useEffect(() => {
    const updateChatWidth = () => {
      // Use window width for full viewport calculation
      const viewportWidth = window.innerWidth;
      // Only set width for desktop (lg breakpoint = 1024px)
      if (viewportWidth >= 1024) {
        setChatWidth(viewportWidth * 0.35);
      } else {
        setChatWidth(0); // Full width on mobile
      }
    };
    
    updateChatWidth();
    window.addEventListener('resize', updateChatWidth);
    
    return () => window.removeEventListener('resize', updateChatWidth);
  }, []);

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
    
    // Only allow resizing on desktop
    if (window.innerWidth >= 1024) {
      // Constrain chat width between 280px and 60% of container width
      const minWidth = 280;
      const maxWidth = containerRect.width * 0.6;
      
      if (newChatWidth >= minWidth && newChatWidth <= maxWidth) {
        setChatWidth(newChatWidth);
      }
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

  // Handle click outside for actions menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActionsMenu]);

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

  const handleArchive = async () => {
    if (!proposal) return;
    
    try {
      const { data } = await db.updateProposal(proposal.id, { 
        status: 'archived',
        updated_at: new Date().toISOString()
      });
      if (data) {
        setProposal(prev => prev ? { ...prev, status: 'archived' as const } : null);
      }
      setShowActionsMenu(false);
    } catch (err) {
      console.error('Error archiving proposal:', err);
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share proposal');
    setShowActionsMenu(false);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export proposal');
    setShowActionsMenu(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
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
    <Layout padding={false} maxWidth="full" className="h-full">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full" ref={containerRef}>
        {/* Chat Panel - Left Side on desktop, stacked on mobile */}
        <div 
          className={cn(
            "bg-white border-gray-200 flex flex-col",
            "lg:border-r lg:h-full lg:flex-shrink-0",
            "h-80 lg:h-auto border-b lg:border-b-0",
            "w-full lg:w-auto"
          )}
          style={{ 
            width: chatWidth > 0 ? `${chatWidth}px` : undefined,
            minWidth: chatWidth > 0 ? '280px' : undefined
          }}
        >
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

        {/* Resizer - Hidden on mobile */}
        <div
          className={cn(
            'hidden lg:flex w-1 bg-gray-200 hover:bg-primary cursor-col-resize items-center justify-center transition-colors',
            isResizing && 'bg-primary'
          )}
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>

        {/* Main Content - Right Side */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            {/* Mobile Layout */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-3">
                <Button
                  onClick={() => router.back()}
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2">
                  {/* Status Actions - Mobile */}
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
                  
                  {/* Actions Menu - Mobile */}
                  <div className="relative" ref={actionsMenuRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      aria-expanded={showActionsMenu}
                      aria-haspopup="true"
                      className="p-2"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      <span className="sr-only">More actions</span>
                    </Button>
                    
                    {showActionsMenu && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20 focus:outline-none">
                        {proposal.status !== 'archived' && (
                          <button
                            onClick={handleArchive}
                            onKeyDown={(e) => handleKeyDown(e, handleArchive)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center"
                            role="menuitem"
                            tabIndex={0}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </button>
                        )}
                        <button
                          onClick={handleShare}
                          onKeyDown={(e) => handleKeyDown(e, handleShare)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center"
                          role="menuitem"
                          tabIndex={0}
                        >
                          <Share className="w-4 h-4 mr-2" />
                          Share
                        </button>
                        <button
                          onClick={handleExport}
                          onKeyDown={(e) => handleKeyDown(e, handleExport)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center"
                          role="menuitem"
                          tabIndex={0}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    {proposal.title}
                  </h1>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-md border capitalize flex-shrink-0',
                    proposal.status === 'ready' && 'bg-success/10 text-success border-success/20',
                    proposal.status === 'draft' && 'bg-warning/10 text-warning border-warning/20',
                    proposal.status === 'archived' && 'bg-gray-100 text-gray-600 border-gray-200'
                  )}>
                    {proposal.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{proposal.company_name}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{formatDate(proposal.created_at)}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{formatAmount(proposal.amount)}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{proposal.proposal_sections?.length || 0} sections</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:block">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <Button
                    onClick={() => router.back()}
                    variant="ghost"
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-xl xl:text-2xl font-bold text-gray-900 truncate">
                        {proposal.title}
                      </h1>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-md border capitalize flex-shrink-0',
                        proposal.status === 'ready' && 'bg-success/10 text-success border-success/20',
                        proposal.status === 'draft' && 'bg-warning/10 text-warning border-warning/20',
                        proposal.status === 'archived' && 'bg-gray-100 text-gray-600 border-gray-200'
                      )}>
                        {proposal.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 xl:gap-4 text-sm text-gray-600 flex-wrap">
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 mr-1" />
                        <span className="truncate">{proposal.company_name}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{formatDate(proposal.created_at)}</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span>{formatAmount(proposal.amount)}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{proposal.proposal_sections?.length || 0} sections</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 xl:gap-3 flex-shrink-0">
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
                  
                  {/* Wide screens (>1300px) - Show all buttons separately */}
                  <div className="hidden min-[1300px]:flex items-center gap-2">
                    {proposal.status !== 'archived' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleArchive}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleShare} disabled>
                      <Share className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExport} disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  {/* Smaller screens (≤1300px) - Show dropdown menu */}
                  <div className="min-[1300px]:hidden relative" ref={actionsMenuRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      aria-expanded={showActionsMenu}
                      aria-haspopup="true"
                      aria-label="More actions"
                      className="px-3"
                    >
                      <MoreHorizontal className="w-4 h-4 mr-1" />
                      More
                    </Button>
                    
                    {showActionsMenu && (
                      <div 
                        className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="actions-menu"
                      >
                        {proposal.status !== 'archived' && (
                          <button
                            onClick={handleArchive}
                            onKeyDown={(e) => handleKeyDown(e, handleArchive)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center"
                            role="menuitem"
                            tabIndex={0}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </button>
                        )}
                        <button
                          onClick={handleShare}
                          onKeyDown={(e) => handleKeyDown(e, handleShare)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-500 cursor-not-allowed flex items-center"
                          role="menuitem"
                          tabIndex={-1}
                          disabled
                        >
                          <Share className="w-4 h-4 mr-2" />
                          Share
                        </button>
                        <button
                          onClick={handleExport}
                          onKeyDown={(e) => handleKeyDown(e, handleExport)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-500 cursor-not-allowed flex items-center"
                          role="menuitem"
                          tabIndex={-1}
                          disabled
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Description */}
            <EditableDescription 
              proposalId={proposal.id}
              description={proposal.description}
              onUpdate={(newDescription) => {
                setProposal(prev => prev ? { ...prev, description: newDescription } : null);
              }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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

// Editable Description Component with Realtime Updates
interface EditableDescriptionProps {
  proposalId: string;
  description?: string | null;
  onUpdate: (description: string) => void;
}

function EditableDescription({ proposalId, description, onUpdate }: EditableDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(description || '');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(description || '');
  }, [description]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`proposal-${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proposals',
          filter: `id=eq.${proposalId}`,
        },
        (payload) => {
          const newDescription = payload.new.description;
          if (newDescription !== description && !isEditing) {
            onUpdate(newDescription);
            setEditValue(newDescription || '');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId, description, isEditing, onUpdate]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [isEditing]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data, error } = await db.updateProposal(proposalId, {
        description: editValue.trim() || null,
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      onUpdate(editValue.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating description:', err);
      alert('Failed to update description');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(description || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              variant="primary"
              size="sm"
              disabled={saving}
              loading={saving}
            >
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              disabled={saving}
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a description for this proposal..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
        />
        <p className="text-xs text-gray-500">
          Press Cmd+Enter to save, Escape to cancel
        </p>
      </div>
    );
  }

  return (
    <div className="group">
      {description ? (
        <div className="flex items-start gap-2">
          <p className="text-gray-600 flex-1">{description}</p>
          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="text-gray-500 hover:text-gray-700 transition-colors text-sm flex items-center gap-2"
        >
          <Edit2 className="w-3 h-3" />
          Add description...
        </button>
      )}
    </div>
  );
}