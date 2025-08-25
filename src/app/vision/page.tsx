'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import Button from '@/components/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import WorkspaceGate from '@/components/workspaces/WorkspaceGate';
import WaitlistGate from '@/components/auth/WaitlistGate';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import VisionCard from '@/components/vision/VisionCard';
import CreateVisionModal from '@/components/vision/CreateVisionModal';
import { VisionStatsCards, VisionFilters } from '@/components/vision';
import { db } from '@/lib/supabase';
import type { Vision, CreateVisionInput } from '@/types';

export default function CompanyVisionPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const router = useRouter();
  
  // DEBUG: Log component mounting and dependencies
  useEffect(() => {
    console.log('[VisionPage] Component mounted');
    console.log('[VisionPage] user:', !!user, user?.id);
    console.log('[VisionPage] currentWorkspace:', currentWorkspace?.id, currentWorkspace?.name);
  }, [user, currentWorkspace]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [visions, setVisions] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Load visions
  const loadVisions = useCallback(async () => {
    console.log('[VisionPage] loadVisions called');
    console.log('[VisionPage] currentWorkspace:', currentWorkspace?.id, currentWorkspace?.name);
    
    if (!currentWorkspace) {
      console.log('[VisionPage] No currentWorkspace, skipping load');
      return;
    }
    
    console.log('[VisionPage] Setting loading to true');
    setLoading(true);
    setError(null);
    
    try {
      console.log('[VisionPage] db object:', !!db);
      console.log('[VisionPage] getVisions function:', typeof db.getVisions);
      console.log('[VisionPage] Calling db.getVisions with workspaceId:', currentWorkspace.id);
      
      const { data, error: fetchError } = await db.getVisions(currentWorkspace.id);
      console.log('[VisionPage] getVisions result - data:', data?.length, 'error:', fetchError);
      
      if (fetchError) {
        console.error('[VisionPage] Database error:', fetchError);
        throw fetchError;
      }
      
      console.log('[VisionPage] Setting visions data:', data?.length || 0, 'items');
      setVisions(data || []);
      console.log('[VisionPage] Visions set successfully');
    } catch (err) {
      console.error('[VisionPage] Full error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load visions');
    } finally {
      console.log('[VisionPage] Setting loading to false');
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    console.log('[VisionPage] useEffect for loadVisions triggered');
    console.log('[VisionPage] loadVisions function:', typeof loadVisions);
    loadVisions();
  }, [loadVisions]);

  const handleCreateVision = useCallback(async (input: CreateVisionInput) => {
    if (!currentWorkspace) return;
    
    setCreateLoading(true);
    try {
      console.log('Creating vision with db.createVision:', db.createVision);
      const newVision = await db.createVision(currentWorkspace.id, input);
      setVisions(prev => [newVision, ...prev]);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Failed to create vision:', err);
      alert('Failed to create vision. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  }, [currentWorkspace]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    setSelectedStatus(status);
  }, []);

  const handleChatWithVision = useCallback((vision: Vision) => {
    router.push(`/chat?type=vision&visionId=${vision.id}`);
  }, [router]);

  const handleDeleteVision = useCallback(async (vision: Vision) => {
    try {
      await db.deleteVision(vision.id);
      setVisions(prev => prev.filter(v => v.id !== vision.id));
    } catch (err) {
      console.error('Failed to delete vision:', err);
    }
  }, []);

  const handleRenameVision = useCallback(async (vision: Vision, newTitle: string) => {
    try {
      await db.updateVision(vision.id, { title: newTitle });
      setVisions(prev => prev.map(v => 
        v.id === vision.id ? { ...v, title: newTitle } : v
      ));
    } catch (err) {
      console.error('Failed to rename vision:', err);
    }
  }, []);

  // Filter visions based on search and status
  const filteredVisions = visions.filter(vision => {
    const matchesSearch = !searchQuery || 
      vision.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || vision.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: visions.length,
    draft: visions.filter(v => v.status === 'draft').length,
    active: visions.filter(v => v.status === 'published').length, // published = active
    archived: visions.filter(v => v.status === 'archived').length,
    primary: 0, // Not implemented yet
  };

  return (
    <ProtectedRoute>
      <WaitlistGate>
        <WorkspaceGate>
          <Layout maxWidth="7xl" padding>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Strategic Visions</h1>
                <p className="text-gray-600 mt-2">
                  Create and develop strategic visions with AI-powered assistance
                </p>
              </div>
              {user && (
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Create New Vision
                </Button>
              )}
            </div>

            {/* Stats Cards */}
            <VisionStatsCards stats={stats} loading={loading} />

            {/* Filters */}
            <VisionFilters
              searchQuery={searchQuery}
              selectedStatus={selectedStatus}
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusChange}
            />

            {/* Vision Grid */}
            {error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadVisions}>Try Again</Button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse max-w-sm w-full">
                    <div className="bg-gray-200 rounded-lg h-64"></div>
                  </div>
                ))}
              </div>
            ) : filteredVisions.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || selectedStatus !== 'all' ? 'No visions found' : 'No visions yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || selectedStatus !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first strategic vision'
                  }
                </p>
                {(!searchQuery && selectedStatus === 'all') && (
                  <Button
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Create New Vision
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                {filteredVisions.map((vision) => (
                  <VisionCard
                    key={vision.id}
                    vision={vision}
                    onChat={handleChatWithVision}
                    onDelete={handleDeleteVision}
                    onRename={handleRenameVision}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Create Vision Modal */}
          <CreateVisionModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateVision}
            loading={createLoading}
          />
        </Layout>
        </WorkspaceGate>
      </WaitlistGate>
    </ProtectedRoute>
  );
}