'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchHistory } from '@/components/search/SearchHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Clock, BookmarkIcon } from 'lucide-react';
import { useAuth } from '@/lib/stores/auth';
import type { SearchFilters as SearchFiltersType, SearchResponse, SearchResult } from '@/app/api/search/route';

interface SearchHistoryEntry {
  query: string;
  timestamp: string;
  filters: SearchFiltersType;
}

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function SearchPageContent() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Separate state for actual searches
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [executionTime, setExecutionTime] = useState(0);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'alphabetical'>('relevance');
  const [hasSearched, setHasSearched] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce the search query - only search after user stops typing for 500ms
  const debouncedSearchQuery = useDebounce(query, 500);

  // Initialize from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    const urlPage = searchParams.get('page');
    const urlSort = searchParams.get('sort');
    const urlTypes = searchParams.get('types');
    
    if (urlQuery) {
      setQuery(urlQuery);
      setSearchQuery(urlQuery);
      setHasSearched(true);
    }
    if (urlPage) {
      setPage(parseInt(urlPage));
    }
    if (urlSort && ['relevance', 'date', 'alphabetical'].includes(urlSort)) {
      setSortBy(urlSort as any);
    }
    if (urlTypes) {
      setFilters(prev => ({
        ...prev,
        content_types: urlTypes.split(',')
      }));
    }
  }, [searchParams]);

  // Perform search with abort controller for cancellation
  const performSearch = useCallback(async (searchQuery: string, searchPage: number = 1) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalCount(0);
      setHasSearched(false);
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: searchPage.toString(),
        per_page: '20',
        sort: sortBy
      });

      // Add filters to params
      if (filters.content_types?.length) {
        params.set('types', filters.content_types.join(','));
      }
      if (filters.date_from) {
        params.set('date_from', filters.date_from);
      }
      if (filters.date_to) {
        params.set('date_to', filters.date_to);
      }
      if (filters.library_id) {
        params.set('library_id', filters.library_id.toString());
      }
      if (filters.catalog_id) {
        params.set('catalog_id', filters.catalog_id.toString());
      }

      const response = await fetch(`/api/search?${params}`, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse = await response.json();
      setResults(data.results);
      setTotalCount(data.total_count);
      setExecutionTime(data.execution_time_ms);
      setHasSearched(true);

      // Update URL without triggering navigation
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('q', searchQuery);
      newUrl.searchParams.set('page', searchPage.toString());
      newUrl.searchParams.set('sort', sortBy);
      if (filters.content_types?.length) {
        newUrl.searchParams.set('types', filters.content_types.join(','));
      } else {
        newUrl.searchParams.delete('types');
      }
      
      window.history.replaceState({}, '', newUrl.toString());

      // Save to search history
      saveToSearchHistory(searchQuery);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }
      console.error('Search error:', error);
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy]);

  // Effect for debounced search
  useEffect(() => {
    if (debouncedSearchQuery.trim() && debouncedSearchQuery !== searchQuery) {
      setSearchQuery(debouncedSearchQuery);
      setPage(1);
      performSearch(debouncedSearchQuery, 1);
    } else if (!debouncedSearchQuery.trim()) {
      setResults([]);
      setTotalCount(0);
      setHasSearched(false);
      setSearchQuery('');
    }
  }, [debouncedSearchQuery, performSearch, searchQuery]);

  // Save search to history
  const saveToSearchHistory = useCallback((searchQuery: string) => {
    const history = getSearchHistory();
    const newEntry: SearchHistoryEntry = {
      query: searchQuery,
      timestamp: new Date().toISOString(),
      filters: { ...filters }
    };
    
    // Remove duplicates and add to front
    const filtered = history.filter((item: SearchHistoryEntry) => item.query !== searchQuery);
    const updated = [newEntry, ...filtered].slice(0, 10); // Keep last 10 searches
    
    localStorage.setItem('coice_search_history', JSON.stringify(updated));
  }, [filters]);

  // Get search history
  const getSearchHistory = (): SearchHistoryEntry[] => {
    try {
      const history = localStorage.getItem('coice_search_history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  };

  // Clear search history
  const clearSearchHistory = () => {
    localStorage.removeItem('coice_search_history');
  };

  // Handle new search
  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    setPage(1);
  };

  // Handle query input change (for real-time typing)
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
  };

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    if (searchQuery) {
      setPage(1);
      performSearch(searchQuery, 1);
    }
  };

  const handleSortChange = (newSort: 'relevance' | 'date' | 'alphabetical') => {
    setSortBy(newSort);
    if (searchQuery) {
      setPage(1);
      performSearch(searchQuery, 1);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (searchQuery) {
      performSearch(searchQuery, newPage);
    }
  };

  const handleHistoryItemClick = (historyQuery: string, historyFilters: SearchFiltersType) => {
    setQuery(historyQuery);
    setFilters(historyFilters);
    setPage(1);
    performSearch(historyQuery, 1);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Search</h1>
            <p className="text-muted-foreground">Please log in to search content.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Search</h1>
          <p className="text-muted-foreground">
              Search across catalogs, libraries, images, and analysis results
          </p>
        </div>

          {/* Search Input */}
          <div className="mb-6">
            <SearchInput
              value={query}
              onChange={handleQueryChange}
              onSearch={handleSearch}
              loading={loading}
              placeholder="Search for images, content, or analysis results..."
            />
          </div>

          <div className="flex gap-6">
            {/* Filters Sidebar */}
            <div className="w-80 shrink-0">
              <SearchFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                className="sticky top-6"
              />
              
              {/* Search History */}
              <div className="mt-6">
                <SearchHistory
                  onSearchSelect={(query: string) => handleHistoryItemClick(query, {})}
                  maxItems={10}
                />
              </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 min-w-0">
              {/* Search Stats */}
              {hasSearched && (
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </div>
                    ) : (
                      <span>
                        {totalCount.toLocaleString()} results found in {executionTime}ms
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value as any)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="date">Date</option>
                      <option value="alphabetical">Alphabetical</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {hasSearched ? (
                <SearchResults
                  results={results}
                  loading={loading}
                  query={searchQuery}
                  page={page}
                  totalCount={totalCount}
                  perPage={20}
                  onPageChange={handlePageChange}
                />
              ) : (
                <div className="text-center py-16">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Search the System</h3>
          <p className="text-muted-foreground">
                    Find catalogs, libraries, images, and analysis results. Use the search bar above to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading search...</p>
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
} 