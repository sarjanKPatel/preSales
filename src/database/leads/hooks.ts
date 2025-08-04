// =============================================
// Leads React Hooks
// Custom hooks for leads operations
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Lead, CreateLead, UpdateLead, PaginationOptions, FilterOptions } from '../shared/types';
import * as leadsOps from './operations';

// Extended filter options for leads
interface LeadsFilterOptions extends FilterOptions {
  industry?: string;
  priority?: string;
  minDealSize?: number;
  maxDealSize?: number;
}

// =============================================
// LEADS HOOKS
// =============================================

export function useLeads(options: PaginationOptions & LeadsFilterOptions = {}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { user } = useAuth();

  const fetchLeads = useCallback(async () => {
    if (!user) {
      setLeads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await leadsOps.getLeads(options);
    
    if (response.error) {
      setError(response.error);
      setLeads([]);
    } else {
      setLeads(response.data || []);
      setTotalCount(response.count || 0);
    }
    
    setLoading(false);
  }, [user, JSON.stringify(options)]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const refresh = useCallback(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    loading,
    error,
    totalCount,
    refresh
  };
}

export function useLead(id: string | null) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLead = useCallback(async () => {
    if (!user || !id) {
      setLead(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await leadsOps.getLeadById(id);
    
    if (response.error) {
      setError(response.error);
      setLead(null);
    } else {
      setLead(response.data);
    }
    
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const refresh = useCallback(() => {
    fetchLead();
  }, [fetchLead]);

  return {
    lead,
    loading,
    error,
    refresh
  };
}

export function useLeadsByStatus(status: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLeadsByStatus = useCallback(async () => {
    if (!user) {
      setLeads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await leadsOps.getLeadsByStatus(status);
    
    if (response.error) {
      setError(response.error);
      setLeads([]);
    } else {
      setLeads(response.data || []);
    }
    
    setLoading(false);
  }, [user, status]);

  useEffect(() => {
    fetchLeadsByStatus();
  }, [fetchLeadsByStatus]);

  const refresh = useCallback(() => {
    fetchLeadsByStatus();
  }, [fetchLeadsByStatus]);

  return {
    leads,
    loading,
    error,
    refresh
  };
}

export function useHighValueLeads(minDealSize: number = 100000) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchHighValueLeads = useCallback(async () => {
    if (!user) {
      setLeads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await leadsOps.getHighValueLeads(minDealSize);
    
    if (response.error) {
      setError(response.error);
      setLeads([]);
    } else {
      setLeads(response.data || []);
    }
    
    setLoading(false);
  }, [user, minDealSize]);

  useEffect(() => {
    fetchHighValueLeads();
  }, [fetchHighValueLeads]);

  const refresh = useCallback(() => {
    fetchHighValueLeads();
  }, [fetchHighValueLeads]);

  return {
    leads,
    loading,
    error,
    refresh
  };
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useCreateLead() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const createLead = useCallback(async (data: Omit<CreateLead, 'created_by'>) => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    const leadData: CreateLead = {
      ...data,
      created_by: user.id
    };

    const response = await leadsOps.createLead(leadData);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, [user]);

  return {
    createLead,
    loading,
    error
  };
}

export function useUpdateLead() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLead = useCallback(async (id: string, updates: UpdateLead) => {
    setLoading(true);
    setError(null);

    const response = await leadsOps.updateLead(id, updates);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  const updateStatus = useCallback(async (id: string, status: string, notes?: string) => {
    setLoading(true);
    setError(null);

    const response = await leadsOps.updateLeadStatus(id, status, notes);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  const updateMetadata = useCallback(async (id: string, metadata: Partial<Lead['metadata']>) => {
    setLoading(true);
    setError(null);

    const response = await leadsOps.updateLeadMetadata(id, metadata);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  return {
    updateLead,
    updateStatus,
    updateMetadata,
    loading,
    error
  };
}

export function useDeleteLead() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteLead = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const response = await leadsOps.deleteLead(id);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return false;
    }
    
    return true;
  }, []);

  const bulkDelete = useCallback(async (ids: string[]) => {
    setLoading(true);
    setError(null);

    const response = await leadsOps.bulkDeleteLeads(ids);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return false;
    }
    
    return true;
  }, []);

  return {
    deleteLead,
    bulkDelete,
    loading,
    error
  };
}

// =============================================
// STATS AND UTILITY HOOKS
// =============================================

export function useLeadStats() {
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    proposal_sent: 0,
    won: 0,
    lost: 0,
    totalPipeline: 0,
    avgDealSize: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats({
        total: 0,
        new: 0,
        contacted: 0,
        qualified: 0,
        proposal_sent: 0,
        won: 0,
        lost: 0,
        totalPipeline: 0,
        avgDealSize: 0,
        conversionRate: 0
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await leadsOps.getLeadStats();
    
    if (response.error) {
      setError(response.error);
    } else {
      setStats(response.data || {
        total: 0,
        new: 0,
        contacted: 0,
        qualified: 0,
        proposal_sent: 0,
        won: 0,
        lost: 0,
        totalPipeline: 0,
        avgDealSize: 0,
        conversionRate: 0
      });
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh
  };
}

export function useSearchLeads() {
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await leadsOps.searchLeads(searchTerm);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      setResults([]);
    } else {
      setResults(response.data || []);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults
  };
}

export function useLeadActivities(leadId: string | null) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchActivities = useCallback(async () => {
    if (!user || !leadId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await leadsOps.getLeadActivities(leadId);
    
    if (response.error) {
      setError(response.error);
      setActivities([]);
    } else {
      setActivities(response.data || []);
    }
    
    setLoading(false);
  }, [user, leadId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const refresh = useCallback(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refresh
  };
}