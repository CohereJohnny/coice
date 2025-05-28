'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CarouselMetadataProps } from './types';

export function CarouselMetadata({
  image,
  isVisible,
  isMobile = false,
  className
}: CarouselMetadataProps) {
  if (!isVisible || !image) return null;

  const metadata = image.metadata;
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={cn(
      "absolute right-4 top-1/2 -translate-y-1/2 z-10",
      "bg-black/80 backdrop-blur-sm text-white rounded-lg",
      "max-w-sm w-80 max-h-[80vh] overflow-y-auto",
      "transition-all duration-300 ease-in-out",
      isMobile && "right-2 w-72 max-w-[calc(100%-1rem)]",
      className
    )}>
      <div className={cn(
        "p-4 space-y-4",
        isMobile && "p-3 space-y-3"
      )}>
        {/* Header */}
        <div className="border-b border-white/20 pb-3">
          <h3 className={cn(
            "font-semibold text-lg truncate",
            isMobile && "text-base"
          )}>
            {metadata?.original_filename || `Image ${image.id}`}
          </h3>
          {metadata?.upload_date && (
            <p className={cn(
              "text-sm text-white/70 mt-1",
              isMobile && "text-xs"
            )}>
              {formatDate(metadata.upload_date)}
            </p>
          )}
        </div>

        {/* File Information */}
        <div className="space-y-2">
          <h4 className={cn(
            "font-medium text-sm text-white/90",
            isMobile && "text-xs"
          )}>
            File Information
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {metadata?.file_size && (
              <div>
                <span className="text-white/70">Size:</span>
                <div className="font-mono">{formatFileSize(metadata.file_size)}</div>
              </div>
            )}
            {metadata?.mime_type && (
              <div>
                <span className="text-white/70">Type:</span>
                <div className="font-mono">{metadata.mime_type}</div>
              </div>
            )}
            {metadata?.width && metadata?.height && (
              <div className="col-span-2">
                <span className="text-white/70">Dimensions:</span>
                <div className="font-mono">{metadata.width} × {metadata.height}</div>
              </div>
            )}
          </div>
        </div>

        {/* EXIF Data */}
        {metadata && Object.keys(metadata).filter(key => 
          !['filename', 'original_filename', 'file_size', 'mime_type', 'width', 'height', 'format', 'uploaded_by', 'upload_date', 'thumbnail'].includes(key)
        ).length > 0 && (
          <div className="space-y-2">
            <h4 className={cn(
              "font-medium text-sm text-white/90",
              isMobile && "text-xs"
            )}>
              EXIF Data
            </h4>
            <div className="space-y-1">
              {Object.entries(metadata)
                .filter(([key]) => 
                  !['filename', 'original_filename', 'file_size', 'mime_type', 'width', 'height', 'format', 'uploaded_by', 'upload_date', 'thumbnail'].includes(key)
                )
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center text-xs">
                    <span className="text-white/70 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="font-mono text-right max-w-[60%] truncate">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Upload Information */}
        {metadata?.uploaded_by && (
          <div className="space-y-2">
            <h4 className={cn(
              "font-medium text-sm text-white/90",
              isMobile && "text-xs"
            )}>
              Upload Information
            </h4>
            <div className="text-sm">
              <span className="text-white/70">Uploaded by:</span>
              <div className="font-mono">{metadata.uploaded_by}</div>
            </div>
          </div>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/20">
          <Badge variant="secondary" className="text-xs">
            Library {image.library_id}
          </Badge>
          {metadata?.format && (
            <Badge variant="outline" className="text-xs">
              {metadata.format.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
} 