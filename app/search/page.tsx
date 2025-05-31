'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

export default function SearchPage() {
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
  const saveToSearchHistory = (searchQuery: string) => {
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
  };

  // Get search history
  const getSearchHistory = (): SearchHistoryEntry[] => {
    try {
      const history = localStorage.getItem('coice_search_history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  };

  // Handle explicit search submission (e.g., from suggestions, history, or button click)
  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    setSearchQuery(newQuery);
    setPage(1);
    performSearch(newQuery, 1);
  };

  // Handle input changes (just update display, debouncing handles search)
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    setPage(1);
    if (searchQuery.trim()) {
      performSearch(searchQuery, 1);
    }
  };

  // Handle sort changes
  const handleSortChange = (newSort: 'relevance' | 'date' | 'alphabetical') => {
    setSortBy(newSort);
    setPage(1);
    if (searchQuery.trim()) {
      performSearch(searchQuery, 1);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    performSearch(searchQuery, newPage);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground">Please log in to search the system.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
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
          placeholder="Search for catalogs, libraries, images, or results..."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <SearchFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            </CardContent>
          </Card>

          {/* Search History */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SearchHistory
                onSearchSelect={handleSearch}
                maxItems={5}
              />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search Results Header */}
          {hasSearched && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Searching...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Found {totalCount.toLocaleString()} results
                        </span>
                        {executionTime > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {executionTime}ms
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sort Options */}
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

              {/* Active Filters */}
              {(filters.content_types?.length || filters.date_from || filters.date_to) && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {filters.content_types?.map(type => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                  {filters.date_from && (
                    <Badge variant="outline" className="text-xs">
                      From: {new Date(filters.date_from).toLocaleDateString()}
                    </Badge>
                  )}
                  {filters.date_to && (
                    <Badge variant="outline" className="text-xs">
                      To: {new Date(filters.date_to).toLocaleDateString()}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFiltersChange({})}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                </div>
              )}
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
            /* Welcome State */
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">Search the System</h2>
                  <p className="text-muted-foreground mb-6">
                    Find catalogs, libraries, images, and analysis results. Use the search bar above to get started.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h3 className="font-medium mb-2">Search Tips:</h3>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Use specific keywords</li>
                        <li>• Filter by content type</li>
                        <li>• Sort by relevance or date</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Content Types:</h3>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Catalogs</li>
                        <li>• Libraries</li>
                        <li>• Images</li>
                        <li>• Analysis Results</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 