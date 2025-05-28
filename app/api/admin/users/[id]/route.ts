import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user and verify admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role } = body;
    
    // Create admin client for operations that need to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }
    
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Validate role
    if (!['admin', 'manager', 'end_user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update user role using admin client
    const { data, error } = await adminSupabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('Error in admin user update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user and verify admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    
    // Create admin client for operations that need to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }
    
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Prevent self-deletion
    if (user.id === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists using admin client
    const { data: targetUser, error: checkUserError } = await adminSupabase
      .from('profiles')
      .select('id, email')
      .eq('id', id)
      .single();

    if (checkUserError) {
      console.error('Error checking user existence:', checkUserError);
      return NextResponse.json({ error: 'Failed to check user existence', details: checkUserError.message }, { status: 500 });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user profile using admin client (this will cascade to related data due to foreign key constraints)
    const { error: deleteError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting user profile:', deleteError);
      return NextResponse.json({ error: 'Failed to delete user profile', details: deleteError.message }, { status: 500 });
    }

    // Also delete the auth user
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(id);
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      // Profile is already deleted, so we'll continue but log the error
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in admin user delete API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 