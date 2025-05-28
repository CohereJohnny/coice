import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

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
    const { group_id, user_id } = await request.json();
    if (!group_id || !user_id) {
      return NextResponse.json({ error: 'group_id and user_id are required' }, { status: 400 });
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
    // Delete user from group
    const { error: deleteError } = await adminSupabase
      .from('user_groups')
      .delete()
      .eq('user_id', user_id)
      .eq('group_id', group_id);
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove user from group', details: deleteError.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'User removed from group' });
  } catch (error) {
    console.error('Error in group membership delete API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 