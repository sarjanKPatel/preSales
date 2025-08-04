// =============================================
// Vision Database Operations
// CRUD operations for company profiles/vision
// =============================================

import { supabase, handleDatabaseResponse, getCurrentUser, logDatabaseError, validateRequiredFields, sanitizeData } from '../shared/client';
import type { CompanyProfile, CreateCompanyProfile, UpdateCompanyProfile, DatabaseResponse, PaginationOptions, FilterOptions } from '../shared/types';

// =============================================
// CREATE OPERATIONS
// =============================================

export async function createCompanyProfile(data: CreateCompanyProfile): Promise<DatabaseResponse<CompanyProfile>> {
  try {
    // Validate required fields
    const validationError = validateRequiredFields(data, ['name', 'user_id']);
    if (validationError) {
      return { data: null, error: validationError };
    }

    // Ensure company_vision and metadata are objects
    const profileData = {
      ...data,
      company_vision: data.company_vision || {},
      metadata: data.metadata || {}
    };

    const { data: profile, error } = await supabase
      .from('sales_company_profiles')
      .insert(sanitizeData(profileData))
      .select()
      .single();

    return handleDatabaseResponse(profile, error);
  } catch (error) {
    logDatabaseError('createCompanyProfile', error, data);
    return { data: null, error: 'Failed to create company profile' };
  }
}

// =============================================
// READ OPERATIONS
// =============================================

export async function getCompanyProfiles(
  options: PaginationOptions & FilterOptions = {}
): Promise<DatabaseResponse<CompanyProfile[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    let query = supabase
      .from('sales_company_profiles')
      .select('*')
      .eq('user_id', user.id);

    // Apply search filter
    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,metadata->>description.ilike.%${options.search}%`);
    }

    // Apply status filter
    if (options.status && options.status !== 'all') {
      query = query.eq('metadata->>status', options.status);
    }

    // Apply sorting and pagination
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: profiles, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    return { 
      data: profiles, 
      error: error?.message || null,
      count: count || 0
    };
  } catch (error) {
    logDatabaseError('getCompanyProfiles', error, options);
    return { data: null, error: 'Failed to fetch company profiles' };
  }
}

export async function getCompanyProfileById(id: string): Promise<DatabaseResponse<CompanyProfile>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: profile, error } = await supabase
      .from('sales_company_profiles')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    return handleDatabaseResponse(profile, error);
  } catch (error) {
    logDatabaseError('getCompanyProfileById', error, { id });
    return { data: null, error: 'Failed to fetch company profile' };
  }
}

export async function getPrimaryCompanyProfile(): Promise<DatabaseResponse<CompanyProfile>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: profile, error } = await supabase
      .from('sales_company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('metadata->>is_primary', 'true')
      .single();

    return handleDatabaseResponse(profile, error);
  } catch (error) {
    logDatabaseError('getPrimaryCompanyProfile', error);
    return { data: null, error: 'Failed to fetch primary company profile' };
  }
}

export async function getCompanyProfilesByStatus(status: string): Promise<DatabaseResponse<CompanyProfile[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: profiles, error } = await supabase
      .from('sales_company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('metadata->>status', status)
      .order('created_at', { ascending: false });

    return handleDatabaseResponse(profiles || [], error);
  } catch (error) {
    logDatabaseError('getCompanyProfilesByStatus', error, { status });
    return { data: null, error: 'Failed to fetch company profiles by status' };
  }
}

// =============================================
// UPDATE OPERATIONS
// =============================================

export async function updateCompanyProfile(
  id: string, 
  updates: UpdateCompanyProfile
): Promise<DatabaseResponse<CompanyProfile>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Remove undefined values and ensure proper structure
    const updateData = sanitizeData(updates);
    
    // Ensure metadata exists if we're updating it
    if (updateData.metadata) {
      updateData.metadata = { ...updateData.metadata };
    }

    const { data: profile, error } = await supabase
      .from('sales_company_profiles')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    return handleDatabaseResponse(profile, error);
  } catch (error) {
    logDatabaseError('updateCompanyProfile', error, { id, updates });
    return { data: null, error: 'Failed to update company profile' };
  }
}

export async function updateCompanyVision(
  id: string,
  vision: Partial<CompanyProfile['company_vision']>
): Promise<DatabaseResponse<CompanyProfile>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // First get the current profile to merge vision data
    const { data: currentProfile } = await getCompanyProfileById(id);
    if (!currentProfile) {
      return { data: null, error: 'Company profile not found' };
    }

    const updatedVision = {
      ...currentProfile.company_vision,
      ...vision
    };

    const { data: profile, error } = await supabase
      .from('sales_company_profiles')
      .update({ company_vision: updatedVision })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    return handleDatabaseResponse(profile, error);
  } catch (error) {
    logDatabaseError('updateCompanyVision', error, { id, vision });
    return { data: null, error: 'Failed to update company vision' };
  }
}

export async function setPrimaryCompanyProfile(id: string): Promise<DatabaseResponse<CompanyProfile>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // First, remove primary status from all other profiles
    await supabase
      .from('sales_company_profiles')
      .update({ 
        metadata: supabase.rpc('jsonb_set', {
          target: 'metadata',
          path: '{is_primary}',
          new_value: 'false'
        })
      })
      .eq('user_id', user.id)
      .neq('id', id);

    // Then set the selected profile as primary
    const { data: profile, error } = await supabase
      .from('sales_company_profiles')
      .update({ 
        metadata: supabase.rpc('jsonb_set', {
          target: 'metadata',
          path: '{is_primary}',
          new_value: 'true'
        })
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    return handleDatabaseResponse(profile, error);
  } catch (error) {
    logDatabaseError('setPrimaryCompanyProfile', error, { id });
    return { data: null, error: 'Failed to set primary company profile' };
  }
}

// =============================================
// DELETE OPERATIONS
// =============================================

export async function deleteCompanyProfile(id: string): Promise<DatabaseResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('sales_company_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    return { data: true, error: null };
  } catch (error) {
    logDatabaseError('deleteCompanyProfile', error, { id });
    return { data: null, error: 'Failed to delete company profile' };
  }
}

// =============================================
// UTILITY OPERATIONS
// =============================================

export async function getCompanyProfileStats(): Promise<DatabaseResponse<{
  total: number;
  active: number;
  draft: number;
  archived: number;
  primary: number;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: profiles, error } = await supabase
      .from('sales_company_profiles')
      .select('metadata')
      .eq('user_id', user.id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    const stats = {
      total: profiles?.length || 0,
      active: 0,
      draft: 0,
      archived: 0,
      primary: 0
    };

    profiles?.forEach(profile => {
      const status = profile.metadata?.status || 'active';
      const isPrimary = profile.metadata?.is_primary === true;

      if (status === 'active') stats.active++;
      else if (status === 'draft') stats.draft++;
      else if (status === 'archived') stats.archived++;

      if (isPrimary) stats.primary++;
    });

    return { data: stats, error: null };
  } catch (error) {
    logDatabaseError('getCompanyProfileStats', error);
    return { data: null, error: 'Failed to get company profile stats' };
  }
}

export async function searchCompanyProfiles(searchTerm: string): Promise<DatabaseResponse<CompanyProfile[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: profiles, error } = await supabase
      .from('sales_company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .or(`name.ilike.%${searchTerm}%,metadata->>description.ilike.%${searchTerm}%,metadata->>industry.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    return handleDatabaseResponse(profiles || [], error);
  } catch (error) {
    logDatabaseError('searchCompanyProfiles', error, { searchTerm });
    return { data: null, error: 'Failed to search company profiles' };
  }
}