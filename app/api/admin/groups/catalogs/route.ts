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

    const { group_id, catalog_id } = await request.json();
    if (!group_id || !catalog_id) {
      return NextResponse.json({ error: 'group_id and catalog_id are required' }, { status: 400 });
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

    // Check if assignment already exists
    const { data: existing, error: checkError } = await adminSupabase
      .from('catalog_groups')
      .select('catalog_id, group_id')
      .eq('catalog_id', catalog_id)
      .eq('group_id', group_id)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Catalog already assigned to group' });
    }

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to check existing assignment', details: checkError.message }, { status: 500 });
    }

    // Create the assignment
    const { data: assignment, error: assignError } = await adminSupabase
      .from('catalog_groups')
      .insert({ catalog_id: parseInt(catalog_id), group_id })
      .select('catalog_id, group_id')
      .single();

    if (assignError) {
      return NextResponse.json({ error: 'Failed to assign catalog to group', details: assignError.message }, { status: 500 });
    }

    return NextResponse.json({ assignment, message: 'Catalog assigned to group successfully' });
  } catch (error) {
    console.error('Error in catalog assignment API:', error);
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

    const { group_id, catalog_id } = await request.json();
    if (!group_id || !catalog_id) {
      return NextResponse.json({ error: 'group_id and catalog_id are required' }, { status: 400 });
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

    // Remove the assignment
    const { error: deleteError } = await adminSupabase
      .from('catalog_groups')
      .delete()
      .eq('catalog_id', catalog_id)
      .eq('group_id', group_id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove catalog from group', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Catalog removed from group successfully' });
  } catch (error) {
    console.error('Error in catalog removal API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 