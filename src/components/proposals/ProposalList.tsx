'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProposalCard from './ProposalCard';
import Button from '@/components/Button';
import { 
  Plus, 
  Search, 
  Filter, 
  Loader2,
  FileText,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useProposals, useProposalStats, useUpdateProposal } from '@/database/proposals/hooks';
import type { Proposal } from '@/database/shared/types';

interface ProposalListProps {
  onCreateProposal?: () => void;
  onChatAssist?: () => void;
  onOpenProposal?: (proposal: Proposal) => void;
}

export default function ProposalList({
  onCreateProposal,
  onChatAssist,
  onOpenProposal,
}: ProposalListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'ready' | 'archived'>('all');
  
  // Fetch proposals using database hooks
  const { proposals, loading, error, refresh } = useProposals({
    search: searchTerm || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 100
  });
  
  const { stats } = useProposalStats();
  const { updateProposal } = useUpdateProposal();


  // Proposals are already filtered by the hook based on search and status
  const filteredProposals = proposals || [];

  const handleArchiveProposal = async (proposal: Proposal) => {
    try {
      await updateProposal(proposal.id, {
        status: 'archived'
      });
      
      // Refresh the list to show updated data
      refresh();
    } catch (err) {
      console.error('Error archiving proposal:', err);
      alert('Failed to archive proposal');
    }
  };

  const handleMarkReady = async (proposal: Proposal) => {
    try {
      await updateProposal(proposal.id, {
        status: 'ready'
      });
      
      // Refresh the list to show updated data
      refresh();
    } catch (err) {
      console.error('Error marking proposal as ready:', err);
      alert('Failed to mark proposal as ready');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-600">
          Please sign in to view your proposals.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-600">Loading proposals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error Loading Proposals
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button 
          onClick={refresh}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-600">
            Manage and track your sales proposals
          </p>
        </div>
        <div className="flex gap-3">
          {onChatAssist && (
            <Button
              onClick={onChatAssist}
              variant="secondary"
              size="lg"
              className="flex items-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              AI Assist
            </Button>
          )}
          <Button
            onClick={onCreateProposal}
            variant="primary"
            size="lg"
            className="flex items-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Proposal
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search proposals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'ready' | 'archived')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {filteredProposals.length} of {stats.total} proposals
      </div>

      {/* Proposals Grid */}
      {filteredProposals.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {proposals.length === 0 ? 'No proposals yet' : 'No matching proposals'}
          </h3>
          <p className="text-gray-600 mb-6">
            {proposals.length === 0 
              ? 'Create your first proposal to get started with AI-powered sales automation.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          {proposals.length === 0 && (
            <Button
              onClick={onCreateProposal}
              variant="primary"
              size="lg"
              className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-bold text-lg px-8 py-4"
            >
              <Plus className="w-5 h-5 mr-3" />
              Create Your First Proposal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onClick={onOpenProposal}
              onArchive={handleArchiveProposal}
              onMarkReady={handleMarkReady}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden z-50">
        <Button
          onClick={onCreateProposal}
          variant="primary"
          size="lg"
          className="w-14 h-14 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-200 p-0 flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}