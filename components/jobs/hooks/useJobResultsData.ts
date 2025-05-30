import { useState, useCallback, useMemo, useEffect } from 'react';
import { JobResult, JobResultFilters, JobResultsExportOptions } from '@/lib/services/jobResultService';

export interface UseJobResultsDataProps {
  jobId?: string;
  initialFilters?: Partial<JobResultFilters>;
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

  // Fetch results using API calls instead of direct service access
  const fetchResults = useCallback(async (page = 1, append = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
        aggregations: 'true', // Always include aggregations for filters
        ...(searchQuery && { searchTerm: searchQuery })
      });

      // Add all filters to query params
      if (effectiveFilters.jobId) {
        queryParams.append('jobId', effectiveFilters.jobId);
      }
      if (effectiveFilters.imageId) {
        queryParams.append('imageId', effectiveFilters.imageId);
      }
      if (effectiveFilters.stageId) {
        queryParams.append('stageId', effectiveFilters.stageId);
      }
      if (effectiveFilters.stageOrder !== undefined) {
        queryParams.append('stageOrder', effectiveFilters.stageOrder.toString());
      }
      if (effectiveFilters.success !== undefined) {
        queryParams.append('success', effectiveFilters.success.toString());
      }
      if (effectiveFilters.confidenceMin !== undefined) {
        queryParams.append('confidenceMin', effectiveFilters.confidenceMin.toString());
      }
      if (effectiveFilters.confidenceMax !== undefined) {
        queryParams.append('confidenceMax', effectiveFilters.confidenceMax.toString());
      }
      if (effectiveFilters.promptType) {
        queryParams.append('promptType', effectiveFilters.promptType);
      }
      if (effectiveFilters.dateFrom) {
        queryParams.append('dateFrom', effectiveFilters.dateFrom);
      }
      if (effectiveFilters.dateTo) {
        queryParams.append('dateTo', effectiveFilters.dateTo);
      }
      if (effectiveFilters.hasError !== undefined) {
        queryParams.append('hasError', effectiveFilters.hasError.toString());
      }
      if (effectiveFilters.executionTimeMin !== undefined) {
        queryParams.append('executionTimeMin', effectiveFilters.executionTimeMin.toString());
      }
      if (effectiveFilters.executionTimeMax !== undefined) {
        queryParams.append('executionTimeMax', effectiveFilters.executionTimeMax.toString());
      }

      const response = await fetch(`/api/job-results?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.statusText}`);
      }

      const data = await response.json();

      if (append) {
        setResults(prev => [...prev, ...data.results]);
      } else {
        setResults(data.results || []);
      }

      setPagination(data.pagination || {
        page: 1,
        limit: pageSize,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      });
      
      setAggregations(data.aggregations || null);

    } catch (err) {
      console.error('Error fetching job results:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch results'));
      // Set empty state on error
      setResults([]);
      setPagination({
        page: 1,
        limit: pageSize,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      });
    } finally {
      setIsLoading(false);
    }
  }, [effectiveFilters, searchQuery, pageSize, sortBy, sortOrder]);

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

  // Search results - simplified for testing
  const searchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      await fetchResults(1, false);
      return;
    }
    // For testing phase, use the same fetchResults with search query
    await fetchResults(1, false);
  }, [fetchResults]);

  // Export results - simplified for testing  
  const exportResults = useCallback(async (options: JobResultsExportOptions) => {
    try {
      // For testing phase, create a simple export
      const dataToExport = {
        results: results,
        filters: effectiveFilters,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-results-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      throw err;
    }
  }, [results, effectiveFilters]);

  // Get result by ID - simplified for testing
  const getResultById = useCallback(async (id: string): Promise<JobResult | null> => {
    try {
      const response = await fetch(`/api/job-results/${id}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error('Error fetching result by ID:', err);
      return null;
    }
  }, []);

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

  // Initial fetch and refetch on filter changes
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