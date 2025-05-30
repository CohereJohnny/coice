'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, FilterIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchFilters as SearchFiltersType } from '@/app/api/search/route';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  className?: string;
}

const CONTENT_TYPES = [
  { value: 'catalog', label: 'Catalogs', description: 'Catalog collections' },
  { value: 'library', label: 'Libraries', description: 'Image libraries' },
  { value: 'image', label: 'Images', description: 'Individual images' },
  { value: 'job_result', label: 'Analysis Results', description: 'AI analysis results' }
];

const FILE_TYPES = [
  { value: 'jpg', label: 'JPEG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
  { value: 'gif', label: 'GIF' },
  { value: 'tiff', label: 'TIFF' },
  { value: 'bmp', label: 'BMP' }
];

export function SearchFilters({
  filters,
  onFiltersChange,
  className
}: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFiltersType>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync with parent filters
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Handle content type changes
  const handleContentTypeChange = (type: string, checked: boolean) => {
    const currentTypes = localFilters.content_types || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    const newFilters = {
      ...localFilters,
      content_types: newTypes.length > 0 ? newTypes : undefined
    };
    
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle date range changes
  const handleDateChange = (field: 'date_from' | 'date_to', value: string) => {
    const newFilters = {
      ...localFilters,
      [field]: value || undefined
    };
    
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle file type changes
  const handleFileTypeChange = (type: string, checked: boolean) => {
    const currentTypes = localFilters.file_types || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    const newFilters = {
      ...localFilters,
      file_types: newTypes.length > 0 ? newTypes : undefined
    };
    
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Clear all filters
  const handleClearAll = () => {
    setLocalFilters({});
    onFiltersChange({});
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== undefined && (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4" />
          <span className="font-medium">Filters</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Content Types */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Content Types</Label>
        <div className="space-y-2">
          {CONTENT_TYPES.map((type) => (
            <div key={type.value} className="flex items-start space-x-2">
              <Checkbox
                id={`content-${type.value}`}
                checked={localFilters.content_types?.includes(type.value) || false}
                onCheckedChange={(checked) => 
                  handleContentTypeChange(type.value, checked as boolean)
                }
                className="mt-0.5"
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={`content-${type.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {type.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {type.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Date Range</Label>
        <div className="space-y-2">
          <div>
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={localFilters.date_from || ''}
              onChange={(e) => handleDateChange('date_from', e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="date-to"
              type="date"
              value={localFilters.date_to || ''}
              onChange={(e) => handleDateChange('date_to', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* File Types (for images) */}
      {(!localFilters.content_types || 
        localFilters.content_types.includes('image')) && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">File Types</Label>
          <div className="grid grid-cols-2 gap-2">
            {FILE_TYPES.slice(0, 6).map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`file-${type.value}`}
                  checked={localFilters.file_types?.includes(type.value) || false}
                  onCheckedChange={(checked) => 
                    handleFileTypeChange(type.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`file-${type.value}`}
                  className="text-xs font-normal cursor-pointer"
                >
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
          
          {/* Show more/less toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs w-full"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </Button>
          
          {isExpanded && (
            <div className="grid grid-cols-2 gap-2">
              {FILE_TYPES.slice(6).map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`file-${type.value}`}
                    checked={localFilters.file_types?.includes(type.value) || false}
                    onCheckedChange={(checked) => 
                      handleFileTypeChange(type.value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`file-${type.value}`}
                    className="text-xs font-normal cursor-pointer"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Presets */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Quick Filters</Label>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFiltersChange({
              content_types: ['image'],
              date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })}
            className="text-xs justify-start"
          >
            Recent Images (7 days)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFiltersChange({
              content_types: ['job_result'],
              date_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })}
            className="text-xs justify-start"
          >
            Recent Analysis (24h)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFiltersChange({
              content_types: ['catalog', 'library']
            })}
            className="text-xs justify-start"
          >
            Collections Only
          </Button>
        </div>
      </div>

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-md">
          <Label className="text-xs font-medium text-muted-foreground">
            Active Filters
          </Label>
          <div className="space-y-1 text-xs">
            {localFilters.content_types && (
              <div>Types: {localFilters.content_types.join(', ')}</div>
            )}
            {localFilters.date_from && (
              <div>From: {new Date(localFilters.date_from).toLocaleDateString()}</div>
            )}
            {localFilters.date_to && (
              <div>To: {new Date(localFilters.date_to).toLocaleDateString()}</div>
            )}
            {localFilters.file_types && (
              <div>Files: {localFilters.file_types.join(', ')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 