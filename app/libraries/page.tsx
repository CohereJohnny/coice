'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '../components/auth/AuthGuard';
import { useAuth } from '@/lib/stores/auth';
import { CatalogList } from '@/components/catalogs/CatalogList';
import { CatalogForm } from '@/components/catalogs/CatalogForm';
import { LibraryForm } from '@/components/libraries/LibraryForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, FolderPlus, Library } from 'lucide-react';
import { toast } from 'sonner';

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

interface Library {
  id: number;
  name: string;
  description?: string;
  catalog_id: number;
  parent_id?: number;
  created_at: string;
  catalog?: {
    name: string;
  };
  parent?: {
    name: string;
  };
}

export default function LibrariesPage() {
  const { user, profile, isManager, isAdmin } = useAuth();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogDialog, setCatalogDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    catalog?: Catalog;
  }>({ open: false, mode: 'create' });
  const [libraryDialog, setLibraryDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    library?: Library;
  }>({ open: false, mode: 'create' });
  const [submitting, setSubmitting] = useState(false);

  const canManageCatalogs = isManager || isAdmin;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catalogsRes, librariesRes] = await Promise.all([
        fetch('/api/catalogs'),
        fetch('/api/libraries')
      ]);

      if (catalogsRes.ok) {
        const catalogsData = await catalogsRes.json();
        // The API returns { catalogs: [...] }, so we need to extract the catalogs array
        const catalogsArray = catalogsData.catalogs || [];
        setCatalogs(Array.isArray(catalogsArray) ? catalogsArray : []);
      } else {
        console.error('Failed to fetch catalogs:', catalogsRes.status);
        setCatalogs([]);
      }

      if (librariesRes.ok) {
        const librariesData = await librariesRes.json();
        // The API returns { libraries: [...] }, so we need to extract the libraries array
        const librariesArray = librariesData.libraries || [];
        setLibraries(Array.isArray(librariesArray) ? librariesArray : []);
      } else {
        console.error('Failed to fetch libraries:', librariesRes.status);
        setLibraries([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
      setCatalogs([]);
      setLibraries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCatalog = async (data: { name: string; description?: string }) => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create catalog');
      }

      toast.success('Catalog created successfully');
      setCatalogDialog({ open: false, mode: 'create' });
      fetchData();
    } catch (error) {
      console.error('Error creating catalog:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create catalog');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCatalog = async (data: { name: string; description?: string }) => {
    if (!catalogDialog.catalog) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/catalogs/${catalogDialog.catalog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update catalog');
      }

      toast.success('Catalog updated successfully');
      setCatalogDialog({ open: false, mode: 'create' });
      fetchData();
    } catch (error) {
      console.error('Error updating catalog:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update catalog');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCatalog = async (catalog: Catalog) => {
    try {
      const response = await fetch(`/api/catalogs/${catalog.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete catalog');
      }

      toast.success('Catalog deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting catalog:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete catalog');
    }
  };

  const handleCreateLibrary = async (data: { name: string; description?: string; catalog_id: number; parent_id?: number }) => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/libraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create library');
      }

      toast.success('Library created successfully');
      setLibraryDialog({ open: false, mode: 'create' });
      fetchData();
    } catch (error) {
      console.error('Error creating library:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create library');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Libraries & Catalogs</h1>
            <p className="text-muted-foreground">
              Manage your image catalogs and library collections
            </p>
          </div>
          <div className="flex gap-2">
            {canManageCatalogs && (
              <Button
                onClick={() => setCatalogDialog({ open: true, mode: 'create' })}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Catalog
              </Button>
            )}
            <Button
              onClick={() => setLibraryDialog({ open: true, mode: 'create' })}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              New Library
            </Button>
          </div>
        </div>

        <Tabs defaultValue="catalogs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="catalogs" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              Catalogs
            </TabsTrigger>
            <TabsTrigger value="libraries" className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Libraries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalogs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Catalogs</CardTitle>
              </CardHeader>
              <CardContent>
                <CatalogList
                  catalogs={catalogs}
                  onEdit={(catalog) => setCatalogDialog({ open: true, mode: 'edit', catalog })}
                  onDelete={handleDeleteCatalog}
                  isLoading={loading}
                  currentUserId={user?.id}
                  userRole={profile?.role as 'admin' | 'manager' | 'end_user'}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="libraries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Libraries</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading libraries...</div>
                ) : libraries.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderPlus className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      No libraries found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Get started by creating your first library.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {libraries.map((library) => (
                      <Card key={library.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold truncate">
                            {library.name}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground">
                            Catalog: {library.catalog?.name}
                            {library.parent && (
                              <div>Parent: {library.parent.name}</div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {library.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                              {library.description}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Created {new Date(library.created_at).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Catalog Dialog */}
        <Dialog open={catalogDialog.open} onOpenChange={(open: boolean) => setCatalogDialog({ ...catalogDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {catalogDialog.mode === 'create' ? 'Create New Catalog' : 'Edit Catalog'}
              </DialogTitle>
            </DialogHeader>
            <CatalogForm
              mode={catalogDialog.mode}
              initialData={catalogDialog.catalog}
              onSubmit={catalogDialog.mode === 'create' ? handleCreateCatalog : handleEditCatalog}
              onCancel={() => setCatalogDialog({ open: false, mode: 'create' })}
              isLoading={submitting}
            />
          </DialogContent>
        </Dialog>

        {/* Library Dialog */}
        <Dialog open={libraryDialog.open} onOpenChange={(open: boolean) => setLibraryDialog({ ...libraryDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {libraryDialog.mode === 'create' ? 'Create New Library' : 'Edit Library'}
              </DialogTitle>
            </DialogHeader>
            <LibraryForm
              mode={libraryDialog.mode}
              initialData={libraryDialog.library}
              catalogs={catalogs}
              libraries={libraries}
              onSubmit={handleCreateLibrary}
              onCancel={() => setLibraryDialog({ open: false, mode: 'create' })}
              isLoading={submitting}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
} 