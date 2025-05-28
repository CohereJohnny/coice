import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    // Test direct catalog query (same as /api/catalogs)
    const { data: catalogsTest, error: catalogsError } = await supabase
      .from('catalogs')
      .select(`
        id,
        name,
        description,
        created_at,
        user_id
      `)
      .order('created_at', { ascending: false });

    // Try setting auth explicitly and test again
    await supabase.auth.setSession({
      access_token: (await supabase.auth.getSession()).data.session?.access_token || '',
      refresh_token: (await supabase.auth.getSession()).data.session?.refresh_token || ''
    });

    const { data: catalogsTestWithAuth, error: catalogsErrorWithAuth } = await supabase
      .from('catalogs')
      .select(`
        id,
        name,
        description,
        created_at,
        user_id
      `)
      .order('created_at', { ascending: false });

    // Test with service role (bypasses RLS)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: catalogsServiceRole } = await adminSupabase
      .from('catalogs')
      .select('id, name, description, created_at, user_id')
      .order('created_at', { ascending: false });

    // Get user's groups (this will fail due to RLS, but let's see the error)
    const { data: userGroups, error: groupsError } = await supabase
      .from('user_groups')
      .select(`
        group_id,
        groups(id, name)
      `)
      .eq('user_id', user.id);

    // Get user groups without joining (should work)
    const { data: userGroupsSimple } = await supabase
      .from('user_groups')
      .select('group_id')
      .eq('user_id', user.id);

    // Get catalog access through groups (this will also fail due to groups RLS)
    const { data: catalogAccess, error: catalogAccessError } = await supabase
      .from('user_groups')
      .select(`
        group_id,
        groups!inner(
          id,
          name,
          catalog_groups!inner(
            catalog_id,
            catalogs(id, name)
          )
        )
      `)
      .eq('user_id', user.id);

    // Test a simple query that should work with proper auth context
    const { data: profileTest, error: profileTestError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      profileTest,
      profileTestError: profileTestError?.message,
      userGroupsSimple,
      userGroups,
      groupsError: groupsError?.message,
      catalogAccess,
      catalogAccessError: catalogAccessError?.message,
      catalogsTest,
      catalogsError: catalogsError?.message,
      catalogsTestWithAuth,
      catalogsErrorWithAuth: catalogsErrorWithAuth?.message,
      catalogsServiceRole,
      debug: {
        timestamp: new Date().toISOString(),
        message: 'Enhanced debug with auth.uid() test',
        authUserId: user.id,
        sessionValid: !!user,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 