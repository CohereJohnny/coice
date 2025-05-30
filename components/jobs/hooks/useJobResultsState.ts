import { useState, useCallback } from 'react';
import { JobResult } from '@/lib/services/jobResultService';

export interface UseJobResultsStateProps {
  initialViewMode?: 'card' | 'list' | 'carousel';
  onResultSelect?: (resultId: string) => void;
}

export interface JobResultsState {
  viewMode: 'card' | 'list' | 'carousel';
  selectedResults: Set<string>;
  showDetailModal: boolean;
  selectedResult: JobResult | null;
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function useJobResultsState({
  initialViewMode = 'card',
  onResultSelect
}: UseJobResultsStateProps) {
  // Core UI state
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'carousel'>(initialViewMode);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<JobResult | null>(null);
  
  // Search and sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('executed_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection management
  const toggleResultSelection = useCallback((resultId: string) => {
    setSelectedResults(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(resultId)) {
        newSelection.delete(resultId);
      } else {
        newSelection.add(resultId);
      }
      return newSelection;
    });
    
    onResultSelect?.(resultId);
  }, [onResultSelect]);

  const selectResult = useCallback((result: JobResult) => {
    setSelectedResult(result);
    setShowDetailModal(true);
  }, []);

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedResult(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedResults(new Set());
  }, []);

  const selectAll = useCallback((resultIds: string[]) => {
    setSelectedResults(new Set(resultIds));
  }, []);

  const isSelected = useCallback((resultId: string) => {
    return selectedResults.has(resultId);
  }, [selectedResults]);

  // Search and sort helpers
  const resetSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const resetSort = useCallback(() => {
    setSortBy('executed_at');
    setSortOrder('desc');
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  // View mode helpers
  const isCardView = viewMode === 'card';
  const isListView = viewMode === 'list';
  const isCarouselView = viewMode === 'carousel';

  // Selection helpers
  const hasSelection = selectedResults.size > 0;
  const selectionCount = selectedResults.size;
  const selectedResultIds = Array.from(selectedResults);

  return {
    // State values
    viewMode,
    selectedResults,
    showDetailModal,
    selectedResult,
    searchQuery,
    sortBy,
    sortOrder,
    
    // Actions
    setViewMode,
    toggleResultSelection,
    selectResult,
    closeDetailModal,
    clearSelection,
    selectAll,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    
    // Helpers
    isSelected,
    resetSearch,
    resetSort,
    toggleSortOrder,
    
    // Computed values
    isCardView,
    isListView,
    isCarouselView,
    hasSelection,
    selectionCount,
    selectedResultIds
  };
} 