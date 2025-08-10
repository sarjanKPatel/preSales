'use client';

import React from 'react';
 
import { cn } from '@/lib/utils';
import Button from '@/components/Button';
import { 
  Calendar, 
  DollarSign, 
  Building2, 
  Archive,
  CheckCircle2
} from 'lucide-react';

interface ProposalCardProps {
  proposal: any;
  onClick?: (proposal: any) => void;
  onArchive?: (proposal: any) => void;
  onMarkReady?: (proposal: any) => void;
}

export default function ProposalCard({ 
  proposal, 
  onClick,
  onArchive,
  onMarkReady
}: ProposalCardProps) {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'draft':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'inactive':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(proposal);
    }
  };

  const handleArchive = () => {
    if (onArchive) {
      onArchive(proposal);
    }
  };

  const handleMarkReady = () => {
    if (onMarkReady) {
      onMarkReady(proposal);
    }
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer group"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
              {proposal.title}
            </h3>
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-md border capitalize',
              getStatusColor(proposal.status)
            )}>
              {proposal.status}
            </span>
          </div>
          <div className="flex items-center text-gray-600 mb-1">
            <Building2 className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">{proposal.company_name}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {proposal.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {proposal.description}
        </p>
      )}

      {/* Sections Count - removed until sections are loaded */}

      {/* Footer with Date and Amount */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mb-4">
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          {formatDate(proposal.created_at)}
        </div>
        <div className="flex items-center text-sm font-medium text-gray-900">
          <DollarSign className="w-4 h-4 mr-1" />
          {formatAmount(proposal.amount)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {proposal.status === 'draft' && onMarkReady && (
          <Button
            onClick={handleMarkReady}
            variant="primary"
            size="sm"
            className="flex-1 text-xs"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Mark Active
          </Button>
        )}
        
        {proposal.status !== 'inactive' && onArchive && (
          <Button
            onClick={handleArchive}
            variant="ghost"
            size="sm"
            className="flex-1 text-xs text-gray-600 hover:text-gray-900"
          >
            <Archive className="w-3 h-3 mr-1" />
            Archive
          </Button>
        )}
      </div>
    </div>
  );
}