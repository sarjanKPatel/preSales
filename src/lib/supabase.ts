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

  // Create workspace invite - hybrid approach for existing/new users
  async createWorkspaceInvite(workspaceId: string, email: string, role: 'viewer' | 'member' | 'admin' = 'member') {
    try {
      // Check if user exists by looking for their profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      const userExists = !!existingProfile;

      // Get current user and workspace details for email
      const { data: { user } } = await supabase.auth.getUser();
      const [workspaceResult, inviterResult] = await Promise.all([
        supabase.from('workspaces').select('name').eq('id', workspaceId).single(),
        user?.id ? supabase.from('profiles').select('full_name').eq('id', user.id).single() : { data: null }
      ]);

      // Create invite record in our database
      const { data: inviteData, error: inviteError } = await supabase
        .from('workspace_invites')
        .insert({
          workspace_id: workspaceId,
          email: email,
          role: role,
          status: 'pending',
          invited_by: user?.id,
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
        })
        .select()
        .single();

      if (inviteError) {
        return { data: null, error: inviteError };
      }

      // Send email via Edge Function
      try {
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invite-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invite_id: inviteData.id,
            workspace_name: workspaceResult.data?.name,
            invited_by_name: inviterResult.data?.full_name,
            invite_email: email,
            invite_role: role
          }),
        });

        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error('Failed to send invite email:', emailResult);
          // Don't fail the whole operation if email fails
          return { 
            data: { 
              ...inviteData, 
              message: 'Invite created but email failed to send. User can still accept via the app.',
              email_sent: false
            }, 
            error: null 
          };
        }

        console.log('Invite email sent successfully:', emailResult);

      } catch (emailError) {
        console.error('Error sending invite email:', emailError);
        // Don't fail the whole operation if email fails
      }

      return { 
        data: { 
          ...inviteData, 
          message: userExists 
            ? 'Invite sent! The user will receive an email and can also see it in their workspace management.' 
            : 'Invite sent! The user will receive an email to join your workspace.',
          email_sent: true
        }, 
        error: null 
      };

    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
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

  // Get workspace invites (include all statuses for management)
  async getWorkspaceInvites(workspaceId: string) {
    return await supabase
      .from('workspace_invites')
      .select(`
        id,
        workspace_id,
        email,
        status,
        expires_at,
        created_at,
        invited_by
      `)
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'revoked'])  // Show pending and revoked for management
      .order('created_at', { ascending: false });
  },

  // Revoke/cancel workspace invite
  async revokeWorkspaceInvite(inviteId: string) {
    return await supabase
      .from('workspace_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);
  },

  // Resend workspace invite (update created_at and expires_at)
  async resendWorkspaceInvite(inviteId: string) {
    try {
      // Update the invite status and timing
      const { data: inviteData, error: updateError } = await supabase
        .from('workspace_invites')
        .update({ 
          status: 'pending',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
        })
        .eq('id', inviteId)
        .select()
        .single();

      if (updateError) {
        return { data: null, error: updateError };
      }

      // Send email via Edge Function
      try {
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invite-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invite_id: inviteId
          }),
        });

        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error('Failed to send resend email:', emailResult);
        } else {
          console.log('Resend email sent successfully:', emailResult);
        }

      } catch (emailError) {
        console.error('Error sending resend email:', emailError);
      }

      return { data: inviteData, error: null };

    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  // Delete workspace invite permanently
  async deleteWorkspaceInvite(inviteId: string) {
    return await supabase
      .from('workspace_invites')
      .delete()
      .eq('id', inviteId);
  },

  // Get pending invites for current user
  async getMyPendingInvites() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.email) return { data: null, error: new Error('User not authenticated') };

    // First get the basic invite data
    const { data: invites, error: inviteError } = await supabase
      .from('workspace_invites')
      .select(`
        id,
        workspace_id,
        email,
        status,
        created_at,
        expires_at,
        invited_by
      `)
      .eq('email', user.user.email)
      .in('status', ['pending'])  // Only get pending invites, exclude revoked/denied/accepted
      .order('created_at', { ascending: false });

    if (inviteError || !invites) {
      return { data: null, error: inviteError };
    }

    // Then get workspace and profile data separately
    const workspaceIds = invites.map(invite => invite.workspace_id);
    const inviterIds = invites.map(invite => invite.invited_by).filter(Boolean);

    const [workspacesResult, profilesResult] = await Promise.all([
      // Get workspaces
      supabase
        .from('workspaces')
        .select('id, name, slug')
        .in('id', workspaceIds),
      
      // Get inviter profiles
      inviterIds.length > 0 
        ? supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', inviterIds)
        : { data: [], error: null }
    ]);

    // Combine the data
    const enrichedInvites = invites.map(invite => ({
      ...invite,
      workspaces: workspacesResult.data?.find(w => w.id === invite.workspace_id) || null,
      profiles: profilesResult.data?.find(p => p.id === invite.invited_by) || null
    }));

    return { data: enrichedInvites, error: null };
  },

  // Accept workspace invite
  async acceptWorkspaceInvite(inviteId: string) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { data: null, error: new Error('User not authenticated') };

      // Get the invite details
      const { data: invite, error: inviteError } = await supabase
        .from('workspace_invites')
        .select('workspace_id, email, status')
        .eq('id', inviteId)
        .eq('email', user.user.email)
        .single();

      if (inviteError || !invite) {
        return { data: null, error: new Error('Invite not found or not authorized') };
      }

      if (invite.status === 'revoked') {
        return { data: null, error: new Error('This invitation has been revoked by the workspace admin') };
      }
      
      if (invite.status === 'accepted') {
        return { data: null, error: new Error('You have already accepted this invitation') };
      }
      
      if (invite.status === 'denied') {
        return { data: null, error: new Error('You have already declined this invitation') };
      }
      
      if (invite.status !== 'pending') {
        return { data: null, error: new Error('This invitation is no longer valid') };
      }

      // Add user to workspace_members
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: invite.workspace_id,
          user_id: user.user.id,
          role: 'member' // Default role, could be enhanced to use invite role
        });

      if (memberError) {
        return { data: null, error: memberError };
      }

      // Update invite status to accepted
      const { error: updateError } = await supabase
        .from('workspace_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      if (updateError) {
        return { data: null, error: updateError };
      }

      return { data: { success: true }, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  // Deny workspace invite
  async denyWorkspaceInvite(inviteId: string) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.email) return { data: null, error: new Error('User not authenticated') };

    return await supabase
      .from('workspace_invites')
      .update({ status: 'denied' })
      .eq('id', inviteId)
      .eq('email', user.user.email);
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
      .select('*')
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

    const { data, error } = await query;
    
    if (error) return { data: null, error };
    
    // Get message counts from memory_chunks instead of chat_messages
    const sessionsWithCounts = await Promise.all(
      (data || []).map(async (session) => {
        const { count } = await supabase
          .from('memory_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', session.id);
        
        return {
          ...session,
          chat_messages: [{ count: count || 0 }] // Maintain compatibility with existing code
        };
      })
    );

    return { data: sessionsWithCounts, error: null };
  },

  async getChatMessages(sessionId: string) {
    const { data, error } = await supabase
      .from('memory_chunks')
      .select('*')
      .eq('conversation_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) return { data: null, error };

    // Transform memory_chunks to look like chat_messages for compatibility
    const messages = (data || []).map(chunk => ({
      id: chunk.id,
      session_id: sessionId, // Map conversation_id back to session_id
      role: chunk.chunk_type === 'user_message' ? 'user' : 
            chunk.chunk_type === 'assistant_message' ? 'assistant' : 'system',
      content: chunk.content,
      user_id: chunk.user_id,
      metadata: chunk.metadata,
      created_at: chunk.created_at
    }));

    return { data: messages, error: null };
  },

  async createChatMessage(sessionId: string, role: 'user' | 'assistant', content: string, metadata?: any) {
    console.log('[DB] createChatMessage called (using ChatGPT memory system):', {
      sessionId,
      role,
      contentLength: content.length,
      hasMetadata: !!metadata
    });

    // Get session info to extract workspace_id and user_id
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('workspace_id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Create memory chunk in the new system
    const chunkData = {
      id: `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      conversation_id: sessionId,
      user_id: session.user_id,
      workspace_id: session.workspace_id,
      chunk_type: role === 'user' ? 'user_message' : 
                  role === 'assistant' ? 'assistant_message' : 'system_info',
      importance_score: 0.5, // Default importance, will be calculated properly by ChatGPT memory system later
      entities: [],
      metadata: metadata || {},
      // Note: embeddings will be null initially, generated when needed by ChatGPT memory system
    };

    console.log('[DB] Inserting into memory_chunks...');
    const { data, error } = await supabase
      .from('memory_chunks')
      .insert(chunkData)
      .select()
      .single();

    if (error) {
      console.error('[DB] Database insert error for memory chunk:', error);
      throw error;
    }

    // Update session's updated_at timestamp
    console.log('[DB] Updating session timestamp...');
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Return data in the format expected by existing code
    const compatibleData = {
      id: data.id,
      session_id: sessionId,
      role,
      content,
      user_id: session.user_id,
      metadata: metadata || {},
      created_at: data.created_at
    };

    console.log('[DB] createChatMessage completed successfully');
    return compatibleData;
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