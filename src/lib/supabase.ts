import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database helper functions using views and RPCs
export const db = {
  // Get user's workspaces
  async getMyWorkspaces() {
    return await supabase
      .from('my_workspaces')
      .select('*')
      .order('created_at', { ascending: false });
  },

  // Get user's memberships
  async getMyMemberships() {
    return await supabase
      .from('my_memberships')
      .select('*')
      .order('joined_at', { ascending: false });
  },

  // Upsert user profile
  async upsertProfile(fullName: string) {
    return await supabase.rpc('upsert_my_profile', {
      p_full_name: fullName
    });
  },

  // Get current user's profile
  async getMyProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }
    
    return await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
  },

  // Create workspace
  async createWorkspace(name: string) {
    return await supabase.rpc('create_workspace', {
      p_name: name
    });
  },

  // Create workspace invite (for future use)
  async createWorkspaceInvite(workspaceId: string, email: string) {
    return await supabase.rpc('create_workspace_invite', {
      p_workspace_id: workspaceId,
      p_email: email
    });
  },

  // Redeem workspace invite (for future use)
  async redeemWorkspaceInvite(token: string) {
    return await supabase.rpc('redeem_workspace_invite', {
      p_token: token
    });
  },

  // Get workspace members with roles
  async getWorkspaceMembers(workspaceId: string) {
    // First try to get workspace members directly
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        user_id,
        role,
        created_at
      `)
      .eq('workspace_id', workspaceId);

    if (membersError) {
      console.error('Failed to fetch workspace members:', membersError);
      return { data: null, error: membersError };
    }

    if (!members || members.length === 0) {
      return { data: [], error: null };
    }

    // Then get profiles for each member
    const userIds = members.map(m => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.warn('Failed to fetch profiles, returning members without profile data:', profilesError);
      return { 
        data: members.map(m => ({ ...m, profiles: null })), 
        error: null 
      };
    }

    // Combine members with profiles
    const membersWithProfiles = members.map(member => ({
      ...member,
      profiles: profiles?.find(p => p.id === member.user_id) || null
    }));

    return { data: membersWithProfiles, error: null };
  },

  // Delete workspace (admin only)
  async deleteWorkspace(workspaceId: string) {
    return await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);
  },

  // Leave workspace
  async leaveWorkspace(workspaceId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    return await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id);
  },

  // Update member role (admin only)
  async updateMemberRole(workspaceId: string, userId: string, role: 'viewer' | 'member' | 'admin') {
    return await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
  },

  // Remove member (admin only)
  async removeMember(workspaceId: string, userId: string) {
    return await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
  }
};

// Auth helper functions
export const auth = {
  // Sign up
  async signUp(email: string, password: string) {
    return await supabase.auth.signUp({
      email,
      password
    });
  },

  // Sign in
  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },

  // Sign out
  async signOut() {
    return await supabase.auth.signOut();
  },

  // Get session
  async getSession() {
    return await supabase.auth.getSession();
  },

  // Get user
  getUser() {
    return supabase.auth.getUser();
  },

  // Listen for auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};