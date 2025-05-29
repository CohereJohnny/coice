'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  Filter,
  SortAsc,
  SortDesc,
  Loader2,
  Workflow,
  Library,
  Calendar,
  User
} from 'lucide-react';

type PromptType = 'boolean' | 'descriptive' | 'keywords';

interface PipelineStage {
  id: string;
  prompt_id: string;
  stage_order: number;
  filter_condition?: string;
  prompt?: {
    id: string;
    name: string;
    type: PromptType;
  };
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  library_id: string;
  created_by: string;
  created_at: string;
  creator_name?: string;
  library_name?: string;
  stages: PipelineStage[];
}

interface PipelineListProps {
  onCreateNew: () => void;
  onEdit: (pipeline: Pipeline) => void;
  onDelete: (pipeline: Pipeline) => void;
  onView: (pipeline: Pipeline) => void;
  canCreate?: boolean;
  canEdit?: (pipeline: Pipeline) => boolean;
  canDelete?: (pipeline: Pipeline) => boolean;
  selectedLibraryId?: string;
}

type SortField = 'name' | 'created_at' | 'library_name';
type SortDirection = 'asc' | 'desc';

export function PipelineList({
  onCreateNew,
  onEdit,
  onDelete,
  onView,
  canCreate = true,
  canEdit = () => true,
  canDelete = () => true,
  selectedLibraryId
}: PipelineListProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<string>(selectedLibraryId || 'all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [availableLibraries, setAvailableLibraries] = useState<{ id: string; name: string }[]>([]);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sort: sortField,
        order: sortDirection,
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (libraryFilter !== 'all') {
        params.append('library_id', libraryFilter);
      }

      const response = await fetch(`/api/pipelines?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pipelines');
      }

      const data = await response.json();
      setPipelines(data.pipelines || []);
      setTotalPages(Math.ceil((data.total || 0) / 10));
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      setError('Failed to load pipelines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraries = async () => {
    try {
      const response = await fetch('/api/libraries?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAvailableLibraries(data.libraries || []);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, [page, sortField, sortDirection, searchTerm, libraryFilter]);

  useEffect(() => {
    fetchLibraries();
  }, []);

  useEffect(() => {
    if (selectedLibraryId) {
      setLibraryFilter(selectedLibraryId);
    }
  }, [selectedLibraryId]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page when searching
  };

  const handleLibraryFilter = (libraryId: string) => {
    setLibraryFilter(libraryId);
    setPage(1); // Reset to first page when filtering
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting
  };

  const handleCopyPipeline = async (pipeline: Pipeline) => {
    try {
      const pipelineData = {
        name: pipeline.name,
        description: pipeline.description,
        stages: pipeline.stages.map(stage => ({
          prompt_id: stage.prompt_id,
          stage_order: stage.stage_order,
          filter_condition: stage.filter_condition
        }))
      };
      await navigator.clipboard.writeText(JSON.stringify(pipelineData, null, 2));
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy pipeline:', error);
    }
  };

  const getPromptTypeColor = (type: PromptType) => {
    switch (type) {
      case 'boolean':
        return 'bg-green-100 text-green-800';
      case 'descriptive':
        return 'bg-blue-100 text-blue-800';
      case 'keywords':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="w-4 h-4 ml-1" /> : 
      <SortDesc className="w-4 h-4 ml-1" />;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button 
              onClick={fetchPipelines} 
              variant="outline" 
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipelines</h2>
          <p className="text-gray-600">Manage your AI analysis pipelines</p>
        </div>
        {canCreate && (
          <Button onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Create Pipeline
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search pipelines..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Library Filter */}
            <div className="w-full sm:w-48">
              <Select value={libraryFilter} onValueChange={handleLibraryFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Libraries</SelectItem>
                  {availableLibraries.map((library) => (
                    <SelectItem key={library.id} value={library.id}>
                      {library.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipelines List */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading pipelines...
            </div>
          </CardContent>
        </Card>
      ) : pipelines.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Workflow className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-4">No pipelines found.</p>
              {canCreate && (
                <Button 
                  onClick={onCreateNew} 
                  variant="outline" 
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Pipeline
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Sort Headers */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                <div 
                  className="col-span-3 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('name')}
                >
                  Name
                  <SortIcon field="name" />
                </div>
                <div 
                  className="col-span-2 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('library_name')}
                >
                  Library
                  <SortIcon field="library_name" />
                </div>
                <div className="col-span-3">Stages</div>
                <div className="col-span-2">Description</div>
                <div 
                  className="col-span-1 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('created_at')}
                >
                  Created
                  <SortIcon field="created_at" />
                </div>
                <div className="col-span-1">Actions</div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Items */}
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Name */}
                  <div className="col-span-3">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {pipeline.name}
                    </h3>
                    {pipeline.creator_name && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <User className="w-3 h-3" />
                        {pipeline.creator_name}
                      </div>
                    )}
                  </div>

                  {/* Library */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1">
                      <Library className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {pipeline.library_name || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Stages */}
                  <div className="col-span-3">
                    <div className="flex flex-wrap gap-1">
                      {pipeline.stages.slice(0, 3).map((stage, index) => (
                        <Badge 
                          key={stage.id} 
                          variant="outline" 
                          className={`text-xs ${stage.prompt?.type ? getPromptTypeColor(stage.prompt.type) : 'bg-gray-100 text-gray-800'}`}
                        >
                          {index + 1}. {stage.prompt?.type || 'Unknown'}
                        </Badge>
                      ))}
                      {pipeline.stages.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{pipeline.stages.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {pipeline.description.length > 80 
                        ? `${pipeline.description.substring(0, 80)}...`
                        : pipeline.description
                      }
                    </p>
                  </div>

                  {/* Created Date */}
                  <div className="col-span-1">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">
                        {formatDate(pipeline.created_at).split(',')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(pipeline)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyPipeline(pipeline)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Config
                        </DropdownMenuItem>
                        {canEdit(pipeline) && (
                          <DropdownMenuItem onClick={() => onEdit(pipeline)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete(pipeline) && (
                          <DropdownMenuItem 
                            onClick={() => onDelete(pipeline)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
} 