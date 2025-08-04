'use client';

import React, { memo } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { Search, Filter } from 'lucide-react';

interface VisionFiltersProps {
  searchQuery: string;
  selectedStatus: string;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: string) => void;
}

const VisionFilters = memo(function VisionFilters({ 
  searchQuery, 
  selectedStatus, 
  onSearchChange, 
  onStatusChange 
}: VisionFiltersProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search visions..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass border border-white/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-4 py-2 glass border border-white/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <Button variant="ghost" icon={<Filter className="w-4 h-4" />}>
            More Filters
          </Button>
        </div>
      </div>
    </Card>
  );
});

export default VisionFilters;