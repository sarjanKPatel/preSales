// =============================================
// Vision React Hooks
// Custom hooks for vision/company profile operations
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { CompanyProfile, CreateCompanyProfile, UpdateCompanyProfile, PaginationOptions, FilterOptions } from '../shared/types';
import * as visionOps from './operations';

// =============================================
// COMPANY PROFILES HOOKS
// =============================================

export function useCompanyProfiles(options: PaginationOptions & FilterOptions = {}) {
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { user } = useAuth();

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await visionOps.getCompanyProfiles(options);
    
    if (response.error) {
      setError(response.error);
      setProfiles([]);
    } else {
      setProfiles(response.data || []);
      setTotalCount(response.count || 0);
    }
    
    setLoading(false);
  }, [user, JSON.stringify(options)]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const refresh = useCallback(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    profiles,
    loading,
    error,
    totalCount,
    refresh
  };
}

export function useCompanyProfile(id: string | null) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProfile = useCallback(async () => {
    if (!user || !id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await visionOps.getCompanyProfileById(id);
    
    if (response.error) {
      setError(response.error);
      setProfile(null);
    } else {
      setProfile(response.data);
    }
    
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refresh = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refresh
  };
}

export function usePrimaryCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPrimaryProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await visionOps.getPrimaryCompanyProfile();
    
    if (response.error) {
      setError(response.error);
      setProfile(null);
    } else {
      setProfile(response.data);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPrimaryProfile();
  }, [fetchPrimaryProfile]);

  const refresh = useCallback(() => {
    fetchPrimaryProfile();
  }, [fetchPrimaryProfile]);

  return {
    profile,
    loading,
    error,
    refresh
  };
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useCreateCompanyProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProfile = useCallback(async (data: CreateCompanyProfile) => {
    setLoading(true);
    setError(null);

    const response = await visionOps.createCompanyProfile(data);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  return {
    createProfile,
    loading,
    error
  };
}

export function useUpdateCompanyProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(async (id: string, updates: UpdateCompanyProfile) => {
    setLoading(true);
    setError(null);

    const response = await visionOps.updateCompanyProfile(id, updates);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  const updateVision = useCallback(async (id: string, vision: Partial<CompanyProfile['company_vision']>) => {
    setLoading(true);
    setError(null);

    const response = await visionOps.updateCompanyVision(id, vision);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  const setPrimary = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const response = await visionOps.setPrimaryCompanyProfile(id);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return null;
    }
    
    return response.data;
  }, []);

  return {
    updateProfile,
    updateVision,
    setPrimary,
    loading,
    error
  };
}

export function useDeleteCompanyProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProfile = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const response = await visionOps.deleteCompanyProfile(id);
    
    setLoading(false);
    
    if (response.error) {
      setError(response.error);
      return false;
    }
    
    return true;
  }, []);

  return {
    deleteProfile,
    loading,
    error
  };
}

// =============================================
// STATS AND UTILITY HOOKS
// =============================================

export function useCompanyProfileStats() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    archived: 0,
    primary: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats({ total: 0, active: 0, draft: 0, archived: 0, primary: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await visionOps.getCompanyProfileStats();
    
    if (response.error) {
      setError(response.error);
    } else {
      setStats(response.data || { total: 0, active: 0, draft: 0, archived: 0, primary: 0 });
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

export function useSearchCompanyProfiles() {
  const [results, setResults] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await visionOps.searchCompanyProfiles(searchTerm);
    
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