'use client';

import React from 'react';
import { 
  Grid, 
  List, 
  Image, 
  Search, 
  Download, 
  RefreshCw, 
  X,
  SortAsc,
  SortDesc,
  Filter
} from 'lucide-react';

export interface JobResultsControlsProps {
  viewMode: 'card' | 'list' | 'carousel';
  onViewModeChange: (mode: 'card' | 'list' | 'carousel') => void;
  selectedCount: number;
  totalCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: string) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onExport: () => void;
  onClearSelection: () => void;
  onRefresh: () => void;
  aggregations?: any;
}

export function JobResultsControls({
  viewMode,
  onViewModeChange,
  selectedCount,
  totalCount,
  searchQuery,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  onSortOrderChange,
  onExport,
  onClearSelection,
  onRefresh,
  aggregations
}: JobResultsControlsProps) {
  const viewModeOptions = [
    { value: 'card', icon: Grid, label: 'Card View' },
    { value: 'list', icon: List, label: 'List View' },
    { value: 'carousel', icon: Image, label: 'Carousel View' }
  ] as const;

  const sortOptions = [
    { value: 'executed_at', label: 'Date' },
    { value: 'confidence', label: 'Confidence' },
    { value: 'stage_order', label: 'Stage' },
    { value: 'success', label: 'Status' }
  ];

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        {/* Left side - View controls and stats */}
        <div className="flex items-center gap-4">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {viewModeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => onViewModeChange(value)}
                className={`
                  flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${viewMode === value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                title={label}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-600">
            {selectedCount > 0 ? (
              <span>
                {selectedCount} of {totalCount} selected
              </span>
            ) : (
              <span>
                {totalCount} results
                {aggregations && (
                  <>
                    {' • '}
                    <span className="text-green-600">
                      {aggregations.totalSuccessful} successful
                    </span>
                    {' • '}
                    <span className="text-red-600">
                      {aggregations.totalFailed} failed
                    </span>
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <>
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Selected
              </button>
              <button
                onClick={onClearSelection}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </>
          )}

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search results..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Quick stats bar */}
      {aggregations && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <div>
                Success Rate: <span className="font-medium text-green-600">
                  {Math.round((aggregations.totalSuccessful / (aggregations.totalSuccessful + aggregations.totalFailed)) * 100)}%
                </span>
              </div>
              <div>
                Avg Confidence: <span className="font-medium">
                  {(aggregations.averageConfidence * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                Avg Execution: <span className="font-medium">
                  {aggregations.averageExecutionTime?.toFixed(0)}ms
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {aggregations.stageBreakdown?.slice(0, 3).map((stage: any) => (
                <div key={stage.stageOrder} className="text-xs">
                  Stage {stage.stageOrder}: <span className="font-medium">{stage.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 