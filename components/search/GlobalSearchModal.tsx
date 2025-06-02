'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from './SearchInput';
import { SearchHistory } from './SearchHistory';
import { Search, FileImage, Folder, Database, BarChart3, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/app/api/search/route';

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();

  // Handle search execution
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        console.error('Search failed:', response.statusText);
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle result selection - navigate and close modal
  const handleResultSelect = useCallback((result: SearchResult) => {
    let url = '';
    
    switch (result.type) {
      case 'catalog':
        url = `/catalogs/${result.id}`;
        break;
      case 'library':
        url = `/libraries/${result.id}`;
        break;
      case 'image':
        url = `/image/${result.id}`;
        break;
      case 'job_result':
        url = `/analysis/jobs/${result.context?.job_id || result.id}`;
        break;
      default:
        url = '/search';
    }
    
    router.push(url);
    onOpenChange(false);
    setQuery('');
    setResults([]);
    setHasSearched(false);
  }, [router, onOpenChange]);

  // Handle "View all results" - navigate to full search page
  const handleViewAllResults = useCallback(() => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      onOpenChange(false);
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [query, router, onOpenChange]);

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    handleSearch(recentQuery);
  }, [handleSearch]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setLoading(false);
    }
  }, [open]);

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open modal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
      
      // Escape to close modal
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Get icon for content type
  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'catalog':
        return Database;
      case 'library':
        return Folder;
      case 'image':
        return FileImage;
      case 'job_result':
        return BarChart3;
      default:
        return FileImage;
    }
  };

  // Get type label
  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'catalog':
        return 'Catalog';
      case 'library':
        return 'Library';
      case 'image':
        return 'Image';
      case 'job_result':
        return 'Analysis Result';
      default:
        return 'Unknown';
    }
  };

  // Format relevance score for display
  const formatRelevanceScore = (result: SearchResult) => {
    const similarity = result.similarity_score;
    const relevance = result.relevance_score;
    
    // Prefer similarity score (semantic search) over relevance score (text search)
    const score = similarity || relevance;
    if (!score) return null;
    
    const percentage = Math.round(score * 100);
    
    // Determine quality level and color
    let quality: 'high' | 'medium' | 'low';
    let colorClass: string;
    
    if (score >= 0.7) {
      quality = 'high';
      colorClass = 'text-green-600';
    } else if (score >= 0.4) {
      quality = 'medium';
      colorClass = 'text-yellow-600';
    } else {
      quality = 'low';
      colorClass = 'text-gray-500';
    }
    
    return { percentage, quality, colorClass };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Quick Search
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 space-y-4">
          {/* Search Input */}
          <SearchInput
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            loading={loading}
            placeholder="Search across all content..."
            className="w-full"
          />

          {/* Search Results or History */}
          <div className="max-h-96 overflow-y-auto">
            {hasSearched ? (
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-muted rounded animate-pulse" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {results.slice(0, 5).map((result) => {
                        const Icon = getTypeIcon(result.type);
                        const scoreInfo = formatRelevanceScore(result);
                        
                        return (
                          <Card key={result.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => handleResultSelect(result)}>
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                {/* Type Icon or Thumbnail */}
                                <div className="flex-shrink-0">
                                  {result.type === 'image' && result.thumbnail_url ? (
                                    <div className="w-10 h-10 rounded border overflow-hidden bg-muted">
                                      <img
                                        src={result.thumbnail_url}
                                        alt={result.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          target.nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                      <div className="hidden w-full h-full flex items-center justify-center">
                                        <Icon className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                      <Icon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {getTypeLabel(result.type)}
                                    </Badge>
                                    {/* Relevance Score Display */}
                                    {scoreInfo && (
                                      <span className={`text-xs font-medium ${scoreInfo.colorClass}`}>
                                        {scoreInfo.percentage}%
                                      </span>
                                    )}
                                  </div>
                                  
                                  <h3 className="font-medium text-sm leading-tight truncate">
                                    {result.title}
                                  </h3>
                                  
                                  {result.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                      {result.description}
                                    </p>
                                  )}
                                  
                                  {/* Context */}
                                  {result.context && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                      {result.context.catalog_name && (
                                        <span className="truncate max-w-20">
                                          {result.context.catalog_name}
                                        </span>
                                      )}
                                      {result.context.library_name && (
                                        <>
                                          <span>/</span>
                                          <span className="truncate max-w-20">
                                            {result.context.library_name}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-shrink-0">
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    
                    {/* View All Results Button */}
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        onClick={handleViewAllResults}
                        className="w-full flex items-center gap-2"
                      >
                        <Search className="h-4 w-4" />
                        View all results for &quot;{query}&quot;
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <h3 className="font-medium mb-1">No results found</h3>
                    <p className="text-sm">
                      Try adjusting your search terms or{' '}
                      <button
                        onClick={handleViewAllResults}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        view advanced search
                      </button>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Recent Searches
                </div>
                <SearchHistory
                  onSearchSelect={handleRecentSearchSelect}
                  maxItems={5}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 