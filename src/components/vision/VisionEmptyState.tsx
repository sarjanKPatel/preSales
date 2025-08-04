'use client';

import React, { memo } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { Target, Plus } from 'lucide-react';

interface VisionEmptyStateProps {
  searchQuery: string;
  selectedStatus: string;
  hasVisions: boolean;
  onCreateVision?: () => void;
}

const VisionEmptyState = memo(function VisionEmptyState({ 
  searchQuery, 
  selectedStatus, 
  hasVisions, 
  onCreateVision 
}: VisionEmptyStateProps) {
  const isFiltered = searchQuery || selectedStatus !== 'all';
  
  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 glass bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Target className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No visions found</h3>
      <p className="text-gray-600">
        {isFiltered
          ? 'Try adjusting your search or filters'
          : 'Start by creating your first company vision'}
      </p>
      {!isFiltered && !hasVisions && onCreateVision && (
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={onCreateVision}
          className="mt-4"
        >
          Create New Vision
        </Button>
      )}
    </Card>
  );
});

export default VisionEmptyState;