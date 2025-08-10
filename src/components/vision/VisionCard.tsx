'use client';

import React, { memo } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { 
  Building2, 
  Calendar, 
  Target, 
  Lightbulb, 
  TrendingUp, 
  Users, 
  Edit2, 
  Eye, 
  Star 
} from 'lucide-react';
import { cn } from '@/lib/utils';
// types removed

interface VisionCardProps {
  vision: any;
  onView?: (vision: any) => void;
  onEdit?: (vision: any) => void;
}

const statusColors = {
  active: 'glass bg-green-500/20 text-green-700 border border-green-500/30',
  draft: 'glass bg-yellow-500/20 text-yellow-700 border border-yellow-500/30',
  archived: 'glass bg-gray-500/20 text-gray-700 border border-gray-500/30'
};

const VisionCard = memo(function VisionCard({ vision, onView, onEdit }: VisionCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleView = () => onView?.(vision);
  const handleEdit = () => onEdit?.(vision);

  return (
    <Card className="p-6 hover:shadow-2xl transition-all cursor-pointer hover:scale-[1.01]">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 glass bg-primary/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-gray-900">{vision.name}</h3>
                {vision.metadata?.is_primary && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium capitalize",
                  statusColors[vision.metadata?.status as keyof typeof statusColors || 'active']
                )}>
                  {vision.metadata?.status || 'active'}
                </span>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Updated: {formatDate(vision.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} onClick={handleView}>
              View
            </Button>
            <Button variant="ghost" size="sm" icon={<Edit2 className="w-4 h-4" />} onClick={handleEdit}>
              Edit
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-gray-700">Mission</h4>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {vision.company_vision?.mission || 'No mission defined'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-green-600" />
                <h4 className="text-sm font-semibold text-gray-700">Core Values</h4>
              </div>
              <p className="text-sm text-gray-600">
                {Array.isArray(vision.company_vision?.values) 
                  ? vision.company_vision.values.join(', ') 
                  : vision.company_vision?.values || 'No values defined'}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-700">Goals</h4>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {Array.isArray(vision.company_vision?.goals)
                  ? vision.company_vision.goals.join('\n')
                  : vision.company_vision?.goals || 'No goals defined'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-semibold text-gray-700">Unique Value</h4>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {vision.company_vision?.uniqueValue || 'No unique value defined'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default VisionCard;