'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ImageUpload from '@/components/images/ImageUpload';
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
}

interface LibraryDetailClientProps {
  libraryId: string;
}

export default function LibraryDetailClient({ libraryId }: LibraryDetailClientProps) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
        `/api/images?libraryId=${library.id}&catalogId=${library.catalog_id}&page=${page}&limit=20`
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
    if (!image.metadata.thumbnail?.path) {
      toast.error('Download URL not available');
      return;
    }

    try {
      const response = await fetch(image.metadata.thumbnail.path);
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
            {library.catalogs.name} • {images.length} images
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

      {/* Images Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Images</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {imagesLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No images in this library</p>
            <p className="text-sm text-muted-foreground">Upload some images to get started</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="group relative aspect-square border rounded-lg overflow-hidden bg-muted">
                    {image.metadata.thumbnail?.path ? (
                      <img
                        src={image.metadata.thumbnail.path}
                        alt={image.metadata.original_filename || 'Image'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Eye className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadImage(image)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {images.map((image) => (
                  <div key={image.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 border rounded overflow-hidden bg-muted flex-shrink-0">
                      {image.metadata.thumbnail?.path ? (
                        <img
                          src={image.metadata.thumbnail.path}
                          alt={image.metadata.original_filename || 'Image'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Eye className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {image.metadata.original_filename || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {image.metadata.width && image.metadata.height 
                          ? `${image.metadata.width}×${image.metadata.height}`
                          : 'Unknown dimensions'
                        }
                        {image.metadata.file_size && (
                          <> • {Math.round(image.metadata.file_size / 1024)} KB</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(image.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadImage(image)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
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
          </>
        )}
      </div>
    </div>
  );
} 