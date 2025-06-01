'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  FileImage, 
  Folder, 
  Database, 
  BarChart3, 
  ExternalLink, 
  Calendar,
  Star,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { SearchResult } from '@/app/api/search/route';

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  page: number;
  totalCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function SearchResults({
  results,
  loading,
  query,
  page,
  totalCount,
  perPage,
  onPageChange,
  className
}: SearchResultsProps) {
  const totalPages = Math.ceil(totalCount / perPage);
  const startIndex = (page - 1) * perPage + 1;
  const endIndex = Math.min(page * perPage, totalCount);

  // Highlight search terms in text
  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const terms = searchQuery.trim().split(/\s+/);
    let highlightedText = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
      );
    });
    
    return highlightedText;
  };

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

  // Get navigation URL for result
  const getResultUrl = (result: SearchResult) => {
    switch (result.type) {
      case 'catalog':
        return `/catalogs/${result.id}`;
      case 'library':
        return `/libraries/${result.id}`;
      case 'image':
        return `/image/${result.id}`;
      case 'job_result':
        return `/analysis/jobs/${result.context?.job_id}`;
      default:
        return '#';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format relevance score for display
  const formatRelevanceScore = (result: SearchResult) => {
    const similarity = result.similarity_score;
    const relevance = result.relevance_score;
    
    // Prefer similarity score (semantic search) over relevance score (text search)
    const score = similarity || relevance;
    if (!score) return null;
    
    const percentage = Math.round(score * 100);
    const label = similarity ? 'Similarity' : 'Relevance';
    
    // Determine quality level
    let quality: 'high' | 'medium' | 'low';
    let badgeVariant: 'default' | 'secondary' | 'outline';
    
    if (score >= 0.7) {
      quality = 'high';
      badgeVariant = 'default';
    } else if (score >= 0.4) {
      quality = 'medium';
      badgeVariant = 'secondary';
    } else {
      quality = 'low';
      badgeVariant = 'outline';
    }
    
    return {
      score,
      percentage,
      label,
      quality,
      badgeVariant
    };
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn("", className)}>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              {/* Simple visual */}
              <div className="relative mb-4">
                <Search className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">No results</h3>
              <p className="text-muted-foreground mb-6">
                Nothing found for <span className="font-medium">&quot;{query}&quot;</span>
              </p>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted transition-colors">
                  images
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted transition-colors">
                  analysis
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted transition-colors">
                  catalogs
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted transition-colors">
                  libraries
                </Badge>
              </div>

              {/* Simple actions */}
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/search'}
                >
                  Try again
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/libraries'}
                >
                  Browse
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Results List */}
      <div className="space-y-3">
        {results.map((result, index) => {
          const Icon = getTypeIcon(result.type);
          const resultUrl = getResultUrl(result);
          
          return (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Type Icon or Thumbnail */}
                  <div className="flex-shrink-0">
                    {result.type === 'image' && result.thumbnail_url ? (
                      <div className="w-12 h-12 rounded-lg border overflow-hidden bg-muted">
                        <img
                          src={result.thumbnail_url}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-full h-full flex items-center justify-center">
                          <Icon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(result.type)}
                          </Badge>
                          {/* Cross-content match indicator */}
                          {result.description && result.description.includes(' similar to ') && (
                            <Badge variant="default" className="text-xs bg-purple-600 hover:bg-purple-700">
                              Cross-content match
                            </Badge>
                          )}
                          {result.relevance_score && result.relevance_score > 0.8 && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              High Match
                            </Badge>
                          )}
                          {/* Relevance Score Badge */}
                          {(() => {
                            const scoreInfo = formatRelevanceScore(result);
                            if (!scoreInfo) return null;
                            
                            return (
                              <Badge 
                                variant={scoreInfo.badgeVariant as any} 
                                className="text-xs flex items-center gap-1"
                                title={`${scoreInfo.label}: ${scoreInfo.score.toFixed(3)}`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  scoreInfo.quality === 'high' ? 'bg-green-500' : 
                                  scoreInfo.quality === 'medium' ? 'bg-yellow-500' : 
                                  'bg-gray-400'
                                }`} />
                                {scoreInfo.percentage}%
                              </Badge>
                            );
                          })()}
                        </div>
                        
                        <h3 className="font-semibold text-lg leading-tight">
                          <Link 
                            href={resultUrl}
                            className="hover:text-primary transition-colors"
                          >
                            <span 
                              className="truncate block max-w-full"
                              title={result.title}
                              dangerouslySetInnerHTML={{
                                __html: highlightText(result.title, query)
                              }}
                            />
                          </Link>
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link href={resultUrl}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            // Navigate to similarity search
                            const referenceId = result.type === 'image' ? result.id : `${result.type}_${result.id}`;
                            window.location.href = `/search?similar_to=${referenceId}`;
                          }}
                          title="Find similar items"
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Similar
                        </Button>
                      </div>
                    </div>
                    
                    {/* Description */}
                    {result.description && (
                      <p className="text-muted-foreground mb-3 line-clamp-2 break-words">
                        <span 
                          dangerouslySetInnerHTML={{
                            __html: highlightText(result.description, query)
                          }}
                        />
                      </p>
                    )}
                    
                    {/* Context and Metadata */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(result.created_at).toLocaleDateString()}
                      </div>
                      
                      {result.context?.catalog_name && (
                        <div className="truncate">
                          Catalog: <span className="font-medium">{result.context.catalog_name}</span>
                        </div>
                      )}
                      
                      {result.context?.library_name && (
                        <div className="truncate">
                          Library: <span className="font-medium">{result.context.library_name}</span>
                        </div>
                      )}
                      
                      {result.file_size && (
                        <div>
                          Size: {formatFileSize(result.file_size)}
                        </div>
                      )}
                      
                      {result.file_type && (
                        <div>
                          Type: {result.file_type.toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* Context Path */}
                    {result.context && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {result.context.catalog_name && (
                          <>
                            <span className="truncate max-w-32" title={result.context.catalog_name}>
                              {result.context.catalog_name}
                            </span>
                            {result.context.library_name && <span className="mx-1">/</span>}
                          </>
                        )}
                        {result.context.library_name && (
                          <span className="truncate max-w-32" title={result.context.library_name}>
                            {result.context.library_name}
                          </span>
                        )}
                        {result.context.pipeline_name && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="truncate max-w-32" title={result.context.pipeline_name}>
                              Pipeline: {result.context.pipeline_name}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Special metadata for job results */}
                    {result.type === 'job_result' && result.metadata && (
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        {result.metadata.confidence && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Confidence:</span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(result.metadata.confidence * 100)}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex.toLocaleString()}-{endIndex.toLocaleString()} of {totalCount.toLocaleString()} results
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 