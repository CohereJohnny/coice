'use client';

import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ImageIcon, Maximize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImageDisplayProps } from './types';

/**
 * ImageDisplay component handles the main image display
 * Focused responsibility: Display image with loading/error states
 */
export function ImageDisplay({ 
  image, 
  loading, 
  error, 
  className 
}: ImageDisplayProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !image) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center aspect-video bg-muted rounded-lg">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load image</h3>
              <p className="text-muted-foreground">
                {error || 'Image not found'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const imageUrl = image.signedUrls?.original || image.signedUrls?.thumbnail;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Main Image Display */}
          <div className="relative group">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {imageUrl ? (
                <>
                  {(imageLoading || imageError) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      {imageLoading && !imageError && (
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading image...</p>
                        </div>
                      )}
                      {imageError && (
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Failed to load image</p>
                        </div>
                      )}
                    </div>
                  )}
                  <img
                    src={imageUrl}
                    alt={image.metadata.original_filename}
                    className={cn(
                      "w-full h-full object-contain transition-opacity duration-300",
                      imageLoading && "opacity-0"
                    )}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                  
                  {/* Overlay buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-black/50 hover:bg-black/70 text-white border-none"
                      onClick={() => {
                        // Open image in new tab for full-screen viewing
                        if (imageUrl) {
                          window.open(imageUrl, '_blank');
                        }
                      }}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No image URL available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Image Info Bar */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="font-medium text-foreground">
                {image.metadata.original_filename}
              </span>
              {image.metadata.width && image.metadata.height && (
                <span>
                  {image.metadata.width} × {image.metadata.height}
                </span>
              )}
              <span>
                {formatFileSize(image.metadata.file_size)}
              </span>
              {image.metadata.mime_type && (
                <span className="uppercase">
                  {image.metadata.mime_type.split('/')[1]}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span>
                Uploaded {new Date(image.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 