import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const catalogId = parseInt(id);
    if (isNaN(catalogId)) {
      return NextResponse.json({ error: 'Invalid catalog ID' }, { status: 400 });
    }

    // Get the catalog (RLS will handle access control)
    const { data: catalog, error } = await supabase
      .from('catalogs')
      .select(`
        id,
        name,
        description,
        created_at,
        user_id
      `)
      .eq('id', catalogId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Catalog not found' }, { status: 404 });
      }
      console.error('Error fetching catalog:', error);
      return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
    }

    // Manually fetch profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', catalog.user_id)
      .single();

    const catalogWithProfile = {
      ...catalog,
      profiles: profile
    };

    return NextResponse.json({ catalog: catalogWithProfile });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const catalogId = parseInt(id);
    if (isNaN(catalogId)) {
      return NextResponse.json({ error: 'Invalid catalog ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if catalog exists and user has permission to update it
    const { error: fetchError } = await supabase
      .from('catalogs')
      .select('id, name, user_id')
      .eq('id', catalogId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Catalog not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
    }

    // Check for duplicate name (excluding current catalog)
    const { data: duplicateCatalog } = await supabase
      .from('catalogs')
      .select('id')
      .eq('name', name.trim())
      .eq('user_id', user.id)
      .neq('id', catalogId)
      .single();

    if (duplicateCatalog) {
      return NextResponse.json({ error: 'Catalog with this name already exists' }, { status: 409 });
    }

    // Update the catalog (RLS will handle permission check)
    const { data: catalog, error } = await supabase
      .from('catalogs')
      .update({
        name: name.trim(),
        description: description?.trim() || null
      })
      .eq('id', catalogId)
      .select(`
        id,
        name,
        description,
        created_at,
        user_id
      `)
      .single();

    if (error) {
      console.error('Error updating catalog:', error);
      return NextResponse.json({ error: 'Failed to update catalog' }, { status: 500 });
    }

    // Manually fetch profile data
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', catalog.user_id)
      .single();

    const catalogWithProfile = {
      ...catalog,
      profiles: updatedProfile
    };

    return NextResponse.json({ catalog: catalogWithProfile });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const catalogId = parseInt(id);
    if (isNaN(catalogId)) {
      return NextResponse.json({ error: 'Invalid catalog ID' }, { status: 400 });
    }

    // Check if catalog exists and user has permission to delete it
    const { data: catalog, error: fetchError } = await supabase
      .from('catalogs')
      .select('id, name, user_id')
      .eq('id', catalogId)
      .single();

    if (fetchError || !catalog) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404 });
    }

    // Check if catalog has libraries
    const { data: libraries, error: librariesError } = await supabase
      .from('libraries')
      .select('id')
      .eq('catalog_id', catalogId)
      .limit(1);

    if (librariesError) {
      console.error('Error checking libraries:', librariesError);
      return NextResponse.json({ error: 'Failed to check catalog dependencies' }, { status: 500 });
    }

    if (libraries && libraries.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete catalog with existing libraries. Please delete all libraries first.' 
      }, { status: 409 });
    }

    // Delete the catalog (RLS will handle permission check)
    const { error } = await supabase
      .from('catalogs')
      .delete()
      .eq('id', catalogId);

    if (error) {
      console.error('Error deleting catalog:', error);
      return NextResponse.json({ error: 'Failed to delete catalog' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Catalog deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 