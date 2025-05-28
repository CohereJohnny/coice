'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  thumbnailSrc?: string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
}

export function ProgressiveImage({
  src,
  alt,
  className = '',
  thumbnailSrc,
  width,
  height,
  onLoad,
  onError,
  loading = 'lazy',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTJhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+'
}: ProgressiveImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const thumbnailRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Preload the main image
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      onLoad?.();
    };
    img.onerror = () => {
      setImageError(true);
      onError?.();
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  useEffect(() => {
    // Preload thumbnail if provided
    if (thumbnailSrc) {
      const thumb = new Image();
      thumb.onload = () => setThumbnailLoaded(true);
      thumb.src = thumbnailSrc;

      return () => {
        thumb.onload = null;
      };
    }
  }, [thumbnailSrc]);

  if (imageError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400',
          className
        )}
        style={{ width, height }}
      >
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-xs">Failed to load</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ width, height }}>
      {/* Placeholder/Thumbnail Layer */}
      {!imageLoaded && (
        <div className="absolute inset-0">
          {thumbnailSrc && thumbnailLoaded ? (
            <img
              ref={thumbnailRef}
              src={thumbnailSrc}
              alt={alt}
              className="w-full h-full object-cover filter blur-sm scale-110 transition-opacity duration-300"
              style={{ 
                opacity: thumbnailLoaded ? 1 : 0,
              }}
            />
          ) : (
            <img
              src={placeholder}
              alt="Loading..."
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Loading overlay */}
          <div className="absolute inset-0 bg-gray-200/50 dark:bg-gray-800/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500"></div>
          </div>
        </div>
      )}

      {/* Main Image Layer */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-500',
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={{ width, height }}
      />
    </div>
  );
}

export default ProgressiveImage; 