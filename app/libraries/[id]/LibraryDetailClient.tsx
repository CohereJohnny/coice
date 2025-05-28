'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ImageUpload from '@/components/images/ImageUpload';
import CardView from '@/components/images/CardView';
import ListView from '@/components/images/ListView';
import ViewSwitcher, { ViewMode, GridSize, SortOption, SortDirection } from '@/components/images/ViewSwitcher';
import { Grid, List, Download, Trash2, Eye, Calendar, FileImage, HardDrive } from 'lucide-react';
import { toast } from 'sonner';

interface Library {
  id: number;
  name: string;
  description?: string;
  catalog_id: number;
  parent_id?: number;
  created_at: string;
  catalogs: {
    id: number;
    name: string;
  };
}

interface ImageMetadata {
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  format?: string;
  uploaded_by: string;
  upload_date: string;
  thumbnail?: {
    path: string;
    width: number;
    height: number;
    size: number;
  };
}

interface Image {
  id: number;
  gcs_path: string;
  library_id: number;
  metadata: ImageMetadata;
  created_at: string;
  signedUrls?: {
    original?: string;
    thumbnail?: string;
  };
}

interface LibraryDetailClientProps {
  libraryId: string;
}

export default function LibraryDetailClient({ libraryId }: LibraryDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [library, setLibrary] = useState<Library | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [filteredImages, setFilteredImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  // View state with URL persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (searchParams.get('view') as ViewMode) || 'card';
  });
  const [gridSize, setGridSize] = useState<GridSize>(() => {
    return (searchParams.get('gridSize') as GridSize) || 'medium';
  });
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    return (searchParams.get('sortBy') as SortOption) || 'date';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    return (searchParams.get('sortDirection') as SortDirection) || 'desc';
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get('search') || '';
  });
  const [showMetadata, setShowMetadata] = useState(() => {
    return searchParams.get('showMetadata') !== 'false';
  });
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Update URL when view state changes
  const updateURL = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    router.replace(newURL, { scroll: false });
  }, [router, searchParams]);

  // Handle view mode change with URL update
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    updateURL({ view: mode });
  }, [updateURL]);

  // Handle grid size change with URL update
  const handleGridSizeChange = useCallback((size: GridSize) => {
    setGridSize(size);
    updateURL({ gridSize: size });
  }, [updateURL]);

  // Handle sort change with URL update
  const handleSortByChange = useCallback((sort: SortOption) => {
    setSortBy(sort);
    updateURL({ sortBy: sort });
  }, [updateURL]);

  const handleSortDirectionChange = useCallback((direction: SortDirection) => {
    setSortDirection(direction);
    updateURL({ sortDirection: direction });
  }, [updateURL]);

  // Handle search change with URL update
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    updateURL({ search: query || null });
  }, [updateURL]);

  // Handle metadata toggle with URL update
  const handleShowMetadataChange = useCallback((show: boolean) => {
    setShowMetadata(show);
    updateURL({ showMetadata: show ? null : 'false' });
  }, [updateURL]);

  // Fetch library information
  useEffect(() => {
    fetchLibraryInfo();
  }, [libraryId]);

  // Fetch images when library is loaded
  useEffect(() => {
    if (library) {
      fetchImages();
    }
  }, [library, page]);

  // Filter and sort images
  useEffect(() => {
    let filtered = [...images];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(image =>
        image.metadata.original_filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        image.metadata.mime_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.metadata.original_filename || '';
          bValue = b.metadata.original_filename || '';
          break;
        case 'size':
          aValue = a.metadata.file_size || 0;
          bValue = b.metadata.file_size || 0;
          break;
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'dimensions':
          aValue = (a.metadata.width || 0) * (a.metadata.height || 0);
          bValue = (b.metadata.width || 0) * (b.metadata.height || 0);
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    setFilteredImages(filtered);
  }, [images, searchQuery, sortBy, sortDirection]);

  const fetchLibraryInfo = async () => {
    try {
      const response = await fetch(`/api/libraries/${libraryId}`);
      if (response.ok) {
        const data = await response.json();
        setLibrary(data.library);
      } else {
        toast.error('Failed to load library information');
      }
    } catch (error) {
      console.error('Error fetching library:', error);
      toast.error('Failed to load library information');
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    if (!library) return;
    
    setImagesLoading(true);
    try {
      const response = await fetch(
        `/api/images?libraryId=${library.id}&catalogId=${library.catalog_id}&page=${page}&limit=100`
      );
      
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        toast.error('Failed to load images');
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Failed to load images');
    } finally {
      setImagesLoading(false);
    }
  };

  const handleUploadComplete = () => {
    fetchImages(); // Refresh the images list
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Image deleted successfully');
        fetchImages(); // Refresh the images list
        setSelectedImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const handleDownloadImage = async (image: Image) => {
    // Use signed URL for download if available, otherwise try thumbnail path
    const downloadUrl = image.signedUrls?.original || image.signedUrls?.thumbnail;
    
    if (!downloadUrl) {
      toast.error('Download URL not available');
      return;
    }

    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.metadata.original_filename || `image-${image.id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };

  const handleImageSelect = useCallback((imageId: number, selected: boolean) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(imageId);
      } else {
        newSet.delete(imageId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDownload = async () => {
    const selectedImageList = filteredImages.filter(img => selectedImages.has(img.id));
    
    if (selectedImageList.length === 0) {
      toast.error('No images selected');
      return;
    }

    toast.info(`Downloading ${selectedImageList.length} images...`);
    
    for (const image of selectedImageList) {
      await handleDownloadImage(image);
      // Add small delay to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    toast.success(`Downloaded ${selectedImageList.length} images`);
  };

  const handleBulkDelete = async () => {
    const selectedImageList = filteredImages.filter(img => selectedImages.has(img.id));
    
    if (selectedImageList.length === 0) {
      toast.error('No images selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedImageList.length} images?`)) {
      return;
    }

    toast.info(`Deleting ${selectedImageList.length} images...`);
    
    for (const image of selectedImageList) {
      await handleDeleteImage(image.id);
    }
    
    setSelectedImages(new Set());
    toast.success(`Deleted ${selectedImageList.length} images`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading library...</p>
        </div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Library not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{library.name}</h1>
          <p className="text-muted-foreground">
            {library.catalogs.name} • {filteredImages.length} of {images.length} images
          </p>
          {library.description && (
            <p className="text-sm text-muted-foreground mt-1">{library.description}</p>
          )}
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <FileImage className="h-4 w-4 mr-2" />
          Upload Images
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Upload Images</h3>
          <ImageUpload
            catalogId={library.catalog_id.toString()}
            libraryId={library.id.toString()}
            onUploadComplete={handleUploadComplete}
            maxFiles={20}
          />
        </div>
      )}

      {/* View Controls */}
      <ViewSwitcher
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        gridSize={gridSize}
        onGridSizeChange={handleGridSizeChange}
        sortBy={sortBy}
        onSortByChange={handleSortByChange}
        sortDirection={sortDirection}
        onSortDirectionChange={handleSortDirectionChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedCount={selectedImages.size}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={handleBulkDelete}
        showMetadata={showMetadata}
        onShowMetadataChange={handleShowMetadataChange}
      />

      {/* Images Section */}
      <div className="space-y-4">
        {viewMode === 'card' ? (
          <CardView
            images={filteredImages}
            loading={imagesLoading}
            selectedImages={selectedImages}
            onImageSelect={handleImageSelect}
            onImageDownload={handleDownloadImage}
            onImageDelete={handleDeleteImage}
            gridSize={gridSize}
            showMetadata={showMetadata}
          />
        ) : (
          <ListView
            images={filteredImages}
            loading={imagesLoading}
            selectedImages={selectedImages}
            onImageSelect={handleImageSelect}
            onImageDownload={handleDownloadImage}
            onImageDelete={handleDeleteImage}
            pageSize={20}
          />
        )}

        {/* Pagination for Card view */}
        {viewMode === 'card' && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 