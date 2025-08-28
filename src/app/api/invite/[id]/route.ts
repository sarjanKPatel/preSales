import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client to bypass RLS
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inviteId } = await params;
    
    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Fetching invite details for ID:', inviteId);

    // Get basic invite details
    const { data: invite, error: inviteError } = await supabaseService
      .from('workspace_invites')
      .select('id, email, status, created_at, expires_at, workspace_id, invited_by, role')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      console.log('[API] Invite not found:', inviteError);
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Get workspace details
    const { data: workspace } = await supabaseService
      .from('workspaces')
      .select('name, slug')
      .eq('id', invite.workspace_id)
      .single();

    // Get inviter profile
    const { data: inviterProfile } = invite.invited_by ? 
      await supabaseService
        .from('profiles')
        .select('full_name')
        .eq('id', invite.invited_by)
        .single() : 
      { data: null };

    // Combine the data
    const enrichedInvite = {
      ...invite,
      workspaces: workspace,
      profiles: inviterProfile
    };

    console.log('[API] Returning enriched invite data');
    return NextResponse.json(enrichedInvite);

  } catch (error) {
    console.error('[API] Error fetching invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}