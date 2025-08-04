// =============================================
// Proposals React Hooks
// Custom hooks for proposals and sections operations
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Proposal, ProposalSection, CreateProposal, UpdateProposal, PaginationOptions, FilterOptions } from '../shared/types';
import * as proposalsOps from './operations';

// Extended filter options for proposals
interface ProposalsFilterOptions extends FilterOptions {
  minAmount?: number;
  maxAmount?: number;
}

// =============================================
// PROPOSALS HOOKS
// =============================================

export function useProposals(options: PaginationOptions & ProposalsFilterOptions = {}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { user } = useAuth();

  const fetchProposals = useCallback(async () => {
    if (!user) {
      setProposals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await proposalsOps.getProposals(options);
    
    if (response.error) {
      setError(response.error);
      setProposals([]);
    } else {
      setProposals(response.data || []);
      setTotalCount(response.count || 0);
    }
    
    setLoading(false);
  }, [user, JSON.stringify(options)]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const refresh = useCallback(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    loading,
    error,
    totalCount,
    refresh
  };
}

export function useProposal(id: string | null) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProposal = useCallback(async () => {
    if (!user || !id) {
      setProposal(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await proposalsOps.getProposalById(id);
    
    if (response.error) {
      setError(response.error);
      setProposal(null);
    } else {
      setProposal(response.data);
    }
    
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  const refresh = useCallback(() => {
    fetchProposal();
  }, [fetchProposal]);

  return {
    proposal,
    loading,
    error,
    refresh
  };
}

export function useProposalWithSections(id: string | null) {
  const [proposal, setProposal] = useState<(Proposal & { sections: ProposalSection[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProposalWithSections = useCallback(async () => {
    if (!user || !id) {
      setProposal(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await proposalsOps.getProposalWithSections(id);
    
    if (response.error) {
      setError(response.error);
      setProposal(null);
    } else {
      setProposal(response.data);
    }
    
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchProposalWithSections();
  }, [fetchProposalWithSections]);

  const refresh = useCallback(() => {
    fetchProposalWithSections();
  }, [fetchProposalWithSections]);

  return {
    proposal,
    loading,
    error,
    refresh
  };
}

// =============================================
// PROPOSAL SECTIONS HOOKS
// =============================================

export function useProposalSections(proposalId: string | null) {
  const [sections, setSections] = useState<ProposalSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSections = useCallback(async () => {
    if (!user || !proposalId) {
      setSections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await proposalsOps.getProposalSections(proposalId);
    
    if (response.error) {
      setError(response.error);
      setSections([]);
    } else {
      setSections(response.data || []);
    }
    
    setLoading(false);
  }, [user, proposalId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const refresh = useCallback(() => {
    fetchSections();
  }, [fetchSections]);

  return {
    sections,
    loading,
    error,
    refresh
  };
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useCreateProposal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const createProposal = useCallback(async (data: Omit<CreateProposal, 'created_by'>) => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    const proposalData: CreateProposal = {
      ...data,
      created_by: user.id
    };

    const response = await proposalsOps.createProposal(proposalData);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, [user]);

  return {
    createProposal,
    loading,
    error
  };
}

export function useUpdateProposal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProposal = useCallback(async (id: string, updates: UpdateProposal) => {
    setLoading(true);
    setError(null);

    const response = await proposalsOps.updateProposal(id, updates);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  return {
    updateProposal,
    loading,
    error
  };
}

export function useDeleteProposal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProposal = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const response = await proposalsOps.deleteProposal(id);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return false;
    }
    
    return true;
  }, []);

  const duplicateProposal = useCallback(async (id: string, newTitle?: string) => {
    setLoading(true);
    setError(null);

    const response = await proposalsOps.duplicateProposal(id, newTitle);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  return {
    deleteProposal,
    duplicateProposal,
    loading,
    error
  };
}

// =============================================
// PROPOSAL SECTIONS MUTATION HOOKS
// =============================================

export function useCreateProposalSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSection = useCallback(async (data: {
    proposal_id: string;
    section_title: string;
    section_type: string;
    content: Record<string, any>;
    order_index: number;
    is_ai_generated?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    const response = await proposalsOps.createProposalSection(data);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  return {
    createSection,
    loading,
    error
  };
}

export function useUpdateProposalSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSection = useCallback(async (id: string, updates: {
    section_title?: string;
    section_type?: string;
    content?: Record<string, any>;
    order_index?: number;
    is_ai_generated?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    const response = await proposalsOps.updateProposalSection(id, updates);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  const reorderSections = useCallback(async (proposalId: string, sectionIds: string[]) => {
    setLoading(true);
    setError(null);

    const response = await proposalsOps.reorderProposalSections(proposalId, sectionIds);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return false;
    }
    
    return true;
  }, []);

  return {
    updateSection,
    reorderSections,
    loading,
    error
  };
}

export function useDeleteProposalSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSection = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const response = await proposalsOps.deleteProposalSection(id);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return false;
    }
    
    return true;
  }, []);

  return {
    deleteSection,
    loading,
    error
  };
}

// =============================================
// STATS AND UTILITY HOOKS
// =============================================

export function useProposalStats() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    draft: 0,
    totalValue: 0,
    avgValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats({
        total: 0,
        active: 0,
        inactive: 0,
        draft: 0,
        totalValue: 0,
        avgValue: 0
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await proposalsOps.getProposalStats();
    
    if (response.error) {
      setError(response.error);
    } else {
      setStats(response.data || {
        total: 0,
        active: 0,
        inactive: 0,
        draft: 0,
        totalValue: 0,
        avgValue: 0
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

export function useSearchProposals() {
  const [results, setResults] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await proposalsOps.searchProposals(searchTerm);
    
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