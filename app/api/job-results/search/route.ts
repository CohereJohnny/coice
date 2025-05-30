import { NextRequest, NextResponse } from 'next/server';
import { getJobResultSearchService } from '@/lib/services/jobResultSearchService';
import { JobResultFilters } from '@/lib/services/jobResultService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchService = getJobResultSearchService();
    
    // Check what type of search is requested
    const searchType = searchParams.get('type') || 'basic';
    const query = searchParams.get('q') || '';
    
    if (!query && searchType !== 'suggestions' && searchType !== 'status') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    switch (searchType) {
      case 'advanced': {
        // Advanced search with options
        const filters: JobResultFilters = {};
        
        // Parse filters from query parameters
        if (searchParams.get('jobId')) {
          filters.jobId = searchParams.get('jobId')!;
        }
        if (searchParams.get('success')) {
          filters.success = searchParams.get('success') === 'true';
        }
        if (searchParams.get('confidenceMin')) {
          filters.confidenceMin = parseFloat(searchParams.get('confidenceMin')!);
        }
        if (searchParams.get('confidenceMax')) {
          filters.confidenceMax = parseFloat(searchParams.get('confidenceMax')!);
        }

        const searchOptions = {
          query,
          filters,
          fuzzySearch: searchParams.get('fuzzy') === 'true',
          highlightMatches: searchParams.get('highlight') !== 'false',
          rankByRelevance: searchParams.get('rank') !== 'false',
          limit: parseInt(searchParams.get('limit') || '50'),
          offset: parseInt(searchParams.get('offset') || '0')
        };

        const results = await searchService.searchJobResults(searchOptions);
        return NextResponse.json(results);
      }

      case 'fulltext': {
        // Full-text search
        const filters: JobResultFilters = {};
        if (searchParams.get('jobId')) {
          filters.jobId = searchParams.get('jobId')!;
        }
        
        const limit = parseInt(searchParams.get('limit') || '50');
        const results = await searchService.fullTextSearch(query, filters, limit);
        
        return NextResponse.json({
          results,
          total: results.length,
          query,
          search_type: 'fulltext'
        });
      }

      case 'semantic': {
        // Semantic/similarity search
        const threshold = parseFloat(searchParams.get('threshold') || '0.7');
        const limit = parseInt(searchParams.get('limit') || '50');
        
        const results = await searchService.semanticSearch(query, threshold, limit);
        
        return NextResponse.json({
          results,
          total: results.length,
          query,
          threshold,
          search_type: 'semantic'
        });
      }

      case 'metadata': {
        // Metadata-based search
        try {
          const metadataQuery = JSON.parse(searchParams.get('metadata') || '{}');
          const limit = parseInt(searchParams.get('limit') || '50');
          
          const results = await searchService.searchByMetadata(metadataQuery, undefined, limit);
          
          return NextResponse.json({
            results,
            total: results.length,
            metadata_query: metadataQuery,
            search_type: 'metadata'
          });
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid metadata query JSON' },
            { status: 400 }
          );
        }
      }

      case 'suggestions': {
        // Get search suggestions
        const partialQuery = searchParams.get('q') || '';
        const maxSuggestions = parseInt(searchParams.get('max') || '10');
        
        if (!partialQuery) {
          return NextResponse.json([]);
        }
        
        const suggestions = await searchService.getSearchSuggestions(partialQuery, maxSuggestions);
        
        return NextResponse.json({
          suggestions,
          partial_query: partialQuery,
          count: suggestions.length
        });
      }

      case 'status': {
        // Get indexing status
        const status = await searchService.getIndexingStatus();
        return NextResponse.json(status);
      }

      case 'basic':
      default: {
        // Basic search using the original service
        const filters: JobResultFilters = {};
        if (searchParams.get('jobId')) {
          filters.jobId = searchParams.get('jobId')!;
        }
        
        const limit = parseInt(searchParams.get('limit') || '50');
        const results = await searchService.fullTextSearch(query, filters, limit);
        
        return NextResponse.json({
          results,
          total: results.length,
          query,
          search_type: 'basic'
        });
      }
    }
  } catch (error) {
    console.error('Error in search endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    const searchService = getJobResultSearchService();
    
    const action = searchParams.get('action');
    
    switch (action) {
      case 'index': {
        // Trigger indexing
        const options = {
          rebuildIndex: body.rebuild || false,
          batchSize: body.batchSize || 100
        };
        
        const result = await searchService.indexJobResults(options);
        
        return NextResponse.json({
          success: true,
          ...result,
          message: `Indexing completed: ${result.indexed} indexed, ${result.errors} errors`
        });
      }

      case 'search-within-job': {
        // Search within specific job
        const { jobId, query, options } = body;
        
        if (!jobId || !query) {
          return NextResponse.json(
            { error: 'jobId and query are required' },
            { status: 400 }
          );
        }
        
        const results = await searchService.searchWithinJob(jobId, query, options);
        
        return NextResponse.json({
          results,
          total: results.length,
          job_id: jobId,
          query
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: index, search-within-job' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in search POST endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    );
  }
} 