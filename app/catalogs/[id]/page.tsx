'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useAuth } from '@/lib/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CatalogForm } from '@/components/catalogs/CatalogForm';
import { LibraryForm } from '@/components/libraries/LibraryForm';
import { 
  Edit, 
  Trash2, 
  FolderPlus, 
  Image as ImageIcon,
  Library,
  User,
  Calendar,
  Shield,
  Plus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { catalogEvents } from '@/lib/catalogEvents';

interface Library {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  catalog_id: number;
  image_count?: number;
  children?: Library[];
  created_at: string;
}

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
  libraries?: Library[];
  total_images?: number;
}

interface CatalogDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CatalogDetailPage({ params }: CatalogDetailPageProps) {
  const [catalogId, setCatalogId] = useState<string>('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLibraries, setExpandedLibraries] = useState<Set<number>>(new Set());
  const [catalogDialog, setCatalogDialog] = useState<{
    open: boolean;
    mode: 'edit';
  }>({ open: false, mode: 'edit' });
  const [libraryDialog, setLibraryDialog] = useState<{
    open: boolean;
    parentId?: number;
  }>({ open: false });
  const [submitting, setSubmitting] = useState(false);
  
  const router = useRouter();
  const { user, profile, isManager, isAdmin } = useAuth();

  useEffect(() => {
    params.then(p => setCatalogId(p.id));
  }, [params]);

  useEffect(() => {
    if (catalogId) {
      fetchCatalogData();
    }
  }, [catalogId]);

  const fetchCatalogData = async () => {
    try {
      setLoading(true);
      
      // Fetch catalog details
      const catalogRes = await fetch(`/api/catalogs/${catalogId}`);
      if (!catalogRes.ok) {
        throw new Error('Failed to fetch catalog');
      }
      const catalogData = await catalogRes.json();
      
      // Fetch libraries for this catalog
      const librariesRes = await fetch(`/api/libraries?catalog_id=${catalogId}`);
      let librariesData: Library[] = [];
      if (librariesRes.ok) {
        const data = await librariesRes.json();
        librariesData = data.libraries || [];
      }
      
      // Build library tree structure
      const libraryTree = buildLibraryTree(librariesData);
      
      // Calculate total images (this would come from the API in a real implementation)
      const totalImages = librariesData.reduce((sum, lib) => sum + (lib.image_count || 0), 0);
      
      setCatalog({
        ...catalogData.catalog,
        libraries: libraryTree,
        total_images: totalImages
      });
      setLibraries(librariesData);
    } catch (error) {
      console.error('Error fetching catalog data:', error);
      toast.error('Failed to load catalog details');
    } finally {
      setLoading(false);
    }
  };

  const buildLibraryTree = (libraries: Library[]): Library[] => {
    const libraryMap = new Map<number, Library>();
    const rootLibraries: Library[] = [];

    // First pass: create all library objects
    libraries.forEach(lib => {
      libraryMap.set(lib.id, {
        ...lib,
        children: []
      });
    });

    // Second pass: build the tree structure
    libraries.forEach(lib => {
      const library = libraryMap.get(lib.id)!;
      if (lib.parent_id) {
        const parent = libraryMap.get(lib.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(library);
        }
      } else {
        rootLibraries.push(library);
      }
    });

    return rootLibraries;
  };

  const toggleLibrary = (libraryId: number) => {
    const newExpanded = new Set(expandedLibraries);
    if (newExpanded.has(libraryId)) {
      newExpanded.delete(libraryId);
    } else {
      newExpanded.add(libraryId);
    }
    setExpandedLibraries(newExpanded);
  };

  const handleEditCatalog = async (data: { name: string; description?: string }) => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/catalogs/${catalogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update catalog');
      }

      toast.success('Catalog updated successfully');
      setCatalogDialog({ open: false, mode: 'edit' });
      fetchCatalogData();
      catalogEvents.emit(); // Update sidebar
    } catch (error) {
      console.error('Error updating catalog:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update catalog');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCatalog = async () => {
    if (!confirm('Are you sure you want to delete this catalog? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/catalogs/${catalogId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete catalog');
      }

      toast.success('Catalog deleted successfully');
      catalogEvents.emit(); // Update sidebar
      router.push('/libraries');
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
      setLibraryDialog({ open: false });
      fetchCatalogData();
      catalogEvents.emit(); // Update sidebar
    } catch (error) {
      console.error('Error creating library:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create library');
    } finally {
      setSubmitting(false);
    }
  };

