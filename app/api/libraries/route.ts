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

    const { searchParams } = new URL(request.url);
    const catalogId = searchParams.get('catalog_id');

    let query = supabase
      .from('libraries')
      .select(`
        id,
        name,
        description,
        parent_id,
        catalog_id,
        created_at
      `)
      .order('name');

    // Filter by catalog if specified
    if (catalogId) {
      const catalogIdNum = parseInt(catalogId);
      if (isNaN(catalogIdNum)) {
        return NextResponse.json({ error: 'Invalid catalog ID' }, { status: 400 });
      }
      query = query.eq('catalog_id', catalogIdNum);
    }

    const { data: libraries, error } = await query;

    if (error) {
      console.error('Error fetching libraries:', error);
      return NextResponse.json({ error: 'Failed to fetch libraries' }, { status: 500 });
    }

    // Manually fetch catalog information for each library
    const librariesWithCatalogs = await Promise.all(
      (libraries || []).map(async (library) => {
        try {
          const { data: catalog } = await supabase
            .from('catalogs')
            .select('id, name')
            .eq('id', library.catalog_id)
            .single();
          
          return {
            ...library,
            catalog: catalog
          };
        } catch (catalogError) {
          console.error('Error fetching catalog for library:', library.id, catalogError);
          return {
            ...library,
            catalog: null
          };
        }
      })
    );

    // Build hierarchy structure
    const libraryMap = new Map();
    const rootLibraries: any[] = [];

    // First pass: create map of all libraries
    librariesWithCatalogs?.forEach(library => {
      libraryMap.set(library.id, { ...library, children: [] });
    });

    // Second pass: build hierarchy
    librariesWithCatalogs?.forEach(library => {
      if (library.parent_id) {
        const parent = libraryMap.get(library.parent_id);
        if (parent) {
          parent.children.push(libraryMap.get(library.id));
        }
      } else {
        rootLibraries.push(libraryMap.get(library.id));
      }
    });

    return NextResponse.json({ libraries: rootLibraries });
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
    const { name, description, catalog_id, parent_id } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!catalog_id || typeof catalog_id !== 'number') {
      return NextResponse.json({ error: 'Catalog ID is required' }, { status: 400 });
    }

    // Verify catalog exists and user has access
    const { data: catalog, error: catalogError } = await supabase
      .from('catalogs')
      .select('id, name')
      .eq('id', catalog_id)
      .single();

    if (catalogError) {
      if (catalogError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Catalog not found or access denied' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to verify catalog access' }, { status: 500 });
    }

    // If parent_id is provided, verify it exists and belongs to the same catalog
    if (parent_id) {
      const { data: parentLibrary, error: parentError } = await supabase
        .from('libraries')
        .select('id, catalog_id')
        .eq('id', parent_id)
        .eq('catalog_id', catalog_id)
        .single();

      if (parentError) {
        if (parentError.code === 'PGRST116') {
          return NextResponse.json({ error: 'Parent library not found in this catalog' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to verify parent library' }, { status: 500 });
      }
    }

    // Check for duplicate library name within the same parent/catalog
    let duplicateQuery = supabase
      .from('libraries')
      .select('id')
      .eq('name', name.trim())
      .eq('catalog_id', catalog_id);

    if (parent_id) {
      duplicateQuery = duplicateQuery.eq('parent_id', parent_id);
    } else {
      duplicateQuery = duplicateQuery.is('parent_id', null);
    }

    const { data: existingLibrary } = await duplicateQuery.single();

    if (existingLibrary) {
      return NextResponse.json({ 
        error: 'Library with this name already exists in this location' 
      }, { status: 409 });
    }

    // Create the library
    const { data: library, error } = await supabase
      .from('libraries')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        catalog_id,
        parent_id: parent_id || null
      })
      .select(`
        id,
        name,
        description,
        parent_id,
        catalog_id,
        created_at
      `)
      .single();

    if (error) {
      console.error('Error creating library:', error);
      return NextResponse.json({ error: 'Failed to create library' }, { status: 500 });
    }

    // Manually fetch catalog information
    const { data: libraryCatalog } = await supabase
      .from('catalogs')
      .select('id, name')
      .eq('id', library.catalog_id)
      .single();

    const libraryWithCatalog = {
      ...library,
      catalog: libraryCatalog
    };

    return NextResponse.json({ library: libraryWithCatalog }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 