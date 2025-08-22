import { createClient } from '@supabase/supabase-js';
import type { Vision, VisionWithDetails, CreateVisionInput, UpdateVisionInput, VisionState } from '../types';

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
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check if workspace name already exists for this user
      const { data: existingWorkspaces, error: checkError } = await supabase
        .from('workspaces')
        .select('name')
        .eq('created_by', user.id)
        .eq('name', name);

      if (checkError) {
        return { data: null, error: checkError };
      }

      if (existingWorkspaces && existingWorkspaces.length > 0) {
        return { 
          data: null, 
          error: new Error(`Workspace "${name}" already exists. Please choose a different name.`) 
        };
      }

      // Create the workspace without slug (let database generate it)
      const { data: workspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          name: name,
          created_by: user.id
        })
        .select()
        .single();

      if (createError) {
        // Handle specific constraint violations with user-friendly messages
        if (createError.message?.includes('duplicate key') || 
            createError.message?.includes('unique constraint') ||
            createError.message?.includes('workspaces_created_by_name_key')) {
          return { 
            data: null, 
            error: new Error(`Workspace "${name}" already exists. Please choose a different name.`) 
          };
        }
        return { data: null, error: createError };
      }

      // Add current user as admin member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) {
        // If adding member fails, try to clean up the workspace
        await supabase.from('workspaces').delete().eq('id', workspace.id);
        return { data: null, error: memberError };
      }

      return { data: workspace, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
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
  },

  // Vision operations
  async getVisions(workspaceId: string) {
    try {
      const result = await supabase
        .from('visions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (result.error) {
        console.error('[DB] getVisions error:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[DB] getVisions exception:', error);
      throw error;
    }
  },

  async getVision(visionId: string) {
    const { data, error } = await supabase
      .rpc('get_vision_with_details', { p_vision_id: visionId })
      .single();
    
    if (error) throw error;
    return data as VisionWithDetails;
  },

  async createVision(workspaceId: string, input: CreateVisionInput) {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('visions')
      .insert({
        workspace_id: workspaceId,
        created_by: user.user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        impact: input.impact,
        timeframe: input.timeframe,
        tags: input.tags || [],
        vision_state: {},
        completeness_score: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data as Vision;
  },

  async updateVision(visionId: string, input: UpdateVisionInput) {
    const { data, error } = await supabase
      .from('visions')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', visionId)
      .select()
      .single();

    if (error) throw error;
    return data as Vision;
  },

  async updateVisionState(visionId: string, state: Partial<VisionState>) {
    const { data, error } = await supabase
      .rpc('update_vision_state', {
        p_vision_id: visionId,
        p_state: state
      });

    if (error) throw error;
    return data as VisionState;
  },

  async deleteVision(visionId: string) {
    const { error } = await supabase
      .from('visions')
      .delete()
      .eq('id', visionId);

    if (error) throw error;
  },

  async linkSessionToVision(sessionId: string, visionId: string) {
    const { error } = await supabase
      .rpc('link_session_to_vision', {
        p_session_id: sessionId,
        p_vision_id: visionId
      });

    if (error) throw error;
  },

  async getVisionMessages(visionId: string) {
    const { data, error } = await supabase
      .rpc('get_vision_messages', { p_vision_id: visionId });

    if (error) throw error;
    return data;
  },

  // Chat Sessions
  async createChatSession(workspaceId: string, visionId?: string) {
    console.log('[DB] createChatSession called with workspaceId:', workspaceId, 'visionId:', visionId);
    
    console.log('[DB] Getting authenticated user...');
    
    // Try to get user with timeout and fallback
    let user;
    try {
      // First try getting user from session (faster)
      const session = await supabase.auth.getSession();
      console.log('[DB] Session result:', !!session?.data?.session?.user);
      
      if (session?.data?.session?.user) {
        user = { user: session.data.session.user };
        console.log('[DB] Using session user:', user.user.id);
      } else {
        console.log('[DB] No session found, trying getUser...');
        const { data: userData } = await supabase.auth.getUser();
        user = userData;
        console.log('[DB] getUser result:', !!user?.user, user?.user?.id);
      }
    } catch (authError) {
      console.error('[DB] Auth error:', authError);
      throw new Error('Authentication failed');
    }
    
    if (!user?.user) {
      console.error('[DB] User not authenticated');
      throw new Error('User not authenticated');
    }

    const sessionData = {
      workspace_id: workspaceId,
      user_id: user.user.id,
      session_type: 'vision' as const,
      title: 'New Vision Chat',
      metadata: visionId ? { vision_id: visionId } : {},
    };
    console.log('[DB] Session data prepared:', sessionData);

    console.log('[DB] Inserting session into database...');
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert(sessionData)
      .select()
      .single();
    
    console.log('[DB] Insert result - data:', data, 'error:', error);

    if (error) {
      console.error('[DB] Database insert error:', error);
      throw error;
    }

    // Link session to vision if visionId provided
    if (visionId) {
      console.log('[DB] Linking session to vision...', data.id, visionId);
      try {
        await this.linkSessionToVision(data.id, visionId);
        console.log('[DB] Session linked to vision successfully');
      } catch (linkError) {
        console.error('[DB] Error linking session to vision:', linkError);
        // Don't throw here, session was created successfully
      }
    }

    console.log('[DB] createChatSession completed successfully, returning:', data);
    return data;
  },

  async getChatSessions(workspaceId: string, visionId?: string) {
    let query = supabase
      .from('chat_sessions')
      .select(`
        *,
        chat_messages(count)
      `)
      .eq('workspace_id', workspaceId)
      .eq('session_type', 'vision')
      .order('updated_at', { ascending: false });

    if (visionId) {
      // Filter sessions linked to this vision
      const { data: visionSessions } = await supabase
        .from('vision_sessions')
        .select('session_id')
        .eq('vision_id', visionId);

      if (visionSessions && visionSessions.length > 0) {
        const sessionIds = visionSessions.map(vs => vs.session_id);
        query = query.in('id', sessionIds);
      } else {
        // No sessions for this vision yet
        return { data: [], error: null };
      }
    }

    return await query;
  },

  async getChatMessages(sessionId: string) {
    return await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
  },

  async createChatMessage(sessionId: string, role: 'user' | 'assistant', content: string, metadata?: any) {
    console.log('[DB] createChatMessage called:', {
      sessionId,
      role,
      contentLength: content.length,
      hasMetadata: !!metadata
    });

    // Since user_id is nullable in the schema, we can insert messages without auth lookup
    // For user messages, we'll leave user_id as null for now to avoid the hanging auth issue
    // The session already has the user_id, so we can track ownership at the session level
    const messageData = {
      session_id: sessionId,
      role,
      content,
      user_id: null, // Keep as null to avoid hanging auth calls
      metadata: metadata || {},
    };

    console.log('[DB] Message data prepared:', {
      ...messageData,
      content: `${content.substring(0, 50)}...`
    });

    console.log('[DB] Inserting message into database...');
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single();

    console.log('[DB] Insert result - data:', !!data, 'error:', error);

    if (error) {
      console.error('[DB] Database insert error for message:', error);
      throw error;
    }

    // Update session's updated_at timestamp
    console.log('[DB] Updating session timestamp...');
    const updateResult = await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    
    console.log('[DB] Session update result:', updateResult.error || 'success');

    console.log('[DB] createChatMessage completed successfully, returning:', data.id);
    return data;
  },

  async updateChatSession(sessionId: string, updates: { title?: string; metadata?: any }) {
    return await supabase
      .from('chat_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();
  },

  async deleteChatSession(sessionId: string) {
    console.log('[DB] deleteChatSession called with sessionId:', sessionId);
    
    const result = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);
    
    console.log('[DB] Delete result:', result);
    console.log('[DB] Delete error:', result.error);
    console.log('[DB] Delete data:', result.data);
    
    return result;
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