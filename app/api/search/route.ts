import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { generateSearchEmbedding } from '@/lib/services/cohere-embeddings';
import { getSignedUrl } from '@/lib/gcs';
import { headers } from 'next/headers';

export interface SearchFilters {
  content_types?: string[];
  date_from?: string;
  date_to?: string;
  file_types?: string[];
  user_id?: string;
  library_id?: number;
  catalog_id?: number;
  similarity_threshold?: number;
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
  similarity_score?: number;
  context?: {
    catalog_name?: string;
    library_name?: string;
    library_id?: number;
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
  search_type: 'text' | 'semantic' | 'hybrid';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = Math.min(parseInt(searchParams.get('per_page') || '20'), 100);
    const sort_by = searchParams.get('sort') || 'relevance';
    const search_type = searchParams.get('search_type') || 'hybrid';
    const similarity_threshold = parseFloat(searchParams.get('similarity_threshold') || '0.3');
    
    // Visual similarity search parameters
    const similar_to = searchParams.get('similar_to'); // Image ID for similarity search
    
    // Parse filters
    const filters: SearchFilters = {
      content_types: searchParams.get('types')?.split(','),
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      library_id: searchParams.get('library_id') ? parseInt(searchParams.get('library_id')!) : undefined,
      catalog_id: searchParams.get('catalog_id') ? parseInt(searchParams.get('catalog_id')!) : undefined,
      file_types: searchParams.get('file_types')?.split(','),
      similarity_threshold
    };

    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    let searchResult;

    // Handle visual similarity search
    if (similar_to) {
      searchResult = await performSimilaritySearch(
        supabase,
        similar_to,
        filters,
        page,
        per_page,
        sort_by
      );
    } else if (query.trim()) {
      // Regular text/semantic search
      const embeddingResult = await generateSearchEmbedding(query);
      
      if (embeddingResult.success) {
        console.log('🔍 Using vector search with embedding');
        searchResult = await performVectorSearch(
          supabase,
          query,
          embeddingResult.embedding,
          filters,
          page,
          per_page,
          sort_by,
          search_type
        );
      } else {
        console.log('🔍 Falling back to text search');
        searchResult = await performTextSearch(
          supabase,
          query,
          filters,
          page,
          per_page,
          sort_by
        );
      }
    } else {
      // No query provided
      return NextResponse.json({
        results: [],
        total_count: 0,
        page,
        per_page,
        total_pages: 0,
        execution_time_ms: Date.now() - startTime
      });
    }

    const executionTime = Date.now() - startTime;
    console.log(`🔍 Search completed in ${executionTime}ms`);

    return NextResponse.json({
      ...searchResult,
      execution_time_ms: executionTime
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function performVectorSearch(
  supabase: any,
  query: string,
  queryEmbedding: number[],
  filters: SearchFilters,
  page: number,
  per_page: number,
  sort_by: string,
  search_type: string
) {
  const offset = (page - 1) * per_page;
  const results: SearchResult[] = [];
  let total_count = 0;

  // Search catalogs if not filtered out
  if (!filters.content_types || filters.content_types.includes('catalog')) {
    const catalogResults = await searchCatalogsVector(supabase, query, queryEmbedding, filters, search_type);
    results.push(...catalogResults);
  }

  // Search libraries if not filtered out
  if (!filters.content_types || filters.content_types.includes('library')) {
    const libraryResults = await searchLibrariesVector(supabase, query, queryEmbedding, filters, search_type);
    results.push(...libraryResults);
  }

  // Search images if not filtered out
  if (!filters.content_types || filters.content_types.includes('image')) {
    const imageResults = await searchImagesVector(supabase, query, queryEmbedding, filters, search_type);
    results.push(...imageResults);
  }

  // Search job results if not filtered out
  if (!filters.content_types || filters.content_types.includes('job_result')) {
    const jobResultResults = await searchJobResultsVector(supabase, query, queryEmbedding, filters, search_type);
    results.push(...jobResultResults);
  }

  // Sort results
  if (sort_by === 'relevance' || sort_by === 'similarity') {
    results.sort((a, b) => {
      const scoreA = a.similarity_score || a.relevance_score || 0;
      const scoreB = b.similarity_score || b.relevance_score || 0;
      return scoreB - scoreA;
    });
  } else if (sort_by === 'date') {
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort_by === 'alphabetical') {
    results.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort_by === 'file_size') {
    results.sort((a, b) => {
      const sizeA = a.file_size || 0;
      const sizeB = b.file_size || 0;
      return sizeB - sizeA; // Largest files first
    });
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

async function performTextSearch(
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
  } else if (sort_by === 'file_size') {
    results.sort((a, b) => {
      const sizeA = a.file_size || 0;
      const sizeB = b.file_size || 0;
      return sizeB - sizeA; // Largest files first
    });
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

// Vector search functions
async function searchCatalogsVector(supabase: any, query: string, queryEmbedding: number[], filters: SearchFilters, search_type: string) {
  let queryBuilder = supabase
    .from('catalogs')
    .select(`
      id,
      name,
      description,
      created_at,
      user_id,
      embedding,
      profiles!catalogs_user_id_fkey(display_name)
    `)
    .not('embedding', 'is', null);

  // Add filters
  if (filters.catalog_id) {
    queryBuilder = queryBuilder.eq('id', filters.catalog_id);
  }
  if (filters.user_id) {
    queryBuilder = queryBuilder.eq('user_id', filters.user_id);
  }
  if (filters.date_from) {
    queryBuilder = queryBuilder.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    queryBuilder = queryBuilder.lte('created_at', filters.date_to);
  }

  const { data, error } = await queryBuilder;
  
  if (error) {
    console.error('Catalog vector search error:', error);
    return [];
  }

  const results = (data || []).map((catalog: any): SearchResult => {
    const similarity = calculateCosineSimilarity(queryEmbedding, catalog.embedding);
    const textRelevance = calculateRelevanceScore(query, catalog.name, catalog.description);
    
    return {
      id: catalog.id.toString(),
      type: 'catalog',
      title: catalog.name,
      description: catalog.description,
      created_at: catalog.created_at,
      similarity_score: similarity,
      relevance_score: search_type === 'hybrid' ? (similarity * 0.7 + textRelevance * 0.3) : similarity,
      context: {
        catalog_name: catalog.name
      }
    };
  });

  // Filter by similarity threshold
  const filteredResults = results.filter((result: SearchResult) => (result.similarity_score || 0) >= (filters.similarity_threshold || 0.3));
  
  // Debug logging for dog searches
  if (query.toLowerCase().includes('dog')) {
    console.log(`🔍 Dog search: Found ${data?.length} images with embeddings, ${results.length} processed, ${filteredResults.length} passed threshold`);
    console.log(`🔍 Similarity threshold being used: ${filters.similarity_threshold || 0.3}`);
    console.log(`🔍 Top 5 similarity scores: ${results.slice(0, 5).map((r: SearchResult) => r.similarity_score?.toFixed(3)).join(', ')}`);
    if (filteredResults.length === 0 && results.length > 0) {
      console.log(`🔍 Highest similarity score: ${Math.max(...results.map((r: SearchResult) => r.similarity_score || 0)).toFixed(3)}`);
      console.log(`🔍 Would pass with threshold 0.1: ${results.filter((r: SearchResult) => (r.similarity_score || 0) >= 0.1).length} results`);
    }
  }
  
  return filteredResults;
}

async function searchLibrariesVector(supabase: any, query: string, queryEmbedding: number[], filters: SearchFilters, search_type: string) {
  let queryBuilder = supabase
    .from('libraries')
    .select(`
      id,
      name,
      description,
      catalog_id,
      parent_id,
      created_at,
      embedding,
      catalogs!libraries_catalog_id_fkey(name)
    `)
    .not('embedding', 'is', null);

  // Add filters
  if (filters.catalog_id) {
    queryBuilder = queryBuilder.eq('catalog_id', filters.catalog_id);
  }
  if (filters.library_id) {
    queryBuilder = queryBuilder.eq('id', filters.library_id);
  }
  if (filters.date_from) {
    queryBuilder = queryBuilder.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    queryBuilder = queryBuilder.lte('created_at', filters.date_to);
  }

  const { data, error } = await queryBuilder;
  
  if (error) {
    console.error('Library vector search error:', error);
    return [];
  }

  const results = (data || []).map((library: any): SearchResult => {
    const similarity = calculateCosineSimilarity(queryEmbedding, library.embedding);
    const textRelevance = calculateRelevanceScore(query, library.name, library.description);
    
    return {
      id: library.id.toString(),
      type: 'library',
      title: library.name,
      description: library.description,
      created_at: library.created_at,
      similarity_score: similarity,
      relevance_score: search_type === 'hybrid' ? (similarity * 0.7 + textRelevance * 0.3) : similarity,
      context: {
        catalog_name: library.catalogs?.name,
        library_name: library.name,
        library_id: library.id,
        library_path: library.name
      }
    };
  });

  // Filter by similarity threshold
  const filteredResults = results.filter((result: SearchResult) => (result.similarity_score || 0) >= (filters.similarity_threshold || 0.3));
  
  // Debug logging for dog searches
  if (query.toLowerCase().includes('dog')) {
    console.log(`🔍 Dog search: Found ${data?.length} images with embeddings, ${results.length} processed, ${filteredResults.length} passed threshold`);
    console.log(`🔍 Similarity threshold being used: ${filters.similarity_threshold || 0.3}`);
    console.log(`🔍 Top 5 similarity scores: ${results.slice(0, 5).map((r: SearchResult) => r.similarity_score?.toFixed(3)).join(', ')}`);
    if (filteredResults.length === 0 && results.length > 0) {
      console.log(`🔍 Highest similarity score: ${Math.max(...results.map((r: SearchResult) => r.similarity_score || 0)).toFixed(3)}`);
      console.log(`🔍 Would pass with threshold 0.1: ${results.filter((r: SearchResult) => (r.similarity_score || 0) >= 0.1).length} results`);
    }
  }
  
  return filteredResults;
}

async function searchImagesVector(supabase: any, query: string, queryEmbedding: number[], filters: SearchFilters, search_type: string) {
  let queryBuilder = supabase
    .from('images')
    .select(`
      id,
      gcs_path,
      metadata,
      created_at,
      library_id,
      embedding,
      libraries!images_library_id_fkey(
        name,
        catalog_id,
        catalogs!libraries_catalog_id_fkey(name)
      )
    `)
    .not('embedding', 'is', null);

  // Add filters
  if (filters.library_id) {
    queryBuilder = queryBuilder.eq('library_id', filters.library_id);
  }
  if (filters.date_from) {
    queryBuilder = queryBuilder.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    queryBuilder = queryBuilder.lte('created_at', filters.date_to);
  }

  const { data, error } = await queryBuilder;
  
  if (error) {
    console.error('Image vector search error:', error);
    return [];
  }

  // Debug the raw embedding data format for first image
  if (query.toLowerCase().includes('dog') && data && data.length > 0) {
    const firstImage = data[0];
    const filename = firstImage.gcs_path.split('/').pop() || '';
    console.log(`🔍 RAW EMBEDDING DEBUG for ${filename}:`);
    console.log(`🔍 Embedding type: ${typeof firstImage.embedding}`);
    console.log(`🔍 Embedding constructor: ${firstImage.embedding?.constructor?.name}`);
    console.log(`🔍 Is array: ${Array.isArray(firstImage.embedding)}`);
    console.log(`🔍 Raw embedding length: ${firstImage.embedding?.length}`);
    if (typeof firstImage.embedding === 'string') {
      console.log(`🔍 String preview: ${firstImage.embedding.substring(0, 100)}...`);
      try {
        const parsed = JSON.parse(firstImage.embedding);
        console.log(`🔍 Parsed type: ${typeof parsed}, isArray: ${Array.isArray(parsed)}, length: ${parsed?.length}`);
      } catch (e) {
        console.log(`🔍 JSON parse failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }
    console.log(`🔍 Embedding first few values: ${JSON.stringify(firstImage.embedding).substring(0, 200)}`);
  }

  const results = (data || []).map((image: any): SearchResult => {
    const filename = image.gcs_path.split('/').pop() || '';
    const metadata = image.metadata || {};
    
    const similarity = calculateCosineSimilarity(queryEmbedding, image.embedding);
    const textRelevance = calculateRelevanceScore(query, filename, JSON.stringify(metadata));
    
    // Debug logging for dog searches
    if (query.toLowerCase().includes('dog')) {
      console.log(`🔍 Image search debug: ${filename}, similarity: ${similarity.toFixed(3)}, threshold: ${filters.similarity_threshold}`);
    }
    
    return {
      id: image.id,
      type: 'image',
      title: filename,
      description: `Image in ${image.libraries?.name || 'Unknown Library'}`,
      metadata: metadata,
      created_at: image.created_at,
      similarity_score: similarity,
      relevance_score: search_type === 'hybrid' ? (similarity * 0.8 + textRelevance * 0.2) : similarity,
      context: {
        catalog_name: image.libraries?.catalogs?.name,
        library_name: image.libraries?.name,
        library_id: image.library_id,
        library_path: image.libraries?.name
      },
      file_size: metadata.file_size,
      file_type: metadata.file_type || metadata.mimetype
    };
  });

  // Generate thumbnail URLs for the filtered results
  const filteredResults = results.filter((result: SearchResult) => (result.similarity_score || 0) >= (filters.similarity_threshold || 0.3));
  
  // Add thumbnail URLs to the filtered results
  const resultsWithThumbnails = await Promise.all(
    filteredResults.map(async (result: SearchResult) => {
      try {
        const imageData = data?.find((img: any) => img.id === result.id);
        if (!imageData) return result;

        let thumbnailUrl: string | undefined;

        // Try to get thumbnail URL first
        if (imageData.metadata?.thumbnail?.path) {
          try {
            const thumbnailFileName = imageData.metadata.thumbnail.path.replace(`gs://${process.env.GCS_BUCKET_NAME}/`, '');
            thumbnailUrl = await getSignedUrl(thumbnailFileName, 'read', new Date(Date.now() + 60 * 60 * 1000));
          } catch (error) {
            console.warn(`Failed to generate thumbnail URL for ${result.title}, falling back to original`);
          }
        }

        // Fallback to original image if no thumbnail
        if (!thumbnailUrl && imageData.gcs_path) {
          try {
            const originalFileName = imageData.gcs_path.replace(`gs://${process.env.GCS_BUCKET_NAME}/`, '');
            thumbnailUrl = await getSignedUrl(originalFileName, 'read', new Date(Date.now() + 60 * 60 * 1000));
          } catch (error) {
            console.warn(`Failed to generate original image URL for ${result.title}`);
          }
        }

        return {
          ...result,
          thumbnail_url: thumbnailUrl
        };
      } catch (error) {
        console.error(`Error generating thumbnail URL for image ${result.id}:`, error);
        return result;
      }
    })
  );
  
  // Debug logging for dog searches
  if (query.toLowerCase().includes('dog')) {
    console.log(`🔍 Dog search: Found ${data?.length} images with embeddings, ${results.length} processed, ${resultsWithThumbnails.length} passed threshold`);
    console.log(`🔍 Similarity threshold being used: ${filters.similarity_threshold || 0.3}`);
    console.log(`🔍 Top 5 similarity scores: ${results.slice(0, 5).map((r: SearchResult) => r.similarity_score?.toFixed(3)).join(', ')}`);
    if (resultsWithThumbnails.length === 0 && results.length > 0) {
      console.log(`🔍 Highest similarity score: ${Math.max(...results.map((r: SearchResult) => r.similarity_score || 0)).toFixed(3)}`);
      console.log(`🔍 Would pass with threshold 0.1: ${results.filter((r: SearchResult) => (r.similarity_score || 0) >= 0.1).length} results`);
    }
  }
  
  return resultsWithThumbnails;
}

async function searchJobResultsVector(supabase: any, query: string, queryEmbedding: number[], filters: SearchFilters, search_type: string) {
  let queryBuilder = supabase
    .from('job_results')
    .select(`
      id,
      result,
      executed_at,
      confidence,
      job_id,
      image_id,
      embedding,
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
    `)
    .not('embedding', 'is', null);

  // Add filters
  if (filters.library_id) {
    queryBuilder = queryBuilder.eq('images.library_id', filters.library_id);
  }
  if (filters.date_from) {
    queryBuilder = queryBuilder.gte('executed_at', filters.date_from);
  }
  if (filters.date_to) {
    queryBuilder = queryBuilder.lte('executed_at', filters.date_to);
  }

  const { data, error } = await queryBuilder;
  
  if (error) {
    console.error('Job result vector search error:', error);
    return [];
  }

  const results = (data || []).map((result: any): SearchResult => {
    const imageName = result.images?.gcs_path?.split('/').pop() || 'Unknown Image';
    const resultText = typeof result.result === 'string' ? result.result : JSON.stringify(result.result);
    const similarity = calculateCosineSimilarity(queryEmbedding, result.embedding);
    const textRelevance = calculateRelevanceScore(query, imageName, resultText);
    
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
      similarity_score: similarity,
      relevance_score: search_type === 'hybrid' ? (similarity * 0.7 + textRelevance * 0.3) : similarity,
      context: {
        catalog_name: result.images?.libraries?.catalogs?.name,
        library_name: result.images?.libraries?.name,
        job_id: result.job_id,
        pipeline_name: result.jobs?.pipelines?.name
      }
    };
  });

  return results.filter((result: SearchResult) => (result.similarity_score || 0) >= (filters.similarity_threshold || 0.3));
}

// Helper function for cosine similarity (matching the one in the service)
function calculateCosineSimilarity(a: number[], b: number[]): number {
  // Ensure both vectors are proper arrays
  const vectorA = parseVectorData(a);
  const vectorB = parseVectorData(b);
  
  if (vectorA.length !== vectorB.length) {
    console.log(`🔍 Similarity debug: dimension mismatch - a.length=${vectorA.length}, b.length=${vectorB.length}`);
    return 0;
  }

  // Debug logging for first similarity calculation
  if (vectorA.length === 1024 && vectorB.length === 1024) {
    console.log(`🔍 Similarity debug: both vectors are 1024D`);
    console.log(`🔍 Query vector first 3: [${vectorA.slice(0, 3).map(v => v.toFixed(6)).join(', ')}]`);
    console.log(`🔍 Image vector first 3: [${vectorB.slice(0, 3).map(v => v.toFixed(6)).join(', ')}]`);
    console.log(`🔍 Query vector type: ${typeof vectorA[0]}, Image vector type: ${typeof vectorB[0]}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    console.log(`🔍 Similarity debug: zero norm - normA=${normA}, normB=${normB}`);
    console.log(`🔍 dotProduct=${dotProduct}`);
    return 0;
  }

  const similarity = dotProduct / (normA * normB);
  
  // Debug for first calculation
  if (vectorA.length === 1024) {
    console.log(`🔍 Similarity result: ${similarity.toFixed(6)}, dotProduct=${dotProduct.toFixed(6)}, normA=${normA.toFixed(6)}, normB=${normB.toFixed(6)}`);
  }
  
  return similarity;
}

// Helper function to parse vector data from Supabase
function parseVectorData(vector: any): number[] {
  // If it's already an array of numbers, return as is
  if (Array.isArray(vector) && typeof vector[0] === 'number') {
    return vector;
  }
  
  // If it's a string representation of an array, parse it
  if (typeof vector === 'string') {
    try {
      const parsed = JSON.parse(vector);
      if (Array.isArray(parsed)) {
        return parsed.map(v => Number(v));
      }
    } catch (e) {
      console.error('🔍 Failed to parse vector string:', e instanceof Error ? e.message : 'Unknown error');
    }
  }
  
  // If it's an array of strings, convert to numbers
  if (Array.isArray(vector) && typeof vector[0] === 'string') {
    return vector.map(v => Number(v));
  }
  
  console.error('🔍 Unsupported vector format:', typeof vector, Array.isArray(vector));
  return [];
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

// Text search functions (fallback)
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
    query = query.or(`name.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*`);
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
      catalogs!libraries_catalog_id_fkey(name)
    `);

  // Add search conditions
  if (searchTerm) {
    query = query.or(`name.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*`);
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
      library_id: library.id,
      library_path: library.name
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

  // Add search conditions (search in GCS path only to avoid casting issues)
  if (searchTerm) {
    query = query.ilike('gcs_path', `*${searchTerm}*`);
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
        library_id: image.library_id,
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

  // Skip text search in job results for now to avoid casting issues
  // Will rely on vector search for job results

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

async function performSimilaritySearch(
  supabase: any,
  referenceImageId: string,
  filters: SearchFilters,
  page: number,
  per_page: number,
  sort_by: string
) {
  const offset = (page - 1) * per_page;
  
  try {
    // First, get the embedding of the reference image
    const { data: referenceImage, error: referenceError } = await supabase
      .from('images')
      .select('embedding, metadata')
      .eq('id', referenceImageId)
      .single();
    
    if (referenceError || !referenceImage || !referenceImage.embedding) {
      throw new Error('Reference image not found or has no embedding');
    }
    
    const referenceEmbedding = referenceImage.embedding;
    console.log(`🔍 Finding images similar to image ${referenceImageId}`);
    
    // Now search for similar images using the reference embedding
    const imageResults = await searchImagesVector(
      supabase, 
      '', // Empty query since we're doing pure similarity search
      referenceEmbedding, 
      { ...filters, content_types: ['image'] }, // Force to images only
      'similarity'
    );
    
    // Filter out the reference image itself from results
    const filteredResults = imageResults.filter((result: SearchResult) => 
      result.id.toString() !== referenceImageId
    );
    
    // Sort by similarity score
    filteredResults.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    
    const total_count = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + per_page);
    
    return {
      results: paginatedResults,
      total_count,
      page,
      per_page
    };
  } catch (error) {
    console.error('Similarity search error:', error);
    return {
      results: [],
      total_count: 0,
      page,
      per_page
    };
  }
}