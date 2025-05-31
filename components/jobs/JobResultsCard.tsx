'use client';

import React, { useState, useEffect } from 'react';
import { JobResult } from '@/lib/services/jobResultService';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Download,
  AlertTriangle,
  Loader2,
  Search
} from 'lucide-react';
import { imageService } from '@/lib/services/imageService';

export interface JobResultsCardProps {
  results: JobResult[];
  selectedResults: Set<string>;
  onResultClick: (resultId: string) => void;
  onResultSelect: (resultId: string) => void;
  isLoading?: boolean;
}

// Image thumbnail component similar to the one in Job Details page
const ImageThumbnail = React.memo(function ImageThumbnail({ 
  imageId, 
  className,
  filename
}: { 
  imageId: string; 
  className?: string;
  filename?: string;
}) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      try {
        const url = await imageService.getSignedImageUrl(imageId);
        if (isMounted) {
          setImageSrc(url);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load image:', err);
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [imageId]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center">
          <XCircle className="h-6 w-6 text-gray-400 mx-auto mb-1" />
          <div className="text-xs text-gray-500">Failed to load</div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={filename || `Image ${imageId.slice(0, 8)}`}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
});

export function JobResultsCard({
  results,
  selectedResults,
  onResultClick,
  onResultSelect,
  isLoading = false
}: JobResultsCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatConfidence = (confidence?: number) => {
    if (confidence === undefined || confidence === null) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  };

  const formatExecutionTime = (time?: number) => {
    if (!time) return 'N/A';
    return time > 1000 ? `${(time / 1000).toFixed(1)}s` : `${time}ms`;
  };

  const getStatusIcon = (result: JobResult) => {
    if (result.result?.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (result.result?.error) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (result: JobResult) => {
    if (result.result?.success) return 'Success';
    if (result.result?.error) return 'Failed';
    return 'Unknown';
  };

  const truncateText = (text: string, maxLength = 150) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading && results.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-20 bg-gray-200 rounded mb-3"></div>
            <div className="h-3 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {results.map((result) => {
        const isSelected = selectedResults.has(result.id);
        const stageName = result.stage?.prompt?.name || `Stage ${result.stage?.stage_order}`;
        const promptType = result.stage?.prompt?.type || 'unknown';
        const filename = result.image?.gcs_path ? result.image.gcs_path.split('/').pop() : 'Unknown image';
        
        return (
          <div
            key={result.id}
            className={`
              bg-white rounded-lg border transition-all duration-200 overflow-hidden
              ${isSelected 
                ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            {/* Image Thumbnail Section */}
            <div className="relative">
              <div className="aspect-video w-full bg-gray-100">
                {result.image_id ? (
                  <ImageThumbnail
                    imageId={result.image_id}
                    filename={filename}
                    className="w-full h-full rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <XCircle className="h-8 w-8 mx-auto mb-2" />
                      <div className="text-xs">No image</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Selection Checkbox Overlay */}
              <div className="absolute top-2 right-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onResultSelect(result.id);
                  }}
                  className="w-4 h-4 rounded border-2 border-white bg-white/80 backdrop-blur-sm text-blue-600 focus:ring-blue-500 shadow-sm"
                />
              </div>
              
              {/* Status Badge Overlay */}
              <div className="absolute bottom-2 left-2">
                <div className={`
                  flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm
                  ${result.result?.success 
                    ? 'bg-green-100/90 text-green-700 border border-green-200' 
                    : 'bg-red-100/90 text-red-700 border border-red-200'
                  }
                `}>
                  {getStatusIcon(result)}
                  {getStatusText(result)}
                </div>
              </div>
            </div>

            {/* Card Content - Clickable Area */}
            <div 
              className="p-4 cursor-pointer"
              onClick={() => onResultClick(result.id)}
            >
              {/* Stage Information */}
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 mb-1 truncate" title={stageName}>
                  {stageName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-gray-100 rounded-full">
                    {promptType}
                  </span>
                  <span>Stage {result.stage?.stage_order}</span>
                </div>
              </div>

              {/* Result Content */}
              <div className="mb-4">
                {result.result?.response ? (
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {truncateText(result.result.response)}
                  </div>
                ) : result.result?.error ? (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {truncateText(result.result.error)}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">
                    No response data
                  </div>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                <div>
                  <span className="block font-medium">Confidence</span>
                  <span className="text-gray-700">
                    {formatConfidence(result.result?.confidence)}
                  </span>
                </div>
                
                <div>
                  <span className="block font-medium">Execution</span>
                  <span className="text-gray-700">
                    {formatExecutionTime(result.result?.executionTime)}
                  </span>
                </div>
              </div>
              
              {/* Date and Image Info */}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Processed:</span>
                  <span className="font-medium">
                    {formatDate(result.executed_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Image:</span>
                  <span className="font-medium truncate ml-2 max-w-32" title={filename}>
                    {filename}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer with Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <span>ID: {result.id.slice(0, 8)}...</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/search?similar_to=job_result_${result.id}&types=job_result`;
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors rounded hover:bg-gray-50"
                    title="Find similar results"
                  >
                    <Search className="h-3 w-3" />
                    Find Similar
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onResultClick(result.id);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors rounded hover:bg-blue-50"
                    title="View details"
                  >
                    <Eye className="h-3 w-3" />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Loading indicator for additional results */}
      {isLoading && results.length > 0 && (
        <div className="col-span-full flex justify-center py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more results...
          </div>
        </div>
      )}
    </div>
  );
} 