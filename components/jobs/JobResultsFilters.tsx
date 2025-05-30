'use client';

import React, { useState, useCallback } from 'react';
import { JobResultFilters } from '@/lib/services/jobResultService';
import { 
  Filter, 
  X, 
  Calendar, 
  Check,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Star,
  Clock
} from 'lucide-react';

export interface JobResultsFiltersProps {
  filters: JobResultFilters;
  onFiltersChange: (filters: Partial<JobResultFilters>) => void;
  aggregations?: any;
  isLoading?: boolean;
}

export function JobResultsFilters({
  filters,
  onFiltersChange,
  aggregations,
  isLoading = false
}: JobResultsFiltersProps) {
  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    status: true,
    stages: true,
    dates: false,
    confidence: false,
    execution: false,
    tags: false
  });

  // Saved filters state
  const [savedFilters, setSavedFilters] = useState<Array<{
    id: string;
    name: string;
    filters: JobResultFilters;
    isDefault?: boolean;
  }>>([
    {
      id: 'successful',
      name: 'Successful Results',
      filters: { success: true },
      isDefault: true
    },
    {
      id: 'failed',
      name: 'Failed Results', 
      filters: { success: false },
      isDefault: true
    },
    {
      id: 'high-confidence',
      name: 'High Confidence',
      filters: { confidenceMin: 0.8 }
    }
  ]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      success: undefined,
      stageId: undefined,
      stageOrder: undefined,
      confidenceMin: undefined,
      confidenceMax: undefined,
      executionTimeMin: undefined,
      executionTimeMax: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      searchTerm: undefined
    });
  }, [onFiltersChange]);

  const applySavedFilter = useCallback((savedFilter: typeof savedFilters[0]) => {
    onFiltersChange(savedFilter.filters);
  }, [onFiltersChange]);

  const saveCurrentFilters = useCallback(() => {
    const name = prompt('Enter a name for this filter preset:');
    if (name && name.trim()) {
      const newFilter = {
        id: Date.now().toString(),
        name: name.trim(),
        filters: { ...filters }
      };
      setSavedFilters(prev => [...prev, newFilter]);
    }
  }, [filters]);

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  const getStageOptions = () => {
    if (!aggregations?.stageBreakdown) return [];
    return aggregations.stageBreakdown.map((stage: any) => ({
      value: stage.stageOrder,
      label: `Stage ${stage.stageOrder} (${stage.count})`,
      count: stage.count
    }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Saved Filters */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Quick Filters</span>
          <button
            onClick={saveCurrentFilters}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            disabled={!hasActiveFilters}
          >
            Save Current
          </button>
        </div>
        
        <div className="space-y-1">
          {savedFilters.map((savedFilter) => {
            // Calculate count for this filter
            let count = 0;
            if (savedFilter.filters.success === true) {
              count = aggregations?.totalSuccessful || 0;
            } else if (savedFilter.filters.success === false) {
              count = aggregations?.totalFailed || 0;
            } else if (savedFilter.filters.confidenceMin === 0.8) {
              // High confidence filter - estimate from aggregations if available
              count = aggregations?.totalSuccessful || 0; // Rough estimate
            }
            
            return (
              <button
                key={savedFilter.id}
                onClick={() => applySavedFilter(savedFilter)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {savedFilter.name}
                  {count > 0 && (
                    <span className="text-xs text-gray-500">({count})</span>
                  )}
                </span>
                {savedFilter.isDefault && (
                  <Star className="h-3 w-3 text-yellow-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('status')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Status
          {expandedSections.status ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.status && (
          <div className="mt-2 space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                checked={filters.success === undefined}
                onChange={() => onFiltersChange({ success: undefined })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">All Results</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                checked={filters.success === true}
                onChange={() => onFiltersChange({ success: true })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                Successful
                {aggregations?.totalSuccessful && (
                  <span className="text-xs text-gray-500">({aggregations.totalSuccessful})</span>
                )}
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                checked={filters.success === false}
                onChange={() => onFiltersChange({ success: false })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 flex items-center gap-1">
                <X className="h-3 w-3 text-red-500" />
                Failed
                {aggregations?.totalFailed && (
                  <span className="text-xs text-gray-500">({aggregations.totalFailed})</span>
                )}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Stages Filter */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('stages')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Stages
          {expandedSections.stages ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.stages && (
          <div className="mt-2">
            <select
              value={filters.stageOrder || ''}
              onChange={(e) => onFiltersChange({ 
                stageOrder: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Stages</option>
              {getStageOptions().map((option: { value: number; label: string; count: number }) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('dates')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Date Range
          </div>
          {expandedSections.dates ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.dates && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From:</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => onFiltersChange({ dateFrom: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">To:</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => onFiltersChange({ dateTo: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Confidence Filter */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('confidence')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Confidence Range
          {expandedSections.confidence ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.confidence && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Min Confidence: {filters.confidenceMin ? `${Math.round(filters.confidenceMin * 100)}%` : 'Any'}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.confidenceMin || 0}
                onChange={(e) => onFiltersChange({ 
                  confidenceMin: parseFloat(e.target.value) || undefined 
                })}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Max Confidence: {filters.confidenceMax ? `${Math.round(filters.confidenceMax * 100)}%` : 'Any'}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.confidenceMax || 1}
                onChange={(e) => onFiltersChange({ 
                  confidenceMax: parseFloat(e.target.value) || undefined 
                })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Execution Time Filter */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('execution')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Execution Time
          </div>
          {expandedSections.execution ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.execution && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Min Time (ms):</label>
              <input
                type="number"
                min="0"
                step="100"
                value={filters.executionTimeMin || ''}
                onChange={(e) => onFiltersChange({ 
                  executionTimeMin: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max Time (ms):</label>
              <input
                type="number"
                min="0"
                step="100"
                value={filters.executionTimeMax || ''}
                onChange={(e) => onFiltersChange({ 
                  executionTimeMax: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any"
              />
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-600 mb-2">Active Filters:</div>
          <div className="space-y-1">
            {filters.success !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span>Status: {filters.success ? 'Success' : 'Failed'}</span>
                <button
                  onClick={() => onFiltersChange({ success: undefined })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {filters.stageOrder && (
              <div className="flex items-center justify-between text-xs">
                <span>Stage: {filters.stageOrder}</span>
                <button
                  onClick={() => onFiltersChange({ stageOrder: undefined })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {(filters.confidenceMin || filters.confidenceMax) && (
              <div className="flex items-center justify-between text-xs">
                <span>
                  Confidence: {filters.confidenceMin ? `${Math.round(filters.confidenceMin * 100)}%` : '0%'} - {filters.confidenceMax ? `${Math.round(filters.confidenceMax * 100)}%` : '100%'}
                </span>
                <button
                  onClick={() => onFiltersChange({ confidenceMin: undefined, confidenceMax: undefined })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500">Applying filters...</div>
        </div>
      )}
    </div>
  );
} 