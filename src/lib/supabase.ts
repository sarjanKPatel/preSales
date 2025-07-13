import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = 'https://vsmcdfvegjlggfbhokxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbWNkZnZlZ2psZ2dmYmhva3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0Mjk0MjksImV4cCI6MjA2ODAwNTQyOX0.jmiLXRWARoGWOZfafSNioQ4CbDP8JV0KsG7AVsNVGdo';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers
export const db = {
  // Proposals
  getProposals: async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        proposal_sections (
          id,
          section_title,
          section_type,
          content,
          order_index,
          is_ai_generated,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getProposal: async (id: string) => {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        proposal_sections (
          id,
          section_title,
          section_type,
          content,
          order_index,
          is_ai_generated,
          created_at,
          updated_at
        ),
        chat_sessions (
          id,
          created_at,
          chat_messages (
            id,
            role,
            content,
            metadata,
            created_at
          )
        )
      `)
      .eq('id', id)
      .single();
    return { data, error };
  },

  createProposal: async (proposal: {
    title: string;
    company_name: string;
    description?: string;
    amount?: number;
  }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('proposals')
      .insert({
        ...proposal,
        created_by: user.user.id,
      })
      .select()
      .single();
    return { data, error };
  },

  updateProposal: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Proposal Sections
  addSection: async (section: {
    proposal_id: string;
    section_title: string;
    section_type: string;
    content: any;
    order_index: number;
    is_ai_generated?: boolean;
  }) => {
    const { data, error } = await supabase
      .from('proposal_sections')
      .insert(section)
      .select()
      .single();
    return { data, error };
  },

  updateSection: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('proposal_sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  deleteSection: async (id: string) => {
    const { error } = await supabase
      .from('proposal_sections')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Chat
  createChatSession: async (proposalId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        proposal_id: proposalId,
        created_by: user.user.id,
      })
      .select()
      .single();
    return { data, error };
  },

  getChatMessages: async (sessionId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    return { data, error };
  },

  addChatMessage: async (message: {
    session_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
  }) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();
    return { data, error };
  },
};