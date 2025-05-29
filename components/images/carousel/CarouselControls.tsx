'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  X, 
  Play, 
  Pause, 
  Info, 
  Settings,
  Maximize,
  Minimize 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CarouselControlsProps } from './types';

export function CarouselControls({
  onClose,
  isPlaying,
  onToggleSlideshow,
  showMetadata,
  onToggleMetadata,
  isFullscreen,
  onToggleFullscreen,
  currentImage,
  isMobile = false,
  className
}: CarouselControlsProps) {
  
  return (
    <div className={cn(
      "absolute top-0 left-0 right-0 z-20",
      "bg-gradient-to-b from-black/50 to-transparent",
      "p-4 flex items-center justify-between",
      isMobile && "p-2",
      className
    )}>
      {/* Left side - Image info */}
      <div className="flex items-center gap-2 text-white">
        {currentImage && (
          <div className={cn(
            "bg-black/30 backdrop-blur-sm rounded px-3 py-1",
            isMobile ? "text-sm px-2" : "text-sm"
          )}>
            <span className="font-medium">
              {currentImage.metadata?.original_filename || `Image ${currentImage.id}`}
            </span>
            {currentImage.metadata?.file_size && (
              <span className="ml-2 opacity-75">
                {formatFileSize(currentImage.metadata.file_size)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side - Control buttons */}
      <div className="flex items-center gap-2">
        {/* Slideshow toggle */}
        <Button
          variant="ghost"
          size={isMobile ? "sm" : "icon"}
          className={cn(
            "bg-black/30 hover:bg-black/50 text-white",
            "transition-all duration-200"
          )}
          onClick={onToggleSlideshow}
          aria-label={isPlaying ? "Pause slideshow" : "Start slideshow"}
        >
          {isPlaying ? (
            <Pause className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
          ) : (
            <Play className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
          )}
        </Button>

        {/* Metadata toggle */}
        <Button
          variant="ghost"
          size={isMobile ? "sm" : "icon"}
          className={cn(
            "bg-black/30 hover:bg-black/50 text-white",
            "transition-all duration-200",
            showMetadata && "bg-white/20"
          )}
          onClick={onToggleMetadata}
          aria-label={showMetadata ? "Hide metadata" : "Show metadata"}
        >
          <Info className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
        </Button>

        {/* Fullscreen toggle (desktop only) */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="bg-black/30 hover:bg-black/50 text-white transition-all duration-200"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Settings (placeholder for future features) */}
        <Button
          variant="ghost"
          size={isMobile ? "sm" : "icon"}
          className="bg-black/30 hover:bg-black/50 text-white transition-all duration-200"
          aria-label="Settings"
          disabled
        >
          <Settings className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
        </Button>

        {/* Close button */}
        <Button
          variant="ghost"
          size={isMobile ? "sm" : "icon"}
          className={cn(
            "bg-black/30 hover:bg-black/50 text-white",
            "transition-all duration-200 hover:bg-red-500/50"
          )}
          onClick={onClose}
          aria-label="Close carousel"
        >
          <X className={cn(isMobile ? "h-4 w-4" : "h-6 w-6")} />
        </Button>
      </div>
    </div>
  );
}

// Utility function for file size formatting
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
} 