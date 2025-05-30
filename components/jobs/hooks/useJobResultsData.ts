import { useState, useEffect, useCallback, useMemo } from 'react';
import { getJobResultService, JobResult, JobResultFilters, JobResultsExportOptions } from '@/lib/services/jobResultService';
import { getJobResultSearchService } from '@/lib/services/jobResultSearchService';

export interface UseJobResultsDataProps {
  jobId?: string;
  initialFilters?: JobResultFilters;
  searchQuery?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
}

export function useJobResultsData({
  jobId,
  initialFilters = {},
  searchQuery = '',
  sortBy = 'executed_at',
  sortOrder = 'desc',
  pageSize = 50
}: UseJobResultsDataProps) {
  // Service instances
  const jobResultService = useMemo(() => getJobResultService(), []);
  const searchService = useMemo(() => getJobResultSearchService(), []);

  // Data state
  const [results, setResults] = useState<JobResult[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [aggregations, setAggregations] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Filter state
  const [filters, setFilters] = useState<JobResultFilters>({
    ...initialFilters,
    ...(jobId && { jobId })
  });

  // Build effective filters
  const effectiveFilters = useMemo(() => ({
    ...filters,
    ...(jobId && { jobId })
  }), [filters, jobId]);

  // Fetch results
  const fetchResults = useCallback(async (page = 1, append = false) => {
    try {
      setIsLoading(true);
      setError(null);

      let response;

      // Use search if query is provided
      if (searchQuery.trim()) {
        const searchResults = await searchService.searchJobResults({
          query: searchQuery,
          filters: effectiveFilters,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          rankByRelevance: true,
          highlightMatches: true
        });

        response = {
          results: searchResults.results.map(sr => sr.result),
          pagination: {
            page,
            limit: pageSize,
            total: searchResults.pagination.total,
            totalPages: Math.ceil(searchResults.pagination.total / pageSize),
            hasNextPage: searchResults.pagination.offset + pageSize < searchResults.pagination.total,
            hasPreviousPage: page > 1
          },
          aggregations: null // Search doesn't return aggregations
        };
      } else {
        // Regular filtered fetch
        response = await jobResultService.getJobResults(
          effectiveFilters,
          { page, limit: pageSize },
          true // Include aggregations
        );
      }

      if (append) {
        setResults(prev => [...prev, ...response.results]);
      } else {
        setResults(response.results);
      }

      setPagination(response.pagination);
      setAggregations(response.aggregations);

    } catch (err) {
      console.error('Error fetching job results:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch results'));
    } finally {
      setIsLoading(false);
    }
  }, [jobResultService, searchService, effectiveFilters, searchQuery, pageSize]);

  // Load more results (pagination)
  const loadMore = useCallback(async () => {
    if (pagination.hasNextPage && !isLoading) {
      await fetchResults(pagination.page + 1, true);
    }
  }, [fetchResults, pagination.hasNextPage, pagination.page, isLoading]);

  // Refresh results
  const refreshResults = useCallback(async () => {
    await fetchResults(1, false);
  }, [fetchResults]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<JobResultFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(jobId ? { jobId } : {});
  }, [jobId]);

  // Search results
  const searchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      await fetchResults(1, false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const searchResponse = await searchService.searchJobResults({
        query,
        filters: effectiveFilters,
        limit: pageSize,
        offset: 0,
        rankByRelevance: true,
        highlightMatches: true
      });

      setResults(searchResponse.results.map(sr => sr.result));
      setPagination({
        page: 1,
        limit: pageSize,
        total: searchResponse.pagination.total,
        totalPages: Math.ceil(searchResponse.pagination.total / pageSize),
        hasNextPage: searchResponse.pagination.total > pageSize,
        hasPreviousPage: false
      });

    } catch (err) {
      console.error('Error searching results:', err);
      setError(err instanceof Error ? err : new Error('Search failed'));
    } finally {
      setIsLoading(false);
    }
  }, [searchService, effectiveFilters, pageSize]);

  // Export results
  const exportResults = useCallback(async (options: JobResultsExportOptions) => {
    try {
      const exportData = await jobResultService.exportJobResults({
        ...options,
        filters: effectiveFilters
      });

      // Create download
      const blobData = typeof exportData === 'string' ? exportData : Buffer.from(exportData).toString();
      const blob = new Blob([blobData], {
        type: options.format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-results-${new Date().toISOString().split('T')[0]}.${options.format}`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Export failed:', err);
      throw err;
    }
  }, [jobResultService, effectiveFilters]);

  // Get result by ID
  const getResultById = useCallback(async (id: string): Promise<JobResult | null> => {
    try {
      return await jobResultService.getJobResultById(id);
    } catch (err) {
      console.error('Error fetching result by ID:', err);
      return null;
    }
  }, [jobResultService]);

  // Stats and metrics
  const stats = useMemo(() => {
    if (!aggregations) return null;

    return {
      totalResults: pagination.total,
      successfulResults: aggregations.totalSuccessful,
      failedResults: aggregations.totalFailed,
      successRate: pagination.total > 0 
        ? Math.round((aggregations.totalSuccessful / pagination.total) * 100)
        : 0,
      averageConfidence: aggregations.averageConfidence,
      averageExecutionTime: aggregations.averageExecutionTime,
      stageBreakdown: aggregations.stageBreakdown || []
    };
  }, [aggregations, pagination.total]);

  // Effect to fetch data when dependencies change
  useEffect(() => {
    fetchResults(1, false);
  }, [fetchResults]);

  // Effect to handle search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchResults(searchQuery);
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    } else {
      fetchResults(1, false);
    }
  }, [searchQuery, searchResults, fetchResults]);

  return {
    // Data
    results,
    pagination,
    aggregations,
    stats,
    
    // State
    isLoading,
    error,
    filters,
    
    // Actions
    fetchResults,
    loadMore,
    refreshResults,
    updateFilters,
    clearFilters,
    searchResults,
    exportResults,
    getResultById,
    
    // Computed values
    hasResults: results.length > 0,
    isEmpty: !isLoading && results.length === 0,
    isSearching: searchQuery.trim().length > 0,
    canLoadMore: pagination.hasNextPage && !isLoading
  };
} 