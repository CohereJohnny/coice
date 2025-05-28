'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Grid, 
  List, 
  Search,
  SlidersHorizontal,
  Download,
  Trash2
} from 'lucide-react';

export type ViewMode = 'card' | 'list';
export type GridSize = 'small' | 'medium' | 'large';
export type SortOption = 'name' | 'size' | 'date' | 'dimensions';
export type SortDirection = 'asc' | 'desc';

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  gridSize?: GridSize;
  onGridSizeChange?: (size: GridSize) => void;
  sortBy?: SortOption;
  onSortByChange?: (sort: SortOption) => void;
  sortDirection?: SortDirection;
  onSortDirectionChange?: (direction: SortDirection) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedCount?: number;
  onBulkDownload?: () => void;
  onBulkDelete?: () => void;
  showMetadata?: boolean;
  onShowMetadataChange?: (show: boolean) => void;
}

export default function ViewSwitcher({
  viewMode,
  onViewModeChange,
  gridSize = 'medium',
  onGridSizeChange,
  sortBy = 'date',
  onSortByChange,
  sortDirection = 'desc',
  onSortDirectionChange,
  searchQuery = '',
  onSearchChange,
  selectedCount = 0,
  onBulkDownload,
  onBulkDelete,
  showMetadata = true,
  onShowMetadataChange
}: ViewSwitcherProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side - Search and filters */}
      <div className="flex items-center gap-2 flex-1">
        {/* Search */}
        {onSearchChange && (
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        )}

        {/* Sort controls */}
        {onSortByChange && (
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="dimensions">Dimensions</SelectItem>
            </SelectContent>
          </Select>
        )}

        {onSortDirectionChange && (
          <Select value={sortDirection} onValueChange={onSortDirectionChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">A-Z</SelectItem>
              <SelectItem value="desc">Z-A</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Center - Selection info and bulk actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedCount} selected
          </span>
          {onBulkDownload && (
            <Button
              size="sm"
              variant="outline"
              onClick={onBulkDownload}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
          {onBulkDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onBulkDelete}
              className="h-8"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Right side - View controls */}
      <div className="flex items-center gap-2">
        {/* Grid size for card view */}
        {viewMode === 'card' && onGridSizeChange && (
          <Select value={gridSize} onValueChange={onGridSizeChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Metadata toggle */}
        {onShowMetadataChange && (
          <Button
            size="sm"
            variant={showMetadata ? 'default' : 'outline'}
            onClick={() => onShowMetadataChange(!showMetadata)}
            className="h-8"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        )}

        {/* View mode toggle */}
        <div className="flex border rounded-md">
          <Button
            size="sm"
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('card')}
            className="rounded-r-none border-r h-8"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('list')}
            className="rounded-l-none h-8"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 