import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const libraryId = parseInt(params.id);
    if (isNaN(libraryId)) {
      return NextResponse.json({ error: 'Invalid library ID' }, { status: 400 });
    }

    // Get the library (RLS will handle access control)
    const { data: library, error } = await supabase
      .from('libraries')
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
      .eq('id', libraryId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Library not found' }, { status: 404 });
      }
      console.error('Error fetching library:', error);
      return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 });
    }

    return NextResponse.json({ library });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const libraryId = parseInt(params.id);
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
        const { data: parentLibrary, error: parentError } = await supabase
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
    const updateData: any = {
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
  { params }: { params: { id: string } }
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

    const libraryId = parseInt(params.id);
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
async function checkIfDescendant(supabase: any, potentialAncestorId: number, libraryId: number): Promise<boolean> {
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