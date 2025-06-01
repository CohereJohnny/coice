'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchHistory } from '@/components/search/SearchHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Star } from 'lucide-react';
import { useAuth } from '@/lib/stores/auth';
import { useFeatureFlag } from '@/lib/featureFlags';
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
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'alphabetical' | 'file_size' | 'similarity'>('relevance');
  const [hasSearched, setHasSearched] = useState(false);
  const [similarTo, setSimilarTo] = useState<string | null>(null);
  const [referenceInfo, setReferenceInfo] = useState<{ type: string; title: string } | null>(null);
  const [crossContentEnabled, setCrossContentEnabled] = useState(true);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  const advancedSearchEnabled = useFeatureFlag('advancedSearch');

  // Debounce the search query - only search after user stops typing for 500ms
  const debouncedSearchQuery = useDebounce(query, 500);

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

  // Initialize from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    const urlPage = searchParams.get('page');
    const urlSort = searchParams.get('sort');
    const urlTypes = searchParams.get('types');
    const urlSimilarTo = searchParams.get('similar_to');
    
    if (urlQuery) {
      setQuery(urlQuery);
      setSearchQuery(urlQuery);
      setHasSearched(true);
    }
    if (urlPage) {
      setPage(parseInt(urlPage));
    }
    if (urlSort && ['relevance', 'date', 'alphabetical', 'file_size', 'similarity'].includes(urlSort)) {
      setSortBy(urlSort as any);
    }
    if (urlSimilarTo) {
      setSimilarTo(urlSimilarTo);
      setHasSearched(true);
      setQuery(`Similar to image ${urlSimilarTo}`);
      setSearchQuery('similarity_search');
    }
    if (advancedSearchEnabled && urlTypes) {
      setFilters(prev => ({
        ...prev,
        content_types: urlTypes.split(',')
      }));
    }
  }, [searchParams, advancedSearchEnabled]);

  // Perform search with abort controller for cancellation
  const performSearch = useCallback(async (searchQuery: string, searchPage: number = 1) => {
    // Handle similarity search
    if (similarTo) {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setLoading(true);
      try {
        const params = new URLSearchParams({
          similar_to: similarTo,
          page: searchPage.toString(),
          per_page: '20',
          sort: 'similarity'
        });

        // Add content types based on cross-content search setting
        if (!crossContentEnabled) {
          // Only search within the same content type
          const contentType = similarTo.includes('_') ? similarTo.split('_')[0] : 'image';
          params.set('types', contentType);
        }
        // If crossContentEnabled is true, don't set types filter to search all

        const response = await fetch(`/api/search?${params}`, {
          signal: abortControllerRef.current.signal
        });
        
        if (!response.ok) {
          throw new Error('Similarity search failed');
        }

        const data: any = await response.json();
        setResults(data.results);
        setTotalCount(data.total_count);
        setExecutionTime(data.execution_time_ms);
        setHasSearched(true);
        
        // Set reference info if available
        if (data.reference_type && data.reference_title) {
          setReferenceInfo({
            type: data.reference_type,
            title: data.reference_title
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Similarity search error:', error);
        setResults([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Regular text search
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
      if (advancedSearchEnabled && filters.content_types?.length) {
        params.set('types', filters.content_types.join(','));
      }
      if (advancedSearchEnabled && filters.date_from) {
        params.set('date_from', filters.date_from);
      }
      if (advancedSearchEnabled && filters.date_to) {
        params.set('date_to', filters.date_to);
      }
      if (advancedSearchEnabled && filters.library_id) {
        params.set('library_id', filters.library_id.toString());
      }
      if (advancedSearchEnabled && filters.catalog_id) {
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
      if (advancedSearchEnabled && filters.content_types?.length) {
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
  }, [filters, sortBy, similarTo, advancedSearchEnabled, crossContentEnabled, saveToSearchHistory]);

  // Effect for debounced search (skip for similarity search)
  useEffect(() => {
    if (similarTo) {
      performSearch('', 1);
      return;
    }
    
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
  }, [debouncedSearchQuery, performSearch, searchQuery, similarTo]);

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
    // Only apply filters if advanced search is enabled
    if (!advancedSearchEnabled) return;
    
    setFilters(newFilters);
    if (searchQuery) {
      setPage(1);
      performSearch(searchQuery, 1);
    }
  };

  const handleSortChange = (newSort: 'relevance' | 'date' | 'alphabetical' | 'file_size' | 'similarity') => {
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

  const handleHistoryItemClick = (historyQuery: string, historyFilters: SearchFiltersType = {}) => {
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
          {/* Clean header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="max-w-2xl mx-auto">
                {similarTo ? (
                  <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">
                      {crossContentEnabled ? 'Cross-Content' : ''} Similar Items
                    </h1>
                    <p className="text-muted-foreground">
                      Finding items similar to {referenceInfo ? (
                        <span className="font-medium">
                          {referenceInfo.type.replace('_', ' ')} &quot;{referenceInfo.title}&quot;
                        </span>
                      ) : (
                        <span>item #{similarTo}</span>
                      )}
                    </p>
                    
                    <div className="flex items-center justify-center gap-4">
                      <Badge variant={crossContentEnabled ? "default" : "outline"}>
                        {crossContentEnabled ? 'Searching all content types' : 'Same content type only'}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCrossContentEnabled(!crossContentEnabled);
                          if (similarTo) {
                            performSearch('', 1);
                          }
                        }}
                      >
                        {crossContentEnabled ? 'Disable' : 'Enable'} cross-content search
                      </Button>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSimilarTo(null);
                        setReferenceInfo(null);
                        setQuery('');
                        setSearchQuery('');
                        setHasSearched(false);
                        setResults([]);
                        setTotalCount(0);
                        router.push('/search');
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <SearchInput
                      value={query}
                      onChange={handleQueryChange}
                      onSearch={handleSearch}
                      loading={loading}
                      placeholder="Find anything..."
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className={advancedSearchEnabled ? "flex gap-6" : ""}>
            {/* Filters Sidebar */}
            {advancedSearchEnabled && (
              <div className="w-80 shrink-0 space-y-6">
                <SearchFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  className="sticky top-6"
                />
                
                <SearchHistory
                  onSearchSelect={handleHistoryItemClick}
                  maxItems={10}
                />
              </div>
            )}

            {/* Results Area */}
            <div className={advancedSearchEnabled ? "flex-1 min-w-0" : "w-full"}>
              {/* Simple stats and controls */}
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
                        {totalCount.toLocaleString()} results
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Save Search Button */}
                    {searchQuery && !loading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const searchEntry = {
                            query: searchQuery,
                            timestamp: new Date().toISOString(),
                            filters: filters
                          };
                          const history = JSON.parse(localStorage.getItem('coice_search_history') || '[]');
                          const newHistory = [searchEntry, ...history.filter((item: any) => item.query !== searchQuery)].slice(0, 10);
                          localStorage.setItem('coice_search_history', JSON.stringify(newHistory));
                          
                          const event = new CustomEvent('saveCurrentSearch', { detail: searchEntry });
                          window.dispatchEvent(event);
                        }}
                        className="text-xs"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    )}
                    
                    <select
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value as any)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="relevance">Best match</option>
                      <option value="similarity">Similarity score</option>
                      <option value="date">Most recent</option>
                      <option value="alphabetical">A-Z</option>
                      <option value="file_size">Largest files</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Results */}
              {!hasSearched && !loading && !query && !similarTo && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center max-w-2xl mx-auto">
                      <h3 className="text-lg font-semibold mb-4">Get started with search</h3>
                      
                      {/* Popular searches */}
                      <div className="mb-8">
                        <p className="text-sm text-muted-foreground mb-3">Try searching for:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {[
                            'dog', 
                            'analysis results', 
                            'recent uploads',
                            'landscape',
                            'portrait',
                            'architecture'
                          ].map((suggestion) => (
                            <Badge
                              key={suggestion}
                              variant="outline"
                              className="cursor-pointer hover:bg-muted transition-colors"
                              onClick={() => {
                                setQuery(suggestion);
                                setSearchQuery(suggestion);
                                handleSearch(suggestion);
                              }}
                            >
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {/* Recent searches */}
                      {getSearchHistory().length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-3">Your recent searches:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {getSearchHistory().slice(0, 5).map((item, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80 transition-colors"
                                onClick={() => handleHistoryItemClick(item.query, item.filters)}
                              >
                                {item.query}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Search tips */}
                      <div className="mt-8 text-xs text-muted-foreground">
                        <p>💡 Tip: Use our semantic search to find images by describing what you&apos;re looking for</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <SearchResults
                results={results}
                loading={loading}
                query={searchQuery}
                page={page}
                totalCount={totalCount}
                perPage={20}
                onPageChange={handlePageChange}
              />
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
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
} 