'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import Button from '@/components/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import WorkspaceGate from '@/components/workspaces/WorkspaceGate';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { VisionStatsCards, VisionFilters, VisionList } from '@/components/vision';
// types removed



export default function CompanyVisionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // TODO: Replace with new database integration
  const profiles: any[] = [];
  const loading = false;
  const error = null;
  const refresh = () => {};
  
  // TODO: Replace with new database integration
  const stats = { total: 0, draft: 0, active: 0, archived: 0, primary: 0 };
  const statsLoading = false;

  const handleCreateNewVision = useCallback(() => {
    router.push('/chat?type=vision');
  }, [router]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    setSelectedStatus(status);
  }, []);

  const handleViewVision = useCallback((vision: any) => {
    console.log('View vision:', vision);
    // TODO: Implement view vision functionality
  }, []);

  const handleEditVision = useCallback((vision: any) => {
    console.log('Edit vision:', vision);
    // TODO: Implement edit vision functionality
  }, []);

  // Profiles are already filtered by the hook based on search and status
  const filteredVisions = profiles || [];

  return (
    <ProtectedRoute>
      <WorkspaceGate>
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
      </WorkspaceGate>
    </ProtectedRoute>
  );
}