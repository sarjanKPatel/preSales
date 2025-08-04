'use client';

import React, { memo } from 'react';
import Card from '@/components/Card';
import { Target, Lightbulb, Edit2, Star, Loader2 } from 'lucide-react';

interface VisionStatsCardsProps {
  stats: {
    total: number;
    active: number;
    draft: number;
    archived: number;
    primary: number;
  };
  loading: boolean;
}

const VisionStatsCards = memo(function VisionStatsCards({ stats, loading }: VisionStatsCardsProps) {
  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    bgColor 
  }: { 
    title: string; 
    value: number; 
    icon: React.ComponentType<any>; 
    bgColor: string; 
  }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              value
            )}
          </p>
        </div>
        <div className={`w-10 h-10 glass ${bgColor} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        title="Total Visions"
        value={stats.total}
        icon={(props) => <Target {...props} className="w-5 h-5 text-blue-600" />}
        bgColor="bg-blue-500/20"
      />
      
      <StatCard
        title="Active"
        value={stats.active}
        icon={(props) => <Lightbulb {...props} className="w-5 h-5 text-green-600" />}
        bgColor="bg-green-500/20"
      />
      
      <StatCard
        title="Draft"
        value={stats.draft}
        icon={(props) => <Edit2 {...props} className="w-5 h-5 text-yellow-600" />}
        bgColor="bg-yellow-500/20"
      />
      
      <StatCard
        title="Primary Vision"
        value={stats.primary}
        icon={(props) => <Star {...props} className="w-5 h-5 text-purple-600" />}
        bgColor="bg-purple-500/20"
      />
    </div>
  );
});

export default VisionStatsCards;