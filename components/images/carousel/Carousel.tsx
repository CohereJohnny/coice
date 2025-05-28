'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { CarouselImage } from './CarouselImage';
import { CarouselNavigation } from './CarouselNavigation';
import { CarouselControls } from './CarouselControls';
import { CarouselMetadata } from './CarouselMetadata';
import { CarouselTouchHandler } from './CarouselTouchHandler';
import { useCarouselState } from './hooks/useCarouselState';
import type { CarouselProps } from './types';

// Utility functions
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
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function Carousel({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  showMetadata = false,
  autoplay = false,
  autoplayDelay = 3000
}: CarouselProps) {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Main carousel state
  const carouselState = useCarouselState({
    images,
    initialIndex,
    isOpen,
    autoplay,
    showMetadata
  });

  // Embla carousel setup
  const autoplayPlugin = React.useRef(
    Autoplay({ delay: carouselState.slideshowSpeed, stopOnInteraction: false })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      startIndex: initialIndex,
      skipSnaps: false,
      dragFree: false
    },
    [autoplayPlugin.current]
  );

  // Sync embla with our state
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const newIndex = emblaApi.selectedScrollSnap();
      if (newIndex !== carouselState.selectedIndex) {
        carouselState.setSelectedIndex(newIndex);
      }
    };

    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, carouselState.selectedIndex, carouselState.setSelectedIndex]);

  // Handle navigation
  const handlePrevious = () => {
    emblaApi?.scrollPrev();
  };

  const handleNext = () => {
    emblaApi?.scrollNext();
  };

  const handleGoToImage = (index: number) => {
    emblaApi?.scrollTo(index);
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!autoplayPlugin.current || !emblaApi) return;
    
    const autoplayRef = autoplayPlugin.current;
    if (carouselState.isPlaying) {
      autoplayRef.stop();
    } else {
      if (emblaApi.canScrollNext() || emblaApi.canScrollPrev() || images.length > 1) {
        autoplayRef.play();
      }
    }
    carouselState.togglePlayPause();
  };

  // Auto-hide controls
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimer = () => {
      carouselState.setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        carouselState.setShowControls(false);
      }, isMobile ? 2000 : 3000);
    };

    const handleMouseMove = () => resetTimer();
    
    if (isOpen) {
      resetTimer();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchstart', handleMouseMove);
    }

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchstart', handleMouseMove);
    };
  }, [isOpen, isMobile, carouselState]);

  if (!isOpen) return null;

  const currentImage = images[carouselState.selectedIndex];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Image carousel"
    >
      {/* Main Carousel */}
      <div className="relative w-full h-full overflow-hidden">
        <CarouselTouchHandler
          onSwipeLeft={handleNext}
          onSwipeRight={handlePrevious}
        >
          <div className="embla__viewport h-full w-full" ref={emblaRef}>
            <div className="flex h-full">
              {images.map((image, index) => (
                <div key={image.id} className="flex-[0_0_100%] min-w-0 relative h-full">
                  <CarouselImage
                    image={image}
                    index={index}
                    isActive={index === carouselState.selectedIndex}
                    zoomLevel={carouselState.zoomLevel}
                    panOffset={carouselState.panOffset}
                    onImageLoad={() => {}}
                    onImageError={() => {}}
                    className="w-full h-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </CarouselTouchHandler>
      </div>

      {/* Controls */}
      <CarouselControls
        onClose={onClose}
        isPlaying={carouselState.isPlaying}
        onToggleSlideshow={handlePlayPause}
        showMetadata={carouselState.showMetadata}
        onToggleMetadata={carouselState.toggleMetadata}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        currentImage={currentImage}
        isMobile={isMobile}
      />

      {/* Navigation */}
      <CarouselNavigation
        images={images}
        currentIndex={carouselState.selectedIndex}
        onNavigate={handleGoToImage}
        showThumbnails={true}
        showArrows={true}
        isMobile={isMobile}
      />

      {/* Metadata Overlay */}
      <CarouselMetadata
        image={currentImage}
        isVisible={carouselState.showMetadata}
        isMobile={isMobile}
      />

      {/* Accessibility */}
      <div className="sr-only" aria-live="polite">
        Currently viewing {currentImage?.metadata.original_filename || `image ${carouselState.selectedIndex + 1}`}, 
        image {carouselState.selectedIndex + 1} of {images.length}.
        {isMobile 
          ? "Swipe left or right to navigate, tap to show or hide controls."
          : "Use arrow keys to navigate, space to play or pause slideshow, I to toggle details, escape to close."
        }
      </div>
    </div>
  );
}

export { formatFileSize, formatDate }; 