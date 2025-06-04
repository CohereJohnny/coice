'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CarouselNavigationProps } from './types';

export function CarouselNavigation({
  images,
  currentIndex,
  onNavigate,
  showThumbnails = true,
  showArrows = true,
  isMobile = false,
  className
}: CarouselNavigationProps) {
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll thumbnails to keep current image visible
  useEffect(() => {
    if (!thumbnailsRef.current || !showThumbnails) return;

    const thumbnailContainer = thumbnailsRef.current;
    const currentThumbnail = thumbnailContainer.children[currentIndex] as HTMLElement;
    
    if (currentThumbnail) {
      const containerRect = thumbnailContainer.getBoundingClientRect();
      const thumbnailRect = currentThumbnail.getBoundingClientRect();
      
      const scrollLeft = thumbnailContainer.scrollLeft;
      const thumbnailLeft = thumbnailRect.left - containerRect.left + scrollLeft;
      const thumbnailRight = thumbnailLeft + thumbnailRect.width;
      const containerWidth = containerRect.width;
      
      if (thumbnailLeft < scrollLeft) {
        thumbnailContainer.scrollTo({
          left: thumbnailLeft - 20,
          behavior: 'smooth'
        });
      } else if (thumbnailRight > scrollLeft + containerWidth) {
        thumbnailContainer.scrollTo({
          left: thumbnailRight - containerWidth + 20,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex, showThumbnails]);

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    onNavigate(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    onNavigate(newIndex);
  };

  const handleThumbnailClick = (index: number) => {
    onNavigate(index);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handlePrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleNext();
    }
  };

  return (
    <div 
      className={cn("relative", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Navigation arrows */}
      {showArrows && images.length > 1 && (
        <>
          {/* Previous button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 z-10",
              "bg-black/50 hover:bg-black/70 text-white",
              "transition-all duration-200",
              isMobile ? "h-12 w-12" : "h-14 w-14"
            )}
            onClick={handlePrevious}
            aria-label="Previous image"
          >
            <ChevronLeft className={cn(
              isMobile ? "h-6 w-6" : "h-8 w-8"
            )} />
          </Button>

          {/* Next button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 z-10",
              "bg-black/50 hover:bg-black/70 text-white",
              "transition-all duration-200",
              isMobile ? "h-12 w-12" : "h-14 w-14"
            )}
            onClick={handleNext}
            aria-label="Next image"
          >
            <ChevronRight className={cn(
              isMobile ? "h-6 w-6" : "h-8 w-8"
            )} />
          </Button>
        </>
      )}

      {/* Thumbnail strip */}
      {showThumbnails && images.length > 1 && (
        <div className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 z-10",
          "max-w-[90%]",
          isMobile && "bottom-2 max-w-[95%]"
        )}>
          <div
            ref={thumbnailsRef}
            className={cn(
              "flex gap-2 overflow-x-auto scrollbar-hide",
              "bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2",
              "max-w-full",
              isMobile ? "gap-1 px-2 py-1" : "gap-2 px-3 py-2"
            )}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {images.map((image, index) => {
              const thumbnailUrl = image.signedUrls?.thumbnail || image.signedUrls?.original || image.gcs_path;
              
              return (
                <button
                  key={image.id}
                  onClick={() => handleThumbnailClick(index)}
                  className={cn(
                    "flex-shrink-0 rounded overflow-hidden transition-all duration-200",
                    "hover:scale-105 hover:ring-2 hover:ring-white/50",
                    currentIndex === index && "ring-2 ring-white scale-105",
                    isMobile ? "w-12 h-12" : "w-16 h-16"
                  )}
                  aria-label={`Go to image ${index + 1}`}
                >
                  <Image
                    src={thumbnailUrl}
                    alt={image.metadata?.original_filename || `Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    width={isMobile ? 48 : 64}
                    height={isMobile ? 48 : 64}
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <div className={cn(
          "absolute top-4 left-1/2 -translate-x-1/2 z-10",
          "bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full",
          "text-sm font-medium",
          isMobile && "text-xs px-2"
        )}>
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
} 