import { createSupabaseServiceClient } from '@/lib/supabase';
import { getJobResultService, JobResult, JobResultFilters } from './jobResultService';

export interface SearchOptions {
  query: string;
  filters?: JobResultFilters;
  searchFields?: SearchField[];
  fuzzySearch?: boolean;
  highlightMatches?: boolean;
  rankByRelevance?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchField {
  field: 'response' | 'metadata' | 'error' | 'stage_name' | 'prompt_name';
  weight: number; // Higher weight = more important for relevance scoring
  boost?: number; // Additional boost for exact matches
}

export interface SearchResult {
  result: JobResult;
  relevance_score: number;
  match_count: number;
  highlights: SearchHighlight[];
  matched_fields: string[];
}

export interface SearchHighlight {
  field: string;
  matched_text: string;
  context: string;
  start_position: number;
  end_position: number;
}

export interface SearchStats {
  total_results: number;
  search_time_ms: number;
  top_matching_stages: Array<{
    stage_name: string;
    match_count: number;
  }>;
  top_matching_prompts: Array<{
    prompt_name: string;
    match_count: number;
  }>;
  confidence_distribution: {
    high: number; // >0.8
    medium: number; // 0.5-0.8
    low: number; // <0.5
  };
}

export interface IndexingOptions {
  updateSearchVectors?: boolean;
  rebuildIndex?: boolean;
  batchSize?: number;
}

export class JobResultSearchService {
  private supabase = createSupabaseServiceClient();
  private jobResultService = getJobResultService();

  // Default search field weights
  private defaultSearchFields: SearchField[] = [
    { field: 'response', weight: 1.0, boost: 1.5 },
    { field: 'metadata', weight: 0.8, boost: 1.2 },
    { field: 'stage_name', weight: 0.6, boost: 2.0 },
    { field: 'prompt_name', weight: 0.6, boost: 2.0 },
    { field: 'error', weight: 0.4, boost: 1.1 }
  ];

  /**
   * Perform advanced search across job results
   */
  async searchJobResults(options: SearchOptions): Promise<{
    results: SearchResult[];
    stats: SearchStats;
    pagination: {
      offset: number;
      limit: number;
      total: number;
    };
  }> {
    const startTime = Date.now();
    const limit = Math.min(options.limit || 50, 500);
    const offset = options.offset || 0;

    try {
      // Build search query
      const searchQuery = this.buildSearchQuery(options);
      
      // Execute search
      const { data: rawResults, error, count } = await this.supabase
        .rpc('search_job_results', {
          search_query: options.query,
          search_options: {
            fuzzy: options.fuzzySearch || false,
            highlight: options.highlightMatches || true,
            rank: options.rankByRelevance || true,
            fields: options.searchFields || this.defaultSearchFields,
            filters: options.filters || {},
            limit,
            offset
          }
        });

      if (error) {
        console.warn('Advanced search failed, falling back to basic search:', error);
        return this.fallbackSearch(options);
      }

      // Process and rank results
      const searchResults = this.processSearchResults(rawResults || [], options);
      
      // Calculate search statistics
      const stats = await this.calculateSearchStats(options.query, searchResults, startTime);

      return {
        results: searchResults,
        stats,
        pagination: {
          offset,
          limit,
          total: count || 0
        }
      };
    } catch (error) {
      console.error('Search error:', error);
      return this.fallbackSearch(options);
    }
  }

  /**
   * Perform full-text search with highlighting
   */
  async fullTextSearch(
    query: string,
    filters?: JobResultFilters,
    limit = 50
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('job_results')
        .select(`
          *,
          image:images!job_results_image_id_fkey(id, gcs_path, metadata),
          stage:pipeline_stages!job_results_stage_id_fkey(
            id, stage_order,
            prompt:prompts!pipeline_stages_prompt_id_fkey(id, name, prompt, type)
          ),
          job:jobs!job_results_job_id_fkey(id, pipeline_id, status, created_at)
        `)
        .textSearch('search_vector', query, {
          type: 'websearch',
          config: 'english'
        })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []).map((item, index) => ({
        result: this.transformJobResult(item),
        relevance_score: 1.0 - (index * 0.01), // Simple relevance scoring
        match_count: 1,
        highlights: this.extractHighlights(item, query),
        matched_fields: this.getMatchedFields(item, query)
      }));
    } catch (error) {
      console.error('Full-text search error:', error);
      return [];
    }
  }

  /**
   * Search by similarity (semantic search)
   */
  async semanticSearch(
    query: string,
    threshold = 0.7,
    limit = 50
  ): Promise<SearchResult[]> {
    try {
      // This would require embedding generation and vector similarity search
      // For now, implement as enhanced text search with semantic-like features
      return this.enhancedTextSearch(query, threshold, limit);
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  /**
   * Search within specific job results
   */
  async searchWithinJob(
    jobId: string,
    query: string,
    options?: Partial<SearchOptions>
  ): Promise<SearchResult[]> {
    const searchOptions: SearchOptions = {
      ...options,
      query,
      filters: {
        ...options?.filters,
        jobId
      }
    };

    const results = await this.searchJobResults(searchOptions);
    return results.results;
  }

  /**
   * Search by metadata fields
   */
  async searchByMetadata(
    metadataQuery: Record<string, any>,
    additionalFilters?: JobResultFilters,
    limit = 50
  ): Promise<JobResult[]> {
    try {
      let query = this.supabase
        .from('job_results')
        .select(`
          *,
          image:images!job_results_image_id_fkey(id, gcs_path, metadata),
          stage:pipeline_stages!job_results_stage_id_fkey(
            id, stage_order,
            prompt:prompts!pipeline_stages_prompt_id_fkey(id, name, prompt, type)
          ),
          job:jobs!job_results_job_id_fkey(id, pipeline_id, status, created_at)
        `)
        .limit(limit);

      // Apply metadata filters using JSONB operators
      Object.entries(metadataQuery).forEach(([key, value]) => {
        if (typeof value === 'string') {
          query = query.ilike(`result->metadata->${key}`, `%${value}%`);
        } else {
          query = query.eq(`result->metadata->${key}`, value);
        }
      });

      // Apply additional filters
      if (additionalFilters) {
        query = this.applyFiltersToQuery(query, additionalFilters);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(this.transformJobResult);
    } catch (error) {
      console.error('Metadata search error:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    partialQuery: string,
    maxSuggestions = 10
  ): Promise<string[]> {
    try {
      // Get suggestions from response content
      const { data: responseSuggestions } = await this.supabase
        .from('job_results')
        .select('result->response')
        .ilike('result->response', `%${partialQuery}%`)
        .limit(maxSuggestions);

      // Get suggestions from metadata
      const { data: metadataSuggestions } = await this.supabase
        .from('job_results')
        .select('result->metadata')
        .filter('result->metadata', 'cs', `{"search": "${partialQuery}"}`)
        .limit(maxSuggestions);

      // Process and deduplicate suggestions
      const suggestions = new Set<string>();
      
      // Extract text fragments from responses
      (responseSuggestions || []).forEach(item => {
        const responseData = item as { response?: string };
        const response = responseData.response;
        if (response && typeof response === 'string') {
          const words = response.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.includes(partialQuery.toLowerCase()) && word.length > 2) {
              suggestions.add(word);
            }
          });
        }
      });

      return Array.from(suggestions).slice(0, maxSuggestions);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Index or reindex job results for search
   */
  async indexJobResults(options: IndexingOptions = {}): Promise<{
    indexed: number;
    errors: number;
    time_ms: number;
  }> {
    const startTime = Date.now();
    let indexed = 0;
    let errors = 0;
    const batchSize = options.batchSize || 100;

    try {
      if (options.rebuildIndex) {
        // Clear existing search vectors
        await this.supabase
          .from('job_results')
          .update({ search_vector: null });
      }

      // Get total count for progress tracking
      const { count: totalCount } = await this.supabase
        .from('job_results')
        .select('*', { count: 'exact', head: true });

      console.log(`Indexing ${totalCount} job results...`);

      // Process in batches
      let offset = 0;
      while (offset < (totalCount || 0)) {
        const { data: batch, error } = await this.supabase
          .from('job_results')
          .select(`
            id,
            result,
            stage:pipeline_stages!job_results_stage_id_fkey(
              prompt:prompts!pipeline_stages_prompt_id_fkey(name, prompt)
            )
          `)
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error('Error fetching batch for indexing:', error);
          errors += batchSize;
          offset += batchSize;
          continue;
        }

        // Update search vectors for this batch
        const updates = (batch || []).map(item => {
          try {
            const searchableText = this.buildSearchableText(item);
            return {
              id: item.id,
              search_vector: searchableText
            };
          } catch (error) {
            console.error('Error building searchable text:', error);
            errors++;
            return null;
          }
        }).filter((update): update is { id: string; search_vector: string } => update !== null);

        // Bulk update search vectors
        for (const update of updates) {
          try {
            await this.supabase
              .from('job_results')
              .update({ search_vector: update.search_vector })
              .eq('id', update.id);
            indexed++;
          } catch (error) {
            console.error('Error updating search vector:', error);
            errors++;
          }
        }

        offset += batchSize;
        console.log(`Indexed ${Math.min(offset, totalCount || 0)}/${totalCount} results`);
      }

      const time_ms = Date.now() - startTime;
      console.log(`Indexing completed: ${indexed} indexed, ${errors} errors, ${time_ms}ms`);

      return { indexed, errors, time_ms };
    } catch (error) {
      console.error('Indexing error:', error);
      return { indexed, errors: errors + 1, time_ms: Date.now() - startTime };
    }
  }

  /**
   * Get indexing status and statistics
   */
  async getIndexingStatus(): Promise<{
    total_results: number;
    indexed_results: number;
    indexing_percentage: number;
    last_indexed?: string;
    avg_search_vector_length: number;
  }> {
    try {
      const [
        { count: totalResults },
        { count: indexedResults },
        { data: avgStats }
      ] = await Promise.all([
        this.supabase
          .from('job_results')
          .select('*', { count: 'exact', head: true }),
        this.supabase
          .from('job_results')
          .select('*', { count: 'exact', head: true })
          .not('search_vector', 'is', null),
        this.supabase
          .from('job_results')
          .select('search_vector')
          .not('search_vector', 'is', null)
          .limit(100)
      ]);

      const avgLength = (avgStats || []).reduce((sum, item) => 
        sum + (item.search_vector?.length || 0), 0
      ) / Math.max((avgStats || []).length, 1);

      return {
        total_results: totalResults || 0,
        indexed_results: indexedResults || 0,
        indexing_percentage: totalResults ? Math.round((indexedResults || 0) / totalResults * 100) : 0,
        avg_search_vector_length: Math.round(avgLength)
      };
    } catch (error) {
      console.error('Error getting indexing status:', error);
      return {
        total_results: 0,
        indexed_results: 0,
        indexing_percentage: 0,
        avg_search_vector_length: 0
      };
    }
  }

  // Private helper methods

  /**
   * Build searchable text from job result
   */
  private buildSearchableText(item: any): string {
    const parts: string[] = [];

    // Add response text
    if (item.result?.response) {
      parts.push(item.result.response);
    }

    // Add stage and prompt names
    if (item.stage?.prompt?.name) {
      parts.push(item.stage.prompt.name);
    }

    if (item.stage?.prompt?.prompt) {
      parts.push(item.stage.prompt.prompt);
    }

    // Add metadata values
    if (item.result?.metadata) {
      Object.values(item.result.metadata).forEach(value => {
        if (typeof value === 'string') {
          parts.push(value);
        }
      });
    }

    // Add error messages
    if (item.result?.error) {
      parts.push(item.result.error);
    }

    return parts.join(' ').toLowerCase();
  }

  /**
   * Build search query with filters
   */
  private buildSearchQuery(options: SearchOptions): string {
    // This would build a complex search query for the database
    // For now, return the basic query
    return options.query;
  }

  /**
   * Process raw search results
   */
  private processSearchResults(rawResults: any[], options: SearchOptions): SearchResult[] {
    return rawResults.map((item, index) => ({
      result: this.transformJobResult(item),
      relevance_score: this.calculateRelevanceScore(item, options),
      match_count: this.countMatches(item, options.query),
      highlights: this.extractHighlights(item, options.query),
      matched_fields: this.getMatchedFields(item, options.query)
    }));
  }

  /**
   * Calculate relevance score for search result
   */
  private calculateRelevanceScore(item: any, options: SearchOptions): number {
    let score = 1.0;
    const query = options.query.toLowerCase();
    const searchFields = options.searchFields || this.defaultSearchFields;

    searchFields.forEach(field => {
      const fieldValue = this.getFieldValue(item, field.field)?.toLowerCase() || '';
      
      if (fieldValue.includes(query)) {
        // Exact match gets full weight + boost
        score += field.weight * (field.boost || 1.0);
      } else if (options.fuzzySearch && this.fuzzyMatch(fieldValue, query)) {
        // Fuzzy match gets partial weight
        score += field.weight * 0.5;
      }
    });

    // Normalize score
    return Math.min(score, 5.0);
  }

  /**
   * Count total matches in result
   */
  private countMatches(item: any, query: string): number {
    let count = 0;
    const searchText = this.buildSearchableText(item).toLowerCase();
    const queryLower = query.toLowerCase();
    
    let index = searchText.indexOf(queryLower);
    while (index !== -1) {
      count++;
      index = searchText.indexOf(queryLower, index + 1);
    }
    
    return count;
  }

  /**
   * Extract highlights from search result
   */
  private extractHighlights(item: any, query: string): SearchHighlight[] {
    const highlights: SearchHighlight[] = [];
    const queryLower = query.toLowerCase();

    // Check response field
    const response = item.result?.response || '';
    if (response && typeof response === 'string') {
      const responseLower = response.toLowerCase();
      let index = responseLower.indexOf(queryLower);
      
      while (index !== -1 && highlights.length < 5) {
        const start = Math.max(0, index - 30);
        const end = Math.min(response.length, index + query.length + 30);
        
        highlights.push({
          field: 'response',
          matched_text: response.substring(index, index + query.length),
          context: response.substring(start, end),
          start_position: index,
          end_position: index + query.length
        });
        
        index = responseLower.indexOf(queryLower, index + 1);
      }
    }

    return highlights;
  }

  /**
   * Get fields that matched the search query
   */
  private getMatchedFields(item: any, query: string): string[] {
    const matched: string[] = [];
    const queryLower = query.toLowerCase();

    if (item.result?.response?.toLowerCase().includes(queryLower)) {
      matched.push('response');
    }

    if (item.result?.error?.toLowerCase().includes(queryLower)) {
      matched.push('error');
    }

    if (item.stage?.prompt?.name?.toLowerCase().includes(queryLower)) {
      matched.push('stage_name');
    }

    return matched;
  }

  /**
   * Get field value for search
   */
  private getFieldValue(item: any, field: SearchField['field']): string | null {
    switch (field) {
      case 'response':
        return item.result?.response;
      case 'error':
        return item.result?.error;
      case 'stage_name':
        return item.stage?.prompt?.name;
      case 'prompt_name':
        return item.stage?.prompt?.prompt;
      case 'metadata':
        return JSON.stringify(item.result?.metadata || {});
      default:
        return null;
    }
  }

  /**
   * Simple fuzzy matching
   */
  private fuzzyMatch(text: string, query: string): boolean {
    // Simple implementation - check if most characters match
    const textChars = text.split('');
    const queryChars = query.split('');
    let matches = 0;

    queryChars.forEach(char => {
      if (textChars.includes(char)) {
        matches++;
      }
    });

    return matches / queryChars.length > 0.7;
  }

  /**
   * Enhanced text search with semantic-like features
   */
  private async enhancedTextSearch(
    query: string,
    threshold: number,
    limit: number
  ): Promise<SearchResult[]> {
    // Implement enhanced text search as fallback for semantic search
    return this.fullTextSearch(query, undefined, limit);
  }

  /**
   * Fallback search using basic methods
   */
  private async fallbackSearch(options: SearchOptions): Promise<any> {
    console.log('Using fallback search method');
    
    const results = await this.jobResultService.searchJobResults(
      options.query,
      options.filters,
      { limit: options.limit, page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1 }
    );

    const searchResults = results.results.map((result, index) => ({
      result,
      relevance_score: 1.0 - (index * 0.01),
      match_count: 1,
      highlights: this.extractHighlights(result, options.query),
      matched_fields: this.getMatchedFields(result, options.query)
    }));

    return {
      results: searchResults,
      stats: {
        total_results: results.pagination.total,
        search_time_ms: 50,
        top_matching_stages: [],
        top_matching_prompts: [],
        confidence_distribution: { high: 0, medium: 0, low: 0 }
      },
      pagination: results.pagination
    };
  }

  /**
   * Calculate search statistics
   */
  private async calculateSearchStats(
    query: string,
    results: SearchResult[],
    startTime: number
  ): Promise<SearchStats> {
    const searchTime = Date.now() - startTime;
    
    // Count stages and prompts
    const stageCount = new Map<string, number>();
    const promptCount = new Map<string, number>();
    const confidenceRanges = { high: 0, medium: 0, low: 0 };

    results.forEach(result => {
      // Count stage matches
      if (result.result.stage?.prompt?.name) {
        const stageName = result.result.stage.prompt.name;
        stageCount.set(stageName, (stageCount.get(stageName) || 0) + 1);
      }

      // Count confidence distribution
      const confidence = result.result.result?.confidence || 0;
      if (confidence > 0.8) {
        confidenceRanges.high++;
      } else if (confidence > 0.5) {
        confidenceRanges.medium++;
      } else {
        confidenceRanges.low++;
      }
    });

    return {
      total_results: results.length,
      search_time_ms: searchTime,
      top_matching_stages: Array.from(stageCount.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([stage_name, match_count]) => ({ stage_name, match_count })),
      top_matching_prompts: Array.from(promptCount.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([prompt_name, match_count]) => ({ prompt_name, match_count })),
      confidence_distribution: confidenceRanges
    };
  }

  /**
   * Apply filters to database query
   */
  private applyFiltersToQuery(query: any, filters: JobResultFilters): any {
    if (filters.jobId) {
      query = query.eq('job_id', filters.jobId);
    }
    if (filters.imageId) {
      query = query.eq('image_id', filters.imageId);
    }
    if (filters.success !== undefined) {
      query = query.eq('result->>success', filters.success.toString());
    }
    return query;
  }

  /**
   * Transform database result to JobResult interface
   */
  private transformJobResult(dbResult: any): JobResult {
    return {
      id: dbResult.id,
      job_id: dbResult.job_id,
      image_id: dbResult.image_id,
      stage_id: dbResult.stage_id,
      result: dbResult.result || {},
      executed_at: dbResult.executed_at,
      search_vector: dbResult.search_vector,
      image: dbResult.image,
      stage: dbResult.stage,
      job: dbResult.job,
    };
  }
}

// Export singleton instance
let jobResultSearchServiceInstance: JobResultSearchService | null = null;

export function getJobResultSearchService(): JobResultSearchService {
  if (!jobResultSearchServiceInstance) {
    jobResultSearchServiceInstance = new JobResultSearchService();
  }
  return jobResultSearchServiceInstance;
}

export default getJobResultSearchService; 