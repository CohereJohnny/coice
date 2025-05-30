'use client';

import React from 'react';
import { JobResult } from '@/lib/services/jobResultService';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Download,
  AlertTriangle
} from 'lucide-react';

export interface JobResultsCardProps {
  results: JobResult[];
  selectedResults: Set<string>;
  onResultClick: (resultId: string) => void;
  onResultSelect: (resultId: string) => void;
  isLoading?: boolean;
}

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
        
        return (
          <div
            key={result.id}
            className={`
              bg-white rounded-lg border transition-all duration-200 cursor-pointer
              ${isSelected 
                ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            {/* Card Header */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result)}
                  <span className={`
                    text-sm font-medium
                    ${result.result?.success ? 'text-green-700' : 'text-red-700'}
                  `}>
                    {getStatusText(result)}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onResultSelect(result.id);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Stage Information */}
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 mb-1">
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

              {/* Metadata */}
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span>Confidence:</span>
                  <span className="font-medium">
                    {formatConfidence(result.result?.confidence)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Execution:</span>
                  <span className="font-medium">
                    {formatExecutionTime(result.result?.executionTime)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Processed:</span>
                  <span className="font-medium">
                    {formatDate(result.executed_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {result.image?.gcs_path ? (
                    <span>Image: {result.image.gcs_path.split('/').pop()}</span>
                  ) : (
                    <span>No image data</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onResultClick(result.id);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    title="View details"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </button>
                </div>
              </div>
            </div>

            {/* Click overlay for card selection */}
            <div
              onClick={() => onResultClick(result.id)}
              className="absolute inset-0 cursor-pointer"
            />
          </div>
        );
      })}
      
      {/* Loading indicator for additional results */}
      {isLoading && results.length > 0 && (
        <div className="col-span-full flex justify-center py-4">
          <div className="text-sm text-gray-500">Loading more results...</div>
        </div>
      )}
    </div>
  );
} 