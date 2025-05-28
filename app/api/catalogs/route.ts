import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's accessible catalogs based on RLS policies
    const { data: catalogs, error } = await supabase
      .from('catalogs')
      .select(`
        id,
        name,
        description,
        created_at,
        user_id
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching catalogs:', error);
      return NextResponse.json({ error: 'Failed to fetch catalogs' }, { status: 500 });
    }

    // Manually fetch profile data for each catalog
    const catalogsWithProfiles = await Promise.all(
      (catalogs || []).map(async (catalog) => {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('id', catalog.user_id)
            .single();
          
          return {
            ...catalog,
            profiles: profile
          };
        } catch (profileError) {
          console.error('Error fetching profile for catalog:', catalog.id, profileError);
          return {
            ...catalog,
            profiles: null
          };
        }
      })
    );

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