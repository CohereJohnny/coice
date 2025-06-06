'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { CarouselImageProps } from './types';

export function CarouselImage({
  image,
  index,
  isActive,
  zoomLevel,
  panOffset,
  onZoomLevelChange,
  onPanOffsetChange,
  onImageLoad,
  onImageError,
  className
}: CarouselImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxRetries = 3;
  const imageUrl = image.signedUrls?.original || image.gcs_path;

  // Reset states when image changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [image.id]);

  // Handle zoom gestures
  const handleDoubleClick = (event: React.MouseEvent) => {
    if (!isActive) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = x / rect.width - 0.5;
    const centerY = y / rect.height - 0.5;

    if (zoomLevel > 1) {
      // Zoom out
      onZoomLevelChange?.(1);
      onPanOffsetChange?.({ x: 0, y: 0 });
    } else {
      // Zoom in
      onZoomLevelChange?.(2.5);
      onPanOffsetChange?.({ x: centerX * -200, y: centerY * -200 });
    }
  };

  // Handle mouse wheel zoom
  const handleWheel = (event: React.WheelEvent) => {
    if (!isActive) return;
    
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(1, Math.min(5, zoomLevel * delta));
    onZoomLevelChange?.(newZoom);

    if (newZoom === 1) {
      onPanOffsetChange?.({ x: 0, y: 0 });
    }
  };

  // Handle image load
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setIsLoading(false);
    setHasError(false);
    onImageLoad?.(index, {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    });
  };

  // Handle image error
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    onImageError?.(index, `Failed to load image after ${retryCount + 1} attempts`);
    
    if (retryCount < maxRetries) {
      toast.error(`Failed to load image. Retrying... (${retryCount + 1}/${maxRetries})`);
    } else {
      toast.error('Failed to load image after multiple attempts');
    }
  };

  // Handle retry
  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      setHasError(false);
      
      // Force reload by updating the image src
      if (imageRef.current) {
        const currentSrc = imageRef.current.src;
        imageRef.current.src = '';
        setTimeout(() => {
          if (imageRef.current) {
            imageRef.current.src = currentSrc;
          }
        }, 100);
      }
    }
  };

  if (!imageUrl) {
    return (
      <div className={cn(
        "flex items-center justify-center h-full bg-muted",
        className
      )}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No image URL available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden",
        "cursor-zoom-in",
        zoomLevel > 1 && "cursor-grab",
        className
      )}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-white" />
            <p className="text-sm text-white/70">Loading image...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-white/70 mb-3">
              Failed to load image
            </p>
            {retryCount < maxRetries && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main image - properly centered with flex and visual offset */}
      <Image
        ref={imageRef}
        src={imageUrl}
        alt={image.metadata?.original_filename || `Image ${index + 1}`}
        className={cn(
          "max-w-full max-h-full object-contain transition-transform duration-200",
          isLoading && "opacity-0",
          hasError && "hidden"
        )}
        style={{
          transform: `translateY(48px) scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: 'center center'
        }}
        width={image.metadata?.width || 1200}
        height={image.metadata?.height || 800}
        onLoad={handleImageLoad}
        onError={handleImageError}
        draggable={false}
        priority={isActive}
        sizes="100vw"
        quality={90}
      />

      {/* Image info overlay (when zoomed) */}
      {zoomLevel > 1 && naturalDimensions.width > 0 && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
          {Math.round(zoomLevel * 100)}% • {naturalDimensions.width}×{naturalDimensions.height}
        </div>
      )}
    </div>
  );
} 