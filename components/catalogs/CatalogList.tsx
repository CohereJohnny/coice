'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  FolderOpen, 
  Calendar,
  User
} from 'lucide-react';

interface Catalog {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name?: string;
    email: string;
  };
}

interface CatalogListProps {
  catalogs: Catalog[];
  onEdit?: (catalog: Catalog) => void;
  onDelete?: (catalog: Catalog) => void;
  onView?: (catalog: Catalog) => void;
  isLoading?: boolean;
  currentUserId?: string;
  userRole?: 'admin' | 'manager' | 'end_user';
}

export function CatalogList({ 
  catalogs, 
  onEdit, 
  onDelete, 
  onView,
  isLoading = false,
  currentUserId,
  userRole
}: CatalogListProps) {
  const [expandedActions, setExpandedActions] = useState<number | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    catalog: Catalog | null;
  }>({ open: false, catalog: null });

  const canEdit = (catalog: Catalog) => {
    return userRole === 'admin' || catalog.user_id === currentUserId;
  };

  const canDelete = (catalog: Catalog) => {
    return userRole === 'admin' || catalog.user_id === currentUserId;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleActions = (catalogId: number) => {
    setExpandedActions(expandedActions === catalogId ? null : catalogId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (catalogs.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No catalogs found
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating your first catalog.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {catalogs.map((catalog) => (
        <Card key={catalog.id} className="relative hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold truncate">
                  {catalog.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <User className="w-3 h-3 mr-1" />
                    {catalog.profiles?.display_name || catalog.profiles?.email || 'Unknown'}
                  </Badge>
                </div>
              </div>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActions(catalog.id)}
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {expandedActions === catalog.id && (
                  <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[120px]">
                    {onView && (
                      <button
                        onClick={() => {
                          onView(catalog);
                          setExpandedActions(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <FolderOpen className="h-4 w-4" />
                        View
                      </button>
                    )}
                    {onEdit && canEdit(catalog) && (
                      <button
                        onClick={() => {
                          onEdit(catalog);
                          setExpandedActions(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                    {onDelete && canDelete(catalog) && (
                      <button
                        onClick={() => {
                          setDeleteDialog({ open: true, catalog });
                          setExpandedActions(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {catalog.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                {catalog.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-3 w-3" />
              Created {formatDate(catalog.created_at)}
            </div>
          </CardContent>
        </Card>
      ))}
      
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, catalog: null })}
        onConfirm={() => {
          if (deleteDialog.catalog && onDelete) {
            onDelete(deleteDialog.catalog);
          }
        }}
        title="Delete Catalog"
        description="Are you sure you want to delete the catalog"
        itemName={deleteDialog.catalog?.name}
        warningMessage="This action cannot be undone. All libraries and images in this catalog will also be deleted."
      />
    </div>
  );
} 