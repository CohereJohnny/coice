import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { headers } from 'next/headers';

export interface SearchFilters {
  content_types?: string[];
  date_from?: string;
  date_to?: string;
  file_types?: string[];
  user_id?: string;
  library_id?: number;
  catalog_id?: number;
}

export interface SearchResult {
  id: string;
  type: 'catalog' | 'library' | 'image' | 'job_result';
  title: string;
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at?: string;
  relevance_score?: number;
  context?: {
    catalog_name?: string;
    library_name?: string;
    library_path?: string;
    job_id?: string;
    pipeline_name?: string;
  };
  thumbnail_url?: string;
  file_size?: number;
  file_type?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  page: number;
  per_page: number;
  query: string;
  filters: SearchFilters;
  execution_time_ms: number;
}

export async function GET(request: NextRequest) {
  const start_time = Date.now();
  
  try {
    const supabase = await createSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    
    // Get search parameters
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = Math.min(parseInt(searchParams.get('per_page') || '20'), 100);
    const sort_by = searchParams.get('sort') || 'relevance';
    
    // Parse filters
    const filters: SearchFilters = {
      content_types: searchParams.get('types')?.split(',').filter(Boolean),
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      file_types: searchParams.get('file_types')?.split(',').filter(Boolean),
      user_id: searchParams.get('user_id') || undefined,
      library_id: searchParams.get('library_id') ? parseInt(searchParams.get('library_id')!) : undefined,
      catalog_id: searchParams.get('catalog_id') ? parseInt(searchParams.get('catalog_id')!) : undefined,
    };

    if (!query.trim()) {
      return NextResponse.json({
        results: [],
        total_count: 0,
        page,
        per_page,
        query,
        filters,
        execution_time_ms: Date.now() - start_time
      } as SearchResponse);
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Perform search across all content types
    const searchResults = await performSearch(supabase, query, filters, page, per_page, sort_by);
    
    const response: SearchResponse = {
      ...searchResults,
      query,
      filters,
      execution_time_ms: Date.now() - start_time
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function performSearch(
  supabase: any,
  query: string,
  filters: SearchFilters,
  page: number,
  per_page: number,
  sort_by: string
) {
  const offset = (page - 1) * per_page;
  const searchTerm = query.trim().replace(/[^\w\s]/g, '').split(/\s+/).join(' & ');
  
  const results: SearchResult[] = [];
  let total_count = 0;

  // Search catalogs if not filtered out
  if (!filters.content_types || filters.content_types.includes('catalog')) {
    const catalogResults = await searchCatalogs(supabase, searchTerm, filters);
    results.push(...catalogResults);
  }

  // Search libraries if not filtered out
  if (!filters.content_types || filters.content_types.includes('library')) {
    const libraryResults = await searchLibraries(supabase, searchTerm, filters);
    results.push(...libraryResults);
  }

  // Search images if not filtered out
  if (!filters.content_types || filters.content_types.includes('image')) {
    const imageResults = await searchImages(supabase, searchTerm, filters);
    results.push(...imageResults);
  }

  // Search job results if not filtered out
  if (!filters.content_types || filters.content_types.includes('job_result')) {
    const jobResultResults = await searchJobResults(supabase, searchTerm, filters);
    results.push(...jobResultResults);
  }

  // Sort results
  if (sort_by === 'relevance') {
    results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  } else if (sort_by === 'date') {
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort_by === 'alphabetical') {
    results.sort((a, b) => a.title.localeCompare(b.title));
  }

  total_count = results.length;

  // Apply pagination
  const paginatedResults = results.slice(offset, offset + per_page);

  return {
    results: paginatedResults,
    total_count,
    page,
    per_page
  };
}

async function searchCatalogs(supabase: any, searchTerm: string, filters: SearchFilters) {
  let query = supabase
    .from('catalogs')
    .select(`
      id,
      name,
      description,
      created_at,
      user_id,
      profiles!catalogs_user_id_fkey(display_name)
    `);

  // Add search conditions
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  // Add filters
  if (filters.catalog_id) {
    query = query.eq('id', filters.catalog_id);
  }
  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Catalog search error:', error);
    return [];
  }

  return (data || []).map((catalog: any): SearchResult => ({
    id: catalog.id.toString(),
    type: 'catalog',
    title: catalog.name,
    description: catalog.description,
    created_at: catalog.created_at,
    relevance_score: calculateRelevanceScore(searchTerm, catalog.name, catalog.description),
    context: {
      catalog_name: catalog.name
    }
  }));
}

async function searchLibraries(supabase: any, searchTerm: string, filters: SearchFilters) {
  let query = supabase
    .from('libraries')
    .select(`
      id,
      name,
      description,
      catalog_id,
      parent_id,
      created_at,
      catalogs!libraries_catalog_id_fkey(name),
      parent:libraries!libraries_parent_id_fkey(name)
    `);

  // Add search conditions
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  // Add filters
  if (filters.catalog_id) {
    query = query.eq('catalog_id', filters.catalog_id);
  }
  if (filters.library_id) {
    query = query.eq('id', filters.library_id);
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Library search error:', error);
    return [];
  }

  return (data || []).map((library: any): SearchResult => ({
    id: library.id.toString(),
    type: 'library',
    title: library.name,
    description: library.description,
    created_at: library.created_at,
    relevance_score: calculateRelevanceScore(searchTerm, library.name, library.description),
    context: {
      catalog_name: library.catalogs?.name,
      library_name: library.name,
      library_path: library.parent?.name ? `${library.parent.name}/${library.name}` : library.name
    }
  }));
}

async function searchImages(supabase: any, searchTerm: string, filters: SearchFilters) {
  let query = supabase
    .from('images')
    .select(`
      id,
      gcs_path,
      metadata,
      created_at,
      library_id,
      libraries!images_library_id_fkey(
        name,
        catalog_id,
        catalogs!libraries_catalog_id_fkey(name)
      )
    `);

  // Add search conditions (search in GCS path and metadata)
  if (searchTerm) {
    query = query.or(`gcs_path.ilike.%${searchTerm}%,metadata::text.ilike.%${searchTerm}%`);
  }

  // Add filters
  if (filters.library_id) {
    query = query.eq('library_id', filters.library_id);
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Image search error:', error);
    return [];
  }

  return (data || []).map((image: any): SearchResult => {
    const filename = image.gcs_path.split('/').pop() || '';
    const metadata = image.metadata || {};
    
    return {
      id: image.id,
      type: 'image',
      title: filename,
      description: `Image in ${image.libraries?.name || 'Unknown Library'}`,
      metadata: metadata,
      created_at: image.created_at,
      relevance_score: calculateRelevanceScore(searchTerm, filename, JSON.stringify(metadata)),
      context: {
        catalog_name: image.libraries?.catalogs?.name,
        library_name: image.libraries?.name,
        library_path: image.libraries?.name
      },
      file_size: metadata.file_size,
      file_type: metadata.file_type || metadata.mimetype
    };
  });
}

async function searchJobResults(supabase: any, searchTerm: string, filters: SearchFilters) {
  let query = supabase
    .from('job_results')
    .select(`
      id,
      result,
      executed_at,
      confidence,
      job_id,
      image_id,
      jobs!job_results_job_id_fkey(
        id,
        pipeline_id,
        pipelines!jobs_pipeline_id_fkey(name)
      ),
      images!job_results_image_id_fkey(
        gcs_path,
        library_id,
        libraries!images_library_id_fkey(
          name,
          catalogs!libraries_catalog_id_fkey(name)
        )
      )
    `);

  // Use the existing search_vector if available, otherwise fallback to text search
  if (searchTerm) {
    query = query.or(`result::text.ilike.%${searchTerm}%`);
  }

  // Add filters
  if (filters.library_id) {
    query = query.eq('images.library_id', filters.library_id);
  }
  if (filters.date_from) {
    query = query.gte('executed_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('executed_at', filters.date_to);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Job result search error:', error);
    return [];
  }

  return (data || []).map((result: any): SearchResult => {
    const imageName = result.images?.gcs_path?.split('/').pop() || 'Unknown Image';
    const resultText = typeof result.result === 'string' ? result.result : JSON.stringify(result.result);
    
    return {
      id: result.id,
      type: 'job_result',
      title: `Analysis Result: ${imageName}`,
      description: resultText.substring(0, 200) + (resultText.length > 200 ? '...' : ''),
      metadata: {
        confidence: result.confidence,
        job_id: result.job_id,
        image_id: result.image_id
      },
      created_at: result.executed_at,
      relevance_score: calculateRelevanceScore(searchTerm, imageName, resultText),
      context: {
        catalog_name: result.images?.libraries?.catalogs?.name,
        library_name: result.images?.libraries?.name,
        job_id: result.job_id,
        pipeline_name: result.jobs?.pipelines?.name
      }
    };
  });
}

function calculateRelevanceScore(searchTerm: string, title: string, content?: string): number {
  if (!searchTerm) return 0;
  
  const terms = searchTerm.toLowerCase().split(/\s+/);
  const titleLower = title.toLowerCase();
  const contentLower = (content || '').toLowerCase();
  
  let score = 0;
  
  // Title matches are weighted higher
  terms.forEach(term => {
    if (titleLower.includes(term)) {
      score += titleLower === term ? 10 : 5; // Exact match vs partial match
    }
    if (contentLower.includes(term)) {
      score += 1;
    }
  });
  
  return Math.min(score / 10, 1); // Normalize to 0-1 range
} 