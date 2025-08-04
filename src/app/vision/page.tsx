'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import Button from '@/components/Button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyProfiles, useCompanyProfileStats } from '@/database/vision/hooks';
import { VisionStatsCards, VisionFilters, VisionList } from '@/components/vision';
import type { CompanyProfile } from '@/database/shared/types';



export default function CompanyVisionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Fetch company profiles using database hooks
  const { profiles, loading, error, refresh } = useCompanyProfiles({
    search: searchQuery || undefined,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    limit: 50
  });
  
  const { stats, loading: statsLoading } = useCompanyProfileStats();

  const handleCreateNewVision = useCallback(() => {
    router.push('/chat?type=vision');
  }, [router]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    setSelectedStatus(status);
  }, []);

  const handleViewVision = useCallback((vision: CompanyProfile) => {
    console.log('View vision:', vision);
    // TODO: Implement view vision functionality
  }, []);

  const handleEditVision = useCallback((vision: CompanyProfile) => {
    console.log('Edit vision:', vision);
    // TODO: Implement edit vision functionality
  }, []);

  // Profiles are already filtered by the hook based on search and status
  const filteredVisions = profiles || [];

  return (
    <Layout maxWidth="7xl" padding>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Visions</h1>
            <p className="text-gray-600 mt-2">
              Manage multiple company visions for different clients and proposals
            </p>
          </div>
          {user && (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleCreateNewVision}
            >
              Create New Vision
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <VisionStatsCards stats={stats} loading={statsLoading} />

        {/* Filters */}
        <VisionFilters
          searchQuery={searchQuery}
          selectedStatus={selectedStatus}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
        />

        {/* Vision List */}
        <VisionList
          profiles={filteredVisions}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          selectedStatus={selectedStatus}
          onRefresh={refresh}
          onCreateVision={handleCreateNewVision}
          onViewVision={handleViewVision}
          onEditVision={handleEditVision}
        />
      </div>
    </Layout>
  );
}