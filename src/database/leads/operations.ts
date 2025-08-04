// =============================================
// Leads Database Operations
// CRUD operations for leads management
// =============================================

import { supabase, handleDatabaseResponse, getCurrentUser, logDatabaseError, validateRequiredFields, sanitizeData } from '../shared/client';
import type { Lead, CreateLead, UpdateLead, DatabaseResponse, PaginationOptions, FilterOptions } from '../shared/types';

// =============================================
// CREATE OPERATIONS
// =============================================

export async function createLead(data: CreateLead): Promise<DatabaseResponse<Lead>> {
  try {
    // Validate required fields
    const validationError = validateRequiredFields(data, ['company_name', 'contact_name', 'contact_email', 'created_by']);
    if (validationError) {
      return { data: null, error: validationError };
    }

    // Ensure metadata is an object
    const leadData = {
      ...data,
      metadata: data.metadata || {}
    };

    const { data: lead, error } = await supabase
      .from('leads')
      .insert(sanitizeData(leadData))
      .select()
      .single();

    return handleDatabaseResponse(lead, error);
  } catch (error) {
    logDatabaseError('createLead', error, data);
    return { data: null, error: 'Failed to create lead' };
  }
}

// =============================================
// READ OPERATIONS
// =============================================

export async function getLeads(
  options: PaginationOptions & FilterOptions = {}
): Promise<DatabaseResponse<Lead[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    let query = supabase
      .from('leads')
      .select('*')
      .eq('created_by', user.id);

    // Apply search filter
    if (options.search) {
      query = query.or(`company_name.ilike.%${options.search}%,contact_name.ilike.%${options.search}%,contact_email.ilike.%${options.search}%`);
    }

    // Apply status filter
    if (options.status && options.status !== 'all') {
      query = query.eq('metadata->>status', options.status);
    }

    // Apply industry filter
    if (options.industry && options.industry !== 'all') {
      query = query.eq('metadata->>industry', options.industry);
    }

    // Apply priority filter
    if (options.priority && options.priority !== 'all') {
      query = query.eq('metadata->>priority', options.priority);
    }

    // Apply deal size filter
    if (options.minDealSize) {
      query = query.gte('metadata->>deal_size', options.minDealSize.toString());
    }
    if (options.maxDealSize) {
      query = query.lte('metadata->>deal_size', options.maxDealSize.toString());
    }

    // Apply sorting and pagination
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: leads, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    return { 
      data: leads, 
      error: error?.message || null,
      count: count || 0
    };
  } catch (error) {
    logDatabaseError('getLeads', error, options);
    return { data: null, error: 'Failed to fetch leads' };
  }
}

export async function getLeadById(id: string): Promise<DatabaseResponse<Lead>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('created_by', user.id)
      .single();

    return handleDatabaseResponse(lead, error);
  } catch (error) {
    logDatabaseError('getLeadById', error, { id });
    return { data: null, error: 'Failed to fetch lead' };
  }
}

export async function getLeadsByStatus(status: string): Promise<DatabaseResponse<Lead[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('created_by', user.id)
      .eq('metadata->>status', status)
      .order('created_at', { ascending: false });

    return handleDatabaseResponse(leads || [], error);
  } catch (error) {
    logDatabaseError('getLeadsByStatus', error, { status });
    return { data: null, error: 'Failed to fetch leads by status' };
  }
}

export async function getLeadsByIndustry(industry: string): Promise<DatabaseResponse<Lead[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('created_by', user.id)
      .eq('metadata->>industry', industry)
      .order('created_at', { ascending: false });

    return handleDatabaseResponse(leads || [], error);
  } catch (error) {
    logDatabaseError('getLeadsByIndustry', error, { industry });
    return { data: null, error: 'Failed to fetch leads by industry' };
  }
}

export async function getHighValueLeads(minDealSize: number = 100000): Promise<DatabaseResponse<Lead[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('created_by', user.id)
      .gte('metadata->>deal_size', minDealSize.toString())
      .order('metadata->>deal_size', { ascending: false });

    return handleDatabaseResponse(leads || [], error);
  } catch (error) {
    logDatabaseError('getHighValueLeads', error, { minDealSize });
    return { data: null, error: 'Failed to fetch high value leads' };
  }
}

// =============================================
// UPDATE OPERATIONS
// =============================================

export async function updateLead(
  id: string, 
  updates: UpdateLead
): Promise<DatabaseResponse<Lead>> {
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

    const { data: lead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    return handleDatabaseResponse(lead, error);
  } catch (error) {
    logDatabaseError('updateLead', error, { id, updates });
    return { data: null, error: 'Failed to update lead' };
  }
}

export async function updateLeadStatus(
  id: string,
  status: string,
  notes?: string
): Promise<DatabaseResponse<Lead>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // First get the current lead to merge metadata
    const { data: currentLead } = await getLeadById(id);
    if (!currentLead) {
      return { data: null, error: 'Lead not found' };
    }

    const updatedMetadata = {
      ...currentLead.metadata,
      status,
      last_contact: new Date().toISOString(),
      ...(notes && { notes: notes })
    };

    const { data: lead, error } = await supabase
      .from('leads')
      .update({ metadata: updatedMetadata })
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    return handleDatabaseResponse(lead, error);
  } catch (error) {
    logDatabaseError('updateLeadStatus', error, { id, status, notes });
    return { data: null, error: 'Failed to update lead status' };
  }
}

export async function updateLeadMetadata(
  id: string,
  metadata: Partial<Lead['metadata']>
): Promise<DatabaseResponse<Lead>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // First get the current lead to merge metadata
    const { data: currentLead } = await getLeadById(id);
    if (!currentLead) {
      return { data: null, error: 'Lead not found' };
    }

    const updatedMetadata = {
      ...currentLead.metadata,
      ...metadata
    };

    const { data: lead, error } = await supabase
      .from('leads')
      .update({ metadata: updatedMetadata })
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    return handleDatabaseResponse(lead, error);
  } catch (error) {
    logDatabaseError('updateLeadMetadata', error, { id, metadata });
    return { data: null, error: 'Failed to update lead metadata' };
  }
}

// =============================================
// DELETE OPERATIONS
// =============================================

export async function deleteLead(id: string): Promise<DatabaseResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    return { data: true, error: null };
  } catch (error) {
    logDatabaseError('deleteLead', error, { id });
    return { data: null, error: 'Failed to delete lead' };
  }
}

export async function bulkDeleteLeads(ids: string[]): Promise<DatabaseResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', ids)
      .eq('created_by', user.id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    return { data: true, error: null };
  } catch (error) {
    logDatabaseError('bulkDeleteLeads', error, { ids });
    return { data: null, error: 'Failed to delete leads' };
  }
}

// =============================================
// UTILITY OPERATIONS
// =============================================

export async function getLeadStats(): Promise<DatabaseResponse<{
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  proposal_sent: number;
  won: number;
  lost: number;
  totalPipeline: number;
  avgDealSize: number;
  conversionRate: number;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('metadata')
      .eq('created_by', user.id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    const stats = {
      total: leads?.length || 0,
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal_sent: 0,
      won: 0,
      lost: 0,
      totalPipeline: 0,
      avgDealSize: 0,
      conversionRate: 0
    };

    let totalDealValue = 0;
    let dealsWithValue = 0;

    leads?.forEach(lead => {
      const status = lead.metadata?.status || 'new';
      const dealSize = parseFloat(lead.metadata?.deal_size) || 0;

      // Count by status
      if (status === 'new') stats.new++;
      else if (status === 'contacted') stats.contacted++;
      else if (status === 'qualified') stats.qualified++;
      else if (status === 'proposal_sent') stats.proposal_sent++;
      else if (status === 'won') stats.won++;
      else if (status === 'lost') stats.lost++;

      // Calculate pipeline value
      if (dealSize > 0 && status !== 'won' && status !== 'lost') {
        stats.totalPipeline += dealSize;
      }

      // Calculate average deal size
      if (dealSize > 0) {
        totalDealValue += dealSize;
        dealsWithValue++;
      }
    });

    // Calculate averages and rates
    stats.avgDealSize = dealsWithValue > 0 ? Math.round(totalDealValue / dealsWithValue) : 0;
    
    const totalDealsWithOutcome = stats.won + stats.lost;
    stats.conversionRate = totalDealsWithOutcome > 0 
      ? Math.round((stats.won / totalDealsWithOutcome) * 100) 
      : 0;

    return { data: stats, error: null };
  } catch (error) {
    logDatabaseError('getLeadStats', error);
    return { data: null, error: 'Failed to get lead stats' };
  }
}

export async function searchLeads(searchTerm: string): Promise<DatabaseResponse<Lead[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('created_by', user.id)
      .or(`company_name.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%,metadata->>industry.ilike.%${searchTerm}%,metadata->>notes.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    return handleDatabaseResponse(leads || [], error);
  } catch (error) {
    logDatabaseError('searchLeads', error, { searchTerm });
    return { data: null, error: 'Failed to search leads' };
  }
}

export async function getLeadActivities(id: string): Promise<DatabaseResponse<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // This would typically join with an activities table
    // For now, we'll return basic lead history from metadata
    const { data: lead } = await getLeadById(id);
    if (!lead) {
      return { data: null, error: 'Lead not found' };
    }

    // Extract activity data from metadata or return basic info
    const activities = [
      {
        id: 1,
        type: 'created',
        description: 'Lead created',
        timestamp: lead.created_at,
        user: 'System'
      },
      {
        id: 2,
        type: 'updated',
        description: 'Lead updated',
        timestamp: lead.updated_at,
        user: 'System'
      }
    ];

    return { data: activities, error: null };
  } catch (error) {
    logDatabaseError('getLeadActivities', error, { id });
    return { data: null, error: 'Failed to get lead activities' };
  }
}