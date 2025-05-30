'use client';

import React, { useState, useMemo } from 'react';
import { JobResultsControls } from './JobResultsControls';
import { JobResultsCard } from './JobResultsCard';
import { JobResultsFilters } from './JobResultsFilters';
import { JobResultsComparison } from './JobResultsComparison';
import { useJobResultsState } from './hooks/useJobResultsState';
import { useJobResultsData } from './hooks/useJobResultsData';
import { JobResult, JobResultsExportOptions } from '@/lib/services/jobResultService';
import { AlertCircle, ArrowLeftRight, X } from 'lucide-react';

export interface JobResultsViewProps {
  jobId?: string;
  className?: string;
  onResultSelect?: (result: JobResult) => void;
}

export function JobResultsView({
  jobId,
  className = '',
  onResultSelect
}: JobResultsViewProps) {
  // State management
  const {
    viewMode,
    selectedResults,
    showDetailModal,
    selectedResult,
    searchQuery,
    sortBy,
    sortOrder,
    setViewMode,
    toggleResultSelection,
    selectResult,
    closeDetailModal,
    clearSelection,
    selectAll,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    hasSelection,
    selectionCount,
    selectedResultIds
  } = useJobResultsState({});

  // Data management
  const {
    results,
    pagination,
    aggregations,
    stats,
    isLoading,
    error,
    filters,
    fetchResults,
    loadMore,
    refreshResults,
    updateFilters,
    clearFilters,
    exportResults,
    hasResults,
    isEmpty,
    canLoadMore
  } = useJobResultsData({
    jobId,
    searchQuery,
    sortBy,
    sortOrder
  });

  // Comparison state
  const [showComparison, setShowComparison] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Get selected results for comparison
  const selectedResultsData = useMemo(() => {
    return results.filter(result => selectedResults.has(result.id));
  }, [results, selectedResults]);

  // Handle export
  const handleExport = async () => {
    try {
      const exportOptions: JobResultsExportOptions = {
        format: 'json',
        includeMetadata: true,
        includeImageData: true,
        filters: {
          ...filters
          // Note: Export will be limited by current filters, not selection
        }
      };
      
      await exportResults(exportOptions);
    } catch (err) {
      console.error('Export failed:', err);
      // You could show a toast notification here
    }
  };

  // Handle comparison
  const handleStartComparison = () => {
    if (selectionCount >= 2) {
      setShowComparison(true);
    }
  };

  const handleCloseComparison = () => {
    setShowComparison(false);
  };

  const handleRemoveFromComparison = (resultId: string) => {
    toggleResultSelection(resultId);
    // Close comparison if less than 2 results remain
    if (selectionCount <= 2) {
      setShowComparison(false);
    }
  };

  // Handle result selection for external callback
  const handleResultSelect = (result: JobResult) => {
    selectResult(result);
    onResultSelect?.(result);
  };

  // Handle result click from card (receives ID, needs to find result)
  const handleResultClick = (resultId: string) => {
    const result = results.find(r => r.id === resultId);
    if (result) {
      handleResultSelect(result);
    }
  };

  // Show comparison view if active
  if (showComparison && selectedResultsData.length >= 2) {
    return (
      <div className={`space-y-4 ${className}`}>
        <JobResultsComparison
          results={selectedResultsData}
          onRemoveResult={handleRemoveFromComparison}
          onExportComparison={handleExport}
          onClose={handleCloseComparison}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Filters Sidebar */}
        <div className={`lg:w-80 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <JobResultsFilters
            filters={filters}
            onFiltersChange={updateFilters}
            aggregations={aggregations}
            isLoading={isLoading}
          />
          
          {/* Toggle filters button for mobile */}
          <button
            onClick={() => setShowFilters(false)}
            className="lg:hidden mt-2 w-full px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Hide Filters
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Controls */}
          <JobResultsControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedCount={selectionCount}
            totalCount={pagination.total}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={setSortBy}
            onSortOrderChange={setSortOrder}
            onExport={handleExport}
            onClearSelection={clearSelection}
            onRefresh={refreshResults}
            aggregations={aggregations}
          />

          {/* Selection Actions */}
          {hasSelection && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blue-700">
                    {selectionCount} result{selectionCount !== 1 ? 's' : ''} selected
                  </span>
                  
                  {selectionCount >= 2 && (
                    <button
                      onClick={handleStartComparison}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Compare Results
                    </button>
                  )}
                </div>
                
                <button
                  onClick={clearSelection}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Mobile filters toggle */}
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden mb-4 w-full px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Show Filters
          </button>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error loading results</h3>
                  <p className="text-sm text-red-600 mt-1">{error.message}</p>
                </div>
              </div>
              
              <button
                onClick={refreshResults}
                className="mt-3 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {isEmpty && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                {/* You could add an icon here */}
                <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No results found
              </h3>
              
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? 'Try adjusting your search query or filters'
                  : 'No job results match your current filters'
                }
              </p>
              
              <div className="flex justify-center gap-2">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
                
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Results Display */}
          {hasResults && (
            <>
              {viewMode === 'card' && (
                <JobResultsCard
                  results={results}
                  selectedResults={selectedResults}
                  onResultClick={handleResultClick}
                  onResultSelect={toggleResultSelection}
                  isLoading={isLoading}
                />
              )}

              {viewMode === 'list' && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="w-8 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={results.length > 0 && selectedResults.size === results.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  selectAll(results.map(r => r.id));
                                } else {
                                  clearSelection();
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stage
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Confidence
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Execution Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {results.map((result) => (
                          <tr key={result.id} className={selectedResults.has(result.id) ? 'bg-blue-50' : ''}>
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedResults.has(result.id)}
                                onChange={() => toggleResultSelection(result.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.stage?.prompt?.name || `Stage ${result.stage?.stage_order}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                result.result?.success 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {result.result?.success ? 'Success' : 'Failed'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.result?.confidence 
                                ? `${Math.round(result.result.confidence * 100)}%`
                                : 'N/A'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.result?.executionTime
                                ? result.result.executionTime > 1000 
                                  ? `${(result.result.executionTime / 1000).toFixed(1)}s`
                                  : `${result.result.executionTime}ms`
                                : 'N/A'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(result.executed_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <button
                                onClick={() => handleResultClick(result.id)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewMode === 'carousel' && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="text-center text-gray-600">
                    <p>Carousel view is coming soon...</p>
                    <p className="text-sm mt-2">For now, please use Card or List view.</p>
                  </div>
                </div>
              )}

              {/* Load More */}
              {canLoadMore && (
                <div className="text-center py-4">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="px-6 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Load More Results'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Statistics Summary */}
          {stats && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Summary Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Results:</span>
                  <span className="ml-1 font-medium">{stats.totalResults}</span>
                </div>
                <div>
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="ml-1 font-medium">{stats.successRate}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Confidence:</span>
                  <span className="ml-1 font-medium">
                    {stats.averageConfidence ? `${Math.round(stats.averageConfidence * 100)}%` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Time:</span>
                  <span className="ml-1 font-medium">
                    {stats.averageExecutionTime 
                      ? stats.averageExecutionTime > 1000 
                        ? `${(stats.averageExecutionTime / 1000).toFixed(1)}s`
                        : `${Math.round(stats.averageExecutionTime)}ms`
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result Detail Modal - Implementation would go here */}
      {showDetailModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Result Details</h2>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Stage Information</h3>
                  <p className="text-sm text-gray-600">
                    {selectedResult.stage?.prompt?.name || `Stage ${selectedResult.stage?.stage_order}`}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">Response</h3>
                  <div className="bg-gray-50 rounded p-3 text-sm">
                    {selectedResult.result?.response || selectedResult.result?.error || 'No response available'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Confidence</h3>
                    <p className="text-sm text-gray-600">
                      {selectedResult.result?.confidence 
                        ? `${Math.round(selectedResult.result.confidence * 100)}%`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">Execution Time</h3>
                    <p className="text-sm text-gray-600">
                      {selectedResult.result?.executionTime
                        ? selectedResult.result.executionTime > 1000 
                          ? `${(selectedResult.result.executionTime / 1000).toFixed(1)}s`
                          : `${selectedResult.result.executionTime}ms`
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 