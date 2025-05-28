import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Since RLS isn't working properly with auth.uid(), let's manually implement the access logic
    // using the service role and then filter based on the user's permissions
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all catalogs and manually filter based on access rules
    const { data: allCatalogs, error: catalogsError } = await adminSupabase
      .from('catalogs')
      .select(`
        id,
        name,
        description,
        created_at,
        user_id
      `)
      .order('created_at', { ascending: false });

    if (catalogsError) {
      console.error('Error fetching catalogs:', catalogsError);
      return NextResponse.json({ error: 'Failed to fetch catalogs' }, { status: 500 });
    }

    // Get user's profile to check role
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Get user's groups
    const { data: userGroups } = await adminSupabase
      .from('user_groups')
      .select('group_id')
      .eq('user_id', user.id);

    // Get catalog-group mappings for user's groups
    const groupIds = userGroups?.map(ug => ug.group_id) || [];
    let accessibleCatalogIds: number[] = [];
    
    if (groupIds.length > 0) {
      const { data: catalogGroups } = await adminSupabase
        .from('catalog_groups')
        .select('catalog_id')
        .in('group_id', groupIds);
      
      accessibleCatalogIds = catalogGroups?.map(cg => cg.catalog_id) || [];
    }

    // Filter catalogs based on access rules
    const accessibleCatalogs = allCatalogs?.filter(catalog => {
      // Rule 1: User owns the catalog
      if (catalog.user_id === user.id) return true;
      
      // Rule 2: User is admin or manager
      if (profile?.role === 'admin' || profile?.role === 'manager') return true;
      
      // Rule 3: User has group access
      if (accessibleCatalogIds.includes(catalog.id)) return true;
      
      return false;
    }) || [];

    // Fetch profile data for each catalog owner
    const profilePromises = accessibleCatalogs.map(async (catalog) => {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', catalog.user_id)
        .single();
      
      return {
        ...catalog,
        profiles: profile
      };
    });

    const catalogsWithProfiles = await Promise.all(profilePromises);

    return NextResponse.json({ catalogs: catalogsWithProfiles });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has manager or admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check for duplicate catalog name for this user
    const { data: existingCatalog } = await supabase
      .from('catalogs')
      .select('id')
      .eq('name', name.trim())
      .eq('user_id', user.id)
      .single();

    if (existingCatalog) {
      return NextResponse.json({ error: 'Catalog with this name already exists' }, { status: 409 });
    }

    // Create the catalog
    const { data: catalog, error } = await supabase
      .from('catalogs')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        user_id: user.id
      })
      .select(`
        id,
        name,
        description,
        created_at,
        user_id
      `)
      .single();

    if (error) {
      console.error('Error creating catalog:', error);
      return NextResponse.json({ error: 'Failed to create catalog' }, { status: 500 });
    }

    // Manually fetch profile data
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single();

    const catalogWithProfile = {
      ...catalog,
      profiles: userProfile
    };

    return NextResponse.json({ catalog: catalogWithProfile }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 