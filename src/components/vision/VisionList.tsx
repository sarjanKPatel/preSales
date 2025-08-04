'use client';

import React, { memo } from 'react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import VisionCard from './VisionCard';
import VisionEmptyState from './VisionEmptyState';
import { Loader2 } from 'lucide-react';
import type { CompanyProfile } from '@/database/shared/types';

interface VisionListProps {
  profiles: CompanyProfile[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedStatus: string;
  onRefresh: () => void;
  onCreateVision?: () => void;
  onViewVision?: (vision: CompanyProfile) => void;
  onEditVision?: (vision: CompanyProfile) => void;
}

const VisionList = memo(function VisionList({
  profiles,
  loading,
  error,
  searchQuery,
  selectedStatus,
  onRefresh,
  onCreateVision,
  onViewVision,
  onEditVision
}: VisionListProps) {
  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Loading visions...</span>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="text-red-800">
          <p className="font-medium">Error loading visions</p>
          <p className="text-sm mt-1">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh}
            className="mt-2 text-red-700 hover:text-red-800"
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  // Empty State
  if (profiles.length === 0) {
    return (
      <VisionEmptyState
        searchQuery={searchQuery}
        selectedStatus={selectedStatus}
        hasVisions={false}
        onCreateVision={onCreateVision}
      />
    );
  }

  // Vision Cards List
  return (
    <div className="space-y-4">
      {profiles.map((vision) => (
        <VisionCard
          key={vision.id}
          vision={vision}
          onView={onViewVision}
          onEdit={onEditVision}
        />
      ))}
    </div>
  );
});

export default VisionList;