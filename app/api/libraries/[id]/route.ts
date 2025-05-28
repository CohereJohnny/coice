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
    const libraryId = parseInt(id);
    if (isNaN(libraryId)) {
      return NextResponse.json({ error: 'Invalid library ID' }, { status: 400 });
    }

    // Use service role to bypass RLS issues
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the library using service role
    const { data: library, error } = await adminSupabase
      .from('libraries')
      .select(`
        id,
        name,
        description,
        parent_id,
        catalog_id,
        created_at
      `)
      .eq('id', libraryId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Library not found' }, { status: 404 });
      }
      console.error('Error fetching library:', error);
      return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 });
    }

    // Check if user has access to this library's catalog
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

    // Get the catalog info
    const { data: catalog } = await adminSupabase
      .from('catalogs')
      .select('id, name, user_id')
      .eq('id', library.catalog_id)
      .single();

    if (!catalog) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404 });
    }

    // Check access rules
    const hasAccess = 
      catalog.user_id === user.id || // User owns the catalog
      profile?.role === 'admin' || profile?.role === 'manager' || // User is admin/manager
      accessibleCatalogIds.includes(catalog.id); // User has group access

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get catalog owner profile
    const { data: catalogOwnerProfile } = await adminSupabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', catalog.user_id)
      .single();

    // Build response with catalog info
    const libraryWithCatalog = {
      ...library,
      catalogs: {
        id: catalog.id,
        name: catalog.name,
        user_id: catalog.user_id,
        profiles: catalogOwnerProfile
      }
    };

    return NextResponse.json({ library: libraryWithCatalog });
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

    // Check if user has manager or admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const libraryId = parseInt(id);
    if (isNaN(libraryId)) {
      return NextResponse.json({ error: 'Invalid library ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, parent_id } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get existing library to check catalog_id and prevent circular references
    const { data: existingLibrary, error: fetchError } = await supabase
      .from('libraries')
      .select('id, name, catalog_id, parent_id')
      .eq('id', libraryId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Library not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 });
    }

    // If parent_id is being changed, validate it
    if (parent_id !== undefined) {
      if (parent_id === libraryId) {
        return NextResponse.json({ error: 'Library cannot be its own parent' }, { status: 400 });
      }

      if (parent_id) {
        // Verify parent exists and belongs to the same catalog
        const { error: parentError } = await supabase
          .from('libraries')
          .select('id, catalog_id')
          .eq('id', parent_id)
          .eq('catalog_id', existingLibrary.catalog_id)
          .single();

        if (parentError) {
          if (parentError.code === 'PGRST116') {
            return NextResponse.json({ error: 'Parent library not found in this catalog' }, { status: 404 });
          }
          return NextResponse.json({ error: 'Failed to verify parent library' }, { status: 500 });
        }

        // Check for circular reference by ensuring the parent is not a descendant
        const isDescendant = await checkIfDescendant(supabase, parent_id, libraryId);
        if (isDescendant) {
          return NextResponse.json({ error: 'Cannot move library: would create circular reference' }, { status: 400 });
        }
      }
    }

    // Check for duplicate name in the new location
    const finalParentId = parent_id !== undefined ? parent_id : existingLibrary.parent_id;
    let duplicateQuery = supabase
      .from('libraries')
      .select('id')
      .eq('name', name.trim())
      .eq('catalog_id', existingLibrary.catalog_id)
      .neq('id', libraryId);

    if (finalParentId) {
      duplicateQuery = duplicateQuery.eq('parent_id', finalParentId);
    } else {
      duplicateQuery = duplicateQuery.is('parent_id', null);
    }

    const { data: duplicateLibrary } = await duplicateQuery.single();

    if (duplicateLibrary) {
      return NextResponse.json({ 
        error: 'Library with this name already exists in this location' 
      }, { status: 409 });
    }

    // Update the library
    const updateData: Record<string, unknown> = {
      name: name.trim(),
      description: description?.trim() || null
    };

    if (parent_id !== undefined) {
      updateData.parent_id = parent_id;
    }

    const { data: library, error } = await supabase
      .from('libraries')
      .update(updateData)
      .eq('id', libraryId)
      .select(`
        id,
        name,
        description,
        parent_id,
        catalog_id,
        created_at,
        catalogs!libraries_catalog_id_fkey(
          id,
          name,
          user_id,
          profiles!catalogs_user_id_fkey(display_name, email)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating library:', error);
      return NextResponse.json({ error: 'Failed to update library' }, { status: 500 });
    }

    return NextResponse.json({ library });
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

    // Check if user has manager or admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const libraryId = parseInt(id);
    if (isNaN(libraryId)) {
      return NextResponse.json({ error: 'Invalid library ID' }, { status: 400 });
    }

    // Check if library has child libraries
    const { data: childLibraries, error: childError } = await supabase
      .from('libraries')
      .select('id')
      .eq('parent_id', libraryId)
      .limit(1);

    if (childError) {
      console.error('Error checking child libraries:', childError);
      return NextResponse.json({ error: 'Failed to check library dependencies' }, { status: 500 });
    }

    if (childLibraries && childLibraries.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete library with child libraries. Please delete child libraries first.' 
      }, { status: 409 });
    }

    // Check if library has images
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('id')
      .eq('library_id', libraryId)
      .limit(1);

    if (imagesError) {
      console.error('Error checking images:', imagesError);
      return NextResponse.json({ error: 'Failed to check library dependencies' }, { status: 500 });
    }

    if (images && images.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete library with images. Please delete all images first.' 
      }, { status: 409 });
    }

    // Delete the library (RLS will handle permission check)
    const { error } = await supabase
      .from('libraries')
      .delete()
      .eq('id', libraryId);

    if (error) {
      console.error('Error deleting library:', error);
      return NextResponse.json({ error: 'Failed to delete library' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Library deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to check if a library is a descendant of another
async function checkIfDescendant(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, potentialAncestorId: number, libraryId: number): Promise<boolean> {
  const visited = new Set<number>();
  const queue = [potentialAncestorId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // Get all children of current library
    const { data: children, error } = await supabase
      .from('libraries')
      .select('id')
      .eq('parent_id', currentId);

    if (error) {
      console.error('Error checking descendants:', error);
      return false;
    }

    for (const child of children || []) {
      if (child.id === libraryId) {
        return true; // Found the library as a descendant
      }
      queue.push(child.id);
    }
  }

  return false;
} 