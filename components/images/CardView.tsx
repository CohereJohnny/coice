'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import ImageErrorBoundary from './ImageErrorBoundary';
import { 
  Download, 
  Trash2, 
  Eye, 
  Calendar, 
  FileImage, 
  HardDrive,
  ImageIcon,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

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

interface CardViewProps {
  images: Image[];
  loading?: boolean;
  selectedImages?: Set<number>;
  onImageSelect?: (imageId: number, selected: boolean) => void;
  onImageDownload?: (image: Image) => void;
  onImageDelete?: (imageId: number) => void;
  onImagePreview?: (image: Image) => void;
  gridSize?: 'small' | 'medium' | 'large';
  showMetadata?: boolean;
}

const GRID_SIZES = {
  small: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
  medium: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  large: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function CardView({
  images,
  loading = false,
  selectedImages = new Set(),
  onImageSelect,
  onImageDownload,
  onImageDelete,
  onImagePreview,
  gridSize = 'medium',
  showMetadata = true
}: CardViewProps) {
  const [hoveredImage, setHoveredImage] = useState<number | null>(null);
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const [focusedImageIndex, setFocusedImageIndex] = useState<number>(-1);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (images.length === 0) return;

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          setFocusedImageIndex(prev => 
            prev < images.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setFocusedImageIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'ArrowDown':
          event.preventDefault();
          // Move down by grid columns (approximate)
          const cols = gridSize === 'small' ? 6 : gridSize === 'medium' ? 4 : 3;
          setFocusedImageIndex(prev => 
            Math.min(images.length - 1, prev + cols)
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Move up by grid columns (approximate)
          const upCols = gridSize === 'small' ? 6 : gridSize === 'medium' ? 4 : 3;
          setFocusedImageIndex(prev => Math.max(0, prev - upCols));
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedImageIndex >= 0 && focusedImageIndex < images.length) {
            const image = images[focusedImageIndex];
            if (onImagePreview) {
              onImagePreview(image);
            } else {
              onImageSelect?.(image.id, !selectedImages.has(image.id));
            }
          }
          break;
        case 'Escape':
          setFocusedImageIndex(-1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, focusedImageIndex, gridSize, onImageSelect, onImagePreview, selectedImages]);

  // Auto-focus first image when component mounts
  useEffect(() => {
    if (images.length > 0 && focusedImageIndex === -1) {
      setFocusedImageIndex(0);
    }
  }, [images.length, focusedImageIndex]);

  const handleImageLoad = useCallback((imageId: number) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
  }, []);

  const handleImageError = useCallback((imageId: number) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
    toast.error('Failed to load image');
  }, []);

  const handleCardClick = useCallback((image: Image, event: React.MouseEvent) => {
    // Don't trigger selection if clicking on action buttons
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      onImageSelect?.(image.id, !selectedImages.has(image.id));
    } else if (event.shiftKey && selectedImages.size > 0) {
      // Range select with Shift
      const imageIds = images.map(img => img.id);
      const currentIndex = imageIds.indexOf(image.id);
      const lastSelectedIndex = imageIds.findIndex(id => selectedImages.has(id));
      
      if (lastSelectedIndex !== -1) {
        const start = Math.min(currentIndex, lastSelectedIndex);
        const end = Math.max(currentIndex, lastSelectedIndex);
        
        for (let i = start; i <= end; i++) {
          onImageSelect?.(imageIds[i], true);
        }
      }
    } else {
      // Single select or preview
      if (onImagePreview) {
        onImagePreview(image);
      } else {
        onImageSelect?.(image.id, !selectedImages.has(image.id));
      }
    }
  }, [images, selectedImages, onImageSelect, onImagePreview]);

  const gridClasses = GRID_SIZES[gridSize];

  if (loading) {
    return (
      <div className={`grid ${gridClasses} gap-4`}>
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="aspect-square">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <div className="w-full h-full bg-muted animate-pulse rounded-lg" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No images found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or upload some images</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridClasses} gap-4`} role="grid" aria-label="Image gallery">
      {images.map((image, index) => {
        const isSelected = selectedImages.has(image.id);
        const isHovered = hoveredImage === image.id;
        const isFocused = focusedImageIndex === index;
        const isLoading = loadingImages.has(image.id);
        const imageUrl = image.signedUrls?.thumbnail || image.signedUrls?.original;

        return (
          <div key={image.id} className="aspect-square" role="gridcell">
            <ImageErrorBoundary
              onError={(error) => {
                console.error(`Error loading image ${image.id}:`, error);
                toast.error(`Failed to load image: ${image.metadata.original_filename}`);
              }}
            >
              <Card 
                className={`h-full cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                } ${
                  isFocused ? 'ring-2 ring-orange-500 shadow-lg' : ''
                }`}
                onMouseEnter={() => setHoveredImage(image.id)}
                onMouseLeave={() => setHoveredImage(null)}
                onClick={(e) => handleCardClick(image, e)}
                onFocus={() => setFocusedImageIndex(index)}
                tabIndex={isFocused ? 0 : -1}
                role="button"
                aria-label={`Image: ${image.metadata.original_filename || 'Unknown'}`}
                aria-selected={isSelected}
              >
                <CardContent className="p-0 h-full relative overflow-hidden rounded-lg">
                  {/* Selection Checkbox */}
                  {onImageSelect && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked: boolean) => onImageSelect(image.id, !!checked)}
                        className="bg-white/80 backdrop-blur-sm"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  {/* Image */}
                  <div className="w-full h-full relative">
                    {imageUrl ? (
                      <>
                        {isLoading && (
                          <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
                        )}
                        <img
                          src={imageUrl}
                          alt={image.metadata.original_filename || 'Image'}
                          className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                          onLoad={() => handleImageLoad(image.id)}
                          onError={() => handleImageError(image.id)}
                          loading="lazy"
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    {/* Hover Overlay */}
                    {isHovered && (
                      <div className="absolute inset-0 bg-black/50 transition-opacity duration-200">
                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {onImageDownload && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                onImageDownload(image);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {onImageDelete && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0 bg-red-500/80 backdrop-blur-sm hover:bg-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                onImageDelete(image.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Metadata Overlay */}
                        {showMetadata && (
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="text-white space-y-1">
                              <p className="text-sm font-medium truncate">
                                {image.metadata.original_filename || 'Unknown'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-white/80">
                                {image.metadata.width && image.metadata.height && (
                                  <span className="flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3" />
                                    {image.metadata.width}×{image.metadata.height}
                                  </span>
                                )}
                                {image.metadata.file_size && (
                                  <span className="flex items-center gap-1">
                                    <HardDrive className="h-3 w-3" />
                                    {formatFileSize(image.metadata.file_size)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-white/80">
                                <Calendar className="h-3 w-3" />
                                {formatDate(image.created_at)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </ImageErrorBoundary>
          </div>
        );
      })}
    </div>
  );
} 