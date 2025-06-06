import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { group_name, user_email } = await request.json();
    if (!group_name) {
      return NextResponse.json({ error: 'group_name is required' }, { status: 400 });
    }

    // Use service role for bypassing RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Create group if not exists
    let { data: group, error: groupError } = await adminSupabase
      .from('groups')
      .select('id, name')
      .eq('name', group_name)
      .single();
    
    if (groupError && groupError.code === 'PGRST116') {
      // Not found, create it
      const { data: newGroup, error: createGroupError } = await adminSupabase
        .from('groups')
        .insert({ name: group_name })
        .select('id, name')
        .single();
      if (createGroupError) {
        return NextResponse.json({ error: 'Failed to create group', details: createGroupError.message }, { status: 500 });
      }
      group = newGroup;
    } else if (groupError) {
      return NextResponse.json({ error: 'Failed to fetch group', details: groupError.message }, { status: 500 });
    }

    // If no user_email provided, just return the group
    if (!user_email) {
      return NextResponse.json({ group });
    }

    // 2. Find user by email (only if user_email provided)
    const { data: targetUser, error: userError } = await adminSupabase
      .from('profiles')
      .select('id, email')
      .eq('email', user_email)
      .single();
    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found', details: userError?.message }, { status: 404 });
    }

    // 3. Add user to group if not already present
    if (!group) {
      return NextResponse.json({ error: 'Group not found or created' }, { status: 500 });
    }
    
    const { data: existingUserGroup, error: checkUserGroupError } = await adminSupabase
      .from('user_groups')
      .select('user_id, group_id')
      .eq('user_id', targetUser.id)
      .eq('group_id', group.id)
      .single();
    
    if (checkUserGroupError && checkUserGroupError.code === 'PGRST116') {
      // Not found, create
      const { data: newUserGroup, error: createUserGroupError } = await adminSupabase
        .from('user_groups')
        .insert({ user_id: targetUser.id, group_id: group.id })
        .select('user_id, group_id')
        .single();
      if (createUserGroupError) {
        return NextResponse.json({ error: 'Failed to add user to group', details: createUserGroupError.message }, { status: 500 });
      }
      return NextResponse.json({ group, user: targetUser, user_group: newUserGroup });
    } else if (checkUserGroupError) {
      return NextResponse.json({ error: 'Failed to fetch user-group', details: checkUserGroupError.message }, { status: 500 });
    }

    return NextResponse.json({ group, user: targetUser, user_group: existingUserGroup });
  } catch (error) {
    console.error('Error in group creation API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Use service role for bypassing RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    // Fetch all groups and their members
    const { data: groups, error: groupsError } = await adminSupabase
      .from('groups')
      .select('id, name, created_at')
      .order('created_at');
    if (groupsError) {
      return NextResponse.json({ error: 'Failed to fetch groups', details: groupsError.message }, { status: 500 });
    }
    // For each group, fetch members and catalogs
    const groupIds = groups.map((g: any) => g.id);
    const membersByGroup: Record<string, any[]> = {};
    const catalogsByGroup: Record<string, any[]> = {};
    
    if (groupIds.length > 0) {
      // Fetch group memberships
      const { data: memberships, error: membershipsError } = await adminSupabase
        .from('user_groups')
        .select('group_id, user_id, profiles(id, email, role, display_name)');
      if (membershipsError) {
        return NextResponse.json({ error: 'Failed to fetch group memberships', details: membershipsError.message }, { status: 500 });
      }
      if (memberships && Array.isArray(memberships)) {
        for (const m of memberships) {
          if (m && m.group_id && m.profiles) {
            if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
            membersByGroup[m.group_id].push(m.profiles);
          }
        }
      }

      // Fetch group catalog assignments
      const { data: catalogAssignments, error: catalogsError } = await adminSupabase
        .from('catalog_groups')
        .select('group_id, catalog_id, catalogs(id, name)');
      if (catalogsError) {
        return NextResponse.json({ error: 'Failed to fetch group catalogs', details: catalogsError.message }, { status: 500 });
      }
      if (catalogAssignments && Array.isArray(catalogAssignments)) {
        for (const ca of catalogAssignments) {
          if (ca && ca.group_id && ca.catalogs) {
            if (!catalogsByGroup[ca.group_id]) catalogsByGroup[ca.group_id] = [];
            catalogsByGroup[ca.group_id].push(ca.catalogs);
          }
        }
      }
    }
    
    // Process each group to add members and catalogs
    const groupsWithDetails = groups.map((group: any) => ({
      ...group,
      members: membersByGroup[group.id] || [],
      catalogs: catalogsByGroup[group.id] || []
    }));
    return NextResponse.json(groupsWithDetails);
  } catch (error) {
    console.error('Error in group list API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { group_id } = await request.json();
    if (!group_id) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 });
    }
    // Use service role for bypassing RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    // Delete group memberships first
    await adminSupabase.from('user_groups').delete().eq('group_id', group_id);
    await adminSupabase.from('catalog_groups').delete().eq('group_id', group_id);
    await adminSupabase.from('library_groups').delete().eq('group_id', group_id);
    // Delete the group
    const { error: groupDeleteError } = await adminSupabase
      .from('groups')
      .delete()
      .eq('id', group_id);
    if (groupDeleteError) {
      return NextResponse.json({ error: 'Failed to delete group', details: groupDeleteError.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Group deleted' });
  } catch (error) {
    console.error('Error in group delete API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { group_id, name } = await request.json();
    if (!group_id || !name) {
      return NextResponse.json({ error: 'group_id and name are required' }, { status: 400 });
    }

    // Use service role for bypassing RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Update the group name
    const { data: updatedGroup, error: updateError } = await adminSupabase
      .from('groups')
      .update({ name })
      .eq('id', group_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update group', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('Error in group update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 