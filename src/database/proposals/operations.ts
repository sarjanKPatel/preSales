// =============================================
// Proposals Database Operations
// CRUD operations for proposals and sections
// =============================================

import { supabase, handleDatabaseResponse, getCurrentUser, logDatabaseError, validateRequiredFields, sanitizeData } from '../shared/client';
import type { Proposal, ProposalSection, CreateProposal, UpdateProposal, DatabaseResponse, PaginationOptions, FilterOptions } from '../shared/types';

// =============================================
// PROPOSAL OPERATIONS
// =============================================

export async function createProposal(data: CreateProposal): Promise<DatabaseResponse<Proposal>> {
  try {
    // Validate required fields
    const validationError = validateRequiredFields(data, ['title', 'company_name', 'created_by']);
    if (validationError) {
      return { data: null, error: validationError };
    }

    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert(sanitizeData(data))
      .select()
      .single();

    return handleDatabaseResponse(proposal, error);
  } catch (error) {
    logDatabaseError('createProposal', error, data);
    return { data: null, error: 'Failed to create proposal' };
  }
}

export async function getProposals(
  options: PaginationOptions & FilterOptions = {}
): Promise<DatabaseResponse<Proposal[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    let query = supabase
      .from('proposals')
      .select('*')
      .eq('created_by', user.id);

    // Apply search filter
    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,company_name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    // Apply status filter
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    // Apply amount filter
    if (options.minAmount) {
      query = query.gte('amount', options.minAmount);
    }
    if (options.maxAmount) {
      query = query.lte('amount', options.maxAmount);
    }

    // Apply sorting and pagination
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: proposals, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    return { 
      data: proposals, 
      error: error?.message || null,
      count: count || 0
    };
  } catch (error) {
    logDatabaseError('getProposals', error, options);
    return { data: null, error: 'Failed to fetch proposals' };
  }
}

export async function getProposalById(id: string): Promise<DatabaseResponse<Proposal>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .eq('created_by', user.id)
      .single();

    return handleDatabaseResponse(proposal, error);
  } catch (error) {
    logDatabaseError('getProposalById', error, { id });
    return { data: null, error: 'Failed to fetch proposal' };
  }
}

export async function getProposalWithSections(id: string): Promise<DatabaseResponse<Proposal & { sections: ProposalSection[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        proposal_sections (*)
      `)
      .eq('id', id)
      .eq('created_by', user.id)
      .single();

    if (proposalError) {
      return handleDatabaseResponse(null, proposalError);
    }

    // Transform the data to match our expected structure
    const transformedData = {
      ...proposal,
      sections: proposal.proposal_sections?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    };

    // Remove the nested proposal_sections property
    delete (transformedData as any).proposal_sections;

    return { data: transformedData, error: null };
  } catch (error) {
    logDatabaseError('getProposalWithSections', error, { id });
    return { data: null, error: 'Failed to fetch proposal with sections' };
  }
}

export async function updateProposal(
  id: string, 
  updates: UpdateProposal
): Promise<DatabaseResponse<Proposal>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const updateData = sanitizeData(updates);

    const { data: proposal, error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    return handleDatabaseResponse(proposal, error);
  } catch (error) {
    logDatabaseError('updateProposal', error, { id, updates });
    return { data: null, error: 'Failed to update proposal' };
  }
}

export async function deleteProposal(id: string): Promise<DatabaseResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    return { data: true, error: null };
  } catch (error) {
    logDatabaseError('deleteProposal', error, { id });
    return { data: null, error: 'Failed to delete proposal' };
  }
}

// =============================================
// PROPOSAL SECTIONS OPERATIONS
// =============================================

export async function createProposalSection(data: {
  proposal_id: string;
  section_title: string;
  section_type: string;
  content: Record<string, any>;
  order_index: number;
  is_ai_generated?: boolean;
}): Promise<DatabaseResponse<ProposalSection>> {
  try {
    // Validate required fields
    const validationError = validateRequiredFields(data, ['proposal_id', 'section_title', 'section_type', 'content', 'order_index']);
    if (validationError) {
      return { data: null, error: validationError };
    }

    // Verify user owns the proposal
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: proposal } = await getProposalById(data.proposal_id);
    if (!proposal) {
      return { data: null, error: 'Proposal not found or access denied' };
    }

    const sectionData = {
      ...data,
      is_ai_generated: data.is_ai_generated || false
    };

    const { data: section, error } = await supabase
      .from('proposal_sections')
      .insert(sanitizeData(sectionData))
      .select()
      .single();

    return handleDatabaseResponse(section, error);
  } catch (error) {
    logDatabaseError('createProposalSection', error, data);
    return { data: null, error: 'Failed to create proposal section' };
  }
}

export async function getProposalSections(proposalId: string): Promise<DatabaseResponse<ProposalSection[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Verify user owns the proposal
    const { data: proposal } = await getProposalById(proposalId);
    if (!proposal) {
      return { data: null, error: 'Proposal not found or access denied' };
    }

    const { data: sections, error } = await supabase
      .from('proposal_sections')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('order_index', { ascending: true });

    return handleDatabaseResponse(sections || [], error);
  } catch (error) {
    logDatabaseError('getProposalSections', error, { proposalId });
    return { data: null, error: 'Failed to fetch proposal sections' };
  }
}

export async function updateProposalSection(
  id: string,
  updates: {
    section_title?: string;
    section_type?: string;
    content?: Record<string, any>;
    order_index?: number;
    is_ai_generated?: boolean;
  }
): Promise<DatabaseResponse<ProposalSection>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const updateData = sanitizeData(updates);

    const { data: section, error } = await supabase
      .from('proposal_sections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    return handleDatabaseResponse(section, error);
  } catch (error) {
    logDatabaseError('updateProposalSection', error, { id, updates });
    return { data: null, error: 'Failed to update proposal section' };
  }
}

export async function deleteProposalSection(id: string): Promise<DatabaseResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('proposal_sections')
      .delete()
      .eq('id', id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    return { data: true, error: null };
  } catch (error) {
    logDatabaseError('deleteProposalSection', error, { id });
    return { data: null, error: 'Failed to delete proposal section' };
  }
}

export async function reorderProposalSections(
  proposalId: string,
  sectionIds: string[]
): Promise<DatabaseResponse<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Verify user owns the proposal
    const { data: proposal } = await getProposalById(proposalId);
    if (!proposal) {
      return { data: null, error: 'Proposal not found or access denied' };
    }

    // Update order_index for each section
    const updates = sectionIds.map((sectionId, index) => 
      supabase
        .from('proposal_sections')
        .update({ order_index: index })
        .eq('id', sectionId)
        .eq('proposal_id', proposalId)
    );

    const results = await Promise.all(updates);
    
    // Check if any updates failed
    const failedUpdate = results.find(result => result.error);
    if (failedUpdate) {
      return handleDatabaseResponse(null, failedUpdate.error);
    }

    return { data: true, error: null };
  } catch (error) {
    logDatabaseError('reorderProposalSections', error, { proposalId, sectionIds });
    return { data: null, error: 'Failed to reorder proposal sections' };
  }
}

// =============================================
// UTILITY OPERATIONS
// =============================================

export async function getProposalStats(): Promise<DatabaseResponse<{
  total: number;
  active: number;
  inactive: number;
  draft: number;
  totalValue: number;
  avgValue: number;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('status, amount')
      .eq('created_by', user.id);

    if (error) {
      return handleDatabaseResponse(null, error);
    }

    const stats = {
      total: proposals?.length || 0,
      active: 0,
      inactive: 0,
      draft: 0,
      totalValue: 0,
      avgValue: 0
    };

    let totalValue = 0;
    let proposalsWithValue = 0;

    proposals?.forEach(proposal => {
      const status = proposal.status || 'draft';
      const amount = parseFloat(proposal.amount) || 0;

      // Count by status
      if (status === 'active') stats.active++;
      else if (status === 'inactive') stats.inactive++;
      else if (status === 'draft') stats.draft++;

      // Calculate total value
      if (amount > 0) {
        totalValue += amount;
        proposalsWithValue++;
      }
    });

    stats.totalValue = Math.round(totalValue);
    stats.avgValue = proposalsWithValue > 0 ? Math.round(totalValue / proposalsWithValue) : 0;

    return { data: stats, error: null };
  } catch (error) {
    logDatabaseError('getProposalStats', error);
    return { data: null, error: 'Failed to get proposal stats' };
  }
}

export async function searchProposals(searchTerm: string): Promise<DatabaseResponse<Proposal[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('created_by', user.id)
      .or(`title.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    return handleDatabaseResponse(proposals || [], error);
  } catch (error) {
    logDatabaseError('searchProposals', error, { searchTerm });
    return { data: null, error: 'Failed to search proposals' };
  }
}

export async function duplicateProposal(id: string, newTitle?: string): Promise<DatabaseResponse<Proposal>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Get the original proposal with sections
    const { data: originalProposal } = await getProposalWithSections(id);
    if (!originalProposal) {
      return { data: null, error: 'Proposal not found' };
    }

    // Create new proposal
    const newProposalData: CreateProposal = {
      title: newTitle || `${originalProposal.title} (Copy)`,
      company_name: originalProposal.company_name,
      status: 'draft',
      description: originalProposal.description,
      amount: originalProposal.amount,
      created_by: user.id
    };

    const { data: newProposal, error: proposalError } = await createProposal(newProposalData);
    if (proposalError || !newProposal) {
      return { data: null, error: proposalError || 'Failed to create duplicate proposal' };
    }

    // Copy sections
    if (originalProposal.sections && originalProposal.sections.length > 0) {
      const sectionPromises = originalProposal.sections.map(section => 
        createProposalSection({
          proposal_id: newProposal.id,
          section_title: section.section_title,
          section_type: section.section_type,
          content: section.content,
          order_index: section.order_index,
          is_ai_generated: section.is_ai_generated
        })
      );

      await Promise.all(sectionPromises);
    }

    return { data: newProposal, error: null };
  } catch (error) {
    logDatabaseError('duplicateProposal', error, { id, newTitle });
    return { data: null, error: 'Failed to duplicate proposal' };
  }
}