// =============================================
// Database Client
// Supabase client and utility functions
// =============================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { DatabaseResponse, PaginationOptions, FilterOptions } from './types';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vsmcdfvegjlggfbhokxm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbWNkZnZlZ2psZ2dmYmhva3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0Mjk0MjksImV4cCI6MjA2ODAwNTQyOX0.jmiLXRWARoGWOZfafSNioQ4CbDP8JV0KsG7AVsNVGdo';

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Utility function to handle database responses
export function handleDatabaseResponse<T>(data: T, error: any): DatabaseResponse<T> {
  if (error) {
    console.error('Database error:', error);
    return {
      data: null,
      error: error.message || 'An unknown error occurred'
    };
  }

  return {
    data,
    error: null
  };
}

// Utility function to get current user
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Utility function to apply pagination
export function applyPagination<T>(
  query: any,
  options: PaginationOptions = {}
): any {
  const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);
}

// Utility function to apply search filters
export function applyFilters(
  query: any,
  filters: FilterOptions = {}
): any {
  let filteredQuery = query;

  // Apply search if provided
  if (filters.search) {
    // This would need to be customized per table
    // Example for leads: search in company_name or contact_name
  }

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    filteredQuery = filteredQuery.eq('status', filters.status);
  }

  // Apply date filters
  if (filters.dateFrom) {
    filteredQuery = filteredQuery.gte('created_at', filters.dateFrom);
  }
  
  if (filters.dateTo) {
    filteredQuery = filteredQuery.lte('created_at', filters.dateTo);
  }

  return filteredQuery;
}

// Utility function to build JSONB filters
export function buildJsonbFilter(
  column: string,
  field: string,
  value: any,
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' = 'eq'
): string {
  const jsonPath = `${column}->>'${field}'`;
  
  switch (operator) {
    case 'eq':
      return `${jsonPath}.eq.${value}`;
    case 'neq':
      return `${jsonPath}.neq.${value}`;
    case 'gt':
      return `${jsonPath}.gt.${value}`;
    case 'gte':
      return `${jsonPath}.gte.${value}`;
    case 'lt':
      return `${jsonPath}.lt.${value}`;
    case 'lte':
      return `${jsonPath}.lte.${value}`;
    case 'like':
      return `${jsonPath}.like.%${value}%`;
    default:
      return `${jsonPath}.eq.${value}`;
  }
}

// Utility function for error logging
export function logDatabaseError(operation: string, error: any, context?: any) {
  console.error(`Database error in ${operation}:`, {
    error: error.message || error,
    context,
    timestamp: new Date().toISOString()
  });
}

// Utility function to validate required fields
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): string | null {
  for (const field of requiredFields) {
    if (!data[field] && data[field] !== 0 && data[field] !== false) {
      return `Missing required field: ${String(field)}`;
    }
  }
  return null;
}

// Utility function to sanitize data (remove undefined values)
export function sanitizeData<T extends Record<string, any>>(data: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key as keyof T] = value;
    }
  }
  
  return sanitized;
}

// Utility function to generate UUID (for client-side operations)
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}