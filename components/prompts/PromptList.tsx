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
  Loader2
} from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

type PromptType = 'boolean' | 'descriptive' | 'keywords';

interface Prompt {
  id: string;
  name: string;
  prompt: string;
  type: PromptType;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

interface PromptListProps {
  onCreateNew: () => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onView: (prompt: Prompt) => void;
  canCreate?: boolean;
  canEdit?: (prompt: Prompt) => boolean;
  canDelete?: (prompt: Prompt) => boolean;
}

type SortField = 'name' | 'type' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function PromptList({
  onCreateNew,
  onEdit,
  onDelete,
  onView,
  canCreate = true,
  canEdit = () => true,
  canDelete = () => true
}: PromptListProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<PromptType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPrompts = async () => {
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

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`/api/prompts?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }

      const data = await response.json();
      setPrompts(data.prompts || []);
      setTotalPages(Math.ceil((data.total || 0) / 10));
    } catch (error) {
      console.error('Error fetching prompts:', error);
      setError('Failed to load prompts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [page, sortField, sortDirection, searchTerm, typeFilter]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page when searching
  };

  const handleTypeFilter = (type: PromptType | 'all') => {
    setTypeFilter(type);
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

  const handleCopyPrompt = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const getTypeColor = (type: PromptType) => {
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

  const handleDeleteConfirm = async () => {
    if (!deletePromptId) return;
    
    try {
      setIsDeleting(true);
      await onDelete(prompts.find(p => p.id === deletePromptId) as Prompt);
      setDeletePromptId(null);
      fetchPrompts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting prompt:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button 
              onClick={fetchPrompts} 
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
          <h2 className="text-2xl font-bold">Prompts</h2>
          <p className="text-gray-600">Manage your AI prompts and templates</p>
        </div>
        {canCreate && (
          <Button onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Create Prompt
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
                  placeholder="Search prompts..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="w-full sm:w-48">
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                  <SelectItem value="keywords">Keywords</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompts List */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading prompts...
            </div>
          </CardContent>
        </Card>
      ) : prompts.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <p>No prompts found.</p>
              {canCreate && (
                <Button 
                  onClick={onCreateNew} 
                  variant="outline" 
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Prompt
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
                  className="col-span-4 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('name')}
                >
                  Name
                  <SortIcon field="name" />
                </div>
                <div 
                  className="col-span-2 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('type')}
                >
                  Type
                  <SortIcon field="type" />
                </div>
                <div className="col-span-3">Preview</div>
                <div 
                  className="col-span-2 flex items-center cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort('created_at')}
                >
                  Created
                  <SortIcon field="created_at" />
                </div>
                <div className="col-span-1">Actions</div>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Items */}
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Name */}
                  <div className="col-span-4">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {prompt.name}
                    </h3>
                    {prompt.creator_name && (
                      <p className="text-sm text-gray-500">
                        by {prompt.creator_name}
                      </p>
                    )}
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    <Badge className={getTypeColor(prompt.type)}>
                      {prompt.type}
                    </Badge>
                  </div>

                  {/* Preview */}
                  <div className="col-span-3">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {prompt.prompt.length > 100 
                        ? `${prompt.prompt.substring(0, 100)}...`
                        : prompt.prompt
                      }
                    </p>
                  </div>

                  {/* Created Date */}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">
                      {formatDate(prompt.created_at)}
                    </p>
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
                        <DropdownMenuItem onClick={() => onView(prompt)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyPrompt(prompt)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Text
                        </DropdownMenuItem>
                        {canEdit(prompt) && (
                          <DropdownMenuItem onClick={() => onEdit(prompt)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete(prompt) && (
                          <DropdownMenuItem 
                            onClick={() => {
                              setDeletePromptId(prompt.id);
                            }}
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!deletePromptId}
        onOpenChange={(open) => !open && setDeletePromptId(null)}
        onConfirm={handleDeleteConfirm}
        itemName={prompts.find(p => p.id === deletePromptId)?.name || 'prompt'}
        isLoading={isDeleting}
        warningMessage="This prompt may be used in pipelines. Deleting it could affect existing workflows."
      />
    </div>
  );
} 