  const renderLibrary = (library: Library, level: number = 0) => {
    const isExpanded = expandedLibraries.has(library.id);
    const hasChildren = library.children && library.children.length > 0;

    return (
      <div key={library.id} className={`${level > 0 ? 'ml-6' : ''}`}>
        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          {hasChildren && (
            <button
              onClick={() => toggleLibrary(library.id)}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          {isExpanded || hasChildren ? (
            <FolderOpen className="h-4 w-4 text-blue-600" />
          ) : (
            <Folder className="h-4 w-4 text-blue-600" />
          )}
          
          <a 
            href={`/libraries/${library.id}`}
            className="flex-1 text-sm hover:text-blue-600"
          >
            {library.name}
          </a>
          
          <Badge variant="secondary" className="text-xs">
            {library.image_count || 0} images
          </Badge>
          
          {(isManager || isAdmin || user?.id === catalog?.user_id) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 hover:opacity-100"
              onClick={() => setLibraryDialog({ open: true, parentId: library.id })}
              title="Add Sublibrary"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {library.children!.map(child => renderLibrary(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const canManage = isManager || isAdmin || user?.id === catalog?.user_id;

  if (loading) {
    return (
      <AuthGuard>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!catalog) {
    return (
      <AuthGuard>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Catalog not found</h2>
          <p className="text-muted-foreground mb-4">The requested catalog could not be found.</p>
          <Button onClick={() => router.push('/libraries')}>
            Back to Libraries
          </Button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{catalog.name}</h1>
            {catalog.description && (
              <p className="text-muted-foreground mt-1">{catalog.description}</p>
            )}
          </div>
          
          {canManage && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCatalogDialog({ open: true, mode: 'edit' })}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteCatalog}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Libraries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Library className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{libraries.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">{catalog.total_images || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                <span className="text-sm">
                  {catalog.profiles?.display_name || catalog.profiles?.email || 'Unknown'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <span className="text-sm">
                  {new Date(catalog.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Libraries Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Libraries</CardTitle>
              {canManage && (
                <Button
                  size="sm"
                  onClick={() => setLibraryDialog({ open: true })}
                >
                  <FolderPlus className="h-4 w-4 mr-1" />
                  Add Library
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {catalog.libraries && catalog.libraries.length > 0 ? (
              <div className="space-y-1">
                {catalog.libraries.map(library => renderLibrary(library))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Folder className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  No libraries yet
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating your first library.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Owner</span>
                <Badge>{catalog.profiles?.email || 'Unknown'}</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Your Access</span>
                <Badge variant="outline">
                  {user?.id === catalog.user_id ? 'Owner' : 
                   isAdmin ? 'Admin' : 
                   isManager ? 'Manager' : 'Viewer'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Catalog Dialog */}
        <Dialog open={catalogDialog.open} onOpenChange={(open: boolean) => setCatalogDialog({ ...catalogDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Catalog</DialogTitle>
            </DialogHeader>
            <CatalogForm
              mode="edit"
              initialData={catalog}
              onSubmit={handleEditCatalog}
              onCancel={() => setCatalogDialog({ open: false, mode: 'edit' })}
              isLoading={submitting}
            />
          </DialogContent>
        </Dialog>

        {/* Library Dialog */}
        <Dialog open={libraryDialog.open} onOpenChange={(open: boolean) => setLibraryDialog({ ...libraryDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Library</DialogTitle>
            </DialogHeader>
            <LibraryForm
              mode="create"
              catalogs={[catalog]}
              libraries={libraries}
              onSubmit={handleCreateLibrary}
              onCancel={() => setLibraryDialog({ open: false })}
              isLoading={submitting}
              initialData={{ 
                name: '',
                catalog_id: parseInt(catalogId),
                parent_id: libraryDialog.parentId
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
} 