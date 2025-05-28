'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ImageErrorBoundary from './ImageErrorBoundary';
import { MetadataDisplay } from './MetadataDisplay';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Play, 
  Pause, 
  Info, 
  Settings,
  Maximize,
  Minimize
} from 'lucide-react';
import { toast } from 'sonner';

interface Image {
  id: number;
  gcs_path: string;
  library_id: number;
  metadata: {
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
    [key: string]: any;
  };
  created_at: string;
  signedUrls?: {
    original?: string;
    thumbnail?: string;
  };
}

interface CarouselProps {
  images: Image[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  showMetadata?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
}

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
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [showControls, setShowControls] = useState(true);
  const [showMetadataOverlay, setShowMetadataOverlay] = useState(showMetadata);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  
  // Performance optimization - preloaded images
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Embla carousel setup
  const autoplayPlugin = useRef(
    Autoplay({ delay: autoplayDelay, stopOnInteraction: false })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      startIndex: initialIndex,
      skipSnaps: false,
      dragFree: false
    },
    isPlaying ? [autoplayPlugin.current] : []
  );

  // Update selected index when carousel changes
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Initialize carousel
  useEffect(() => {
    if (!emblaApi) return;
    
    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Handle initial index change
  useEffect(() => {
    if (emblaApi && initialIndex !== selectedIndex) {
      emblaApi.scrollTo(initialIndex);
    }
  }, [emblaApi, initialIndex]);

  // Auto-hide controls
  const resetHideControlsTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    
    setShowControls(true);
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Mouse movement handler
  const handleMouseMove = useCallback(() => {
    resetHideControlsTimer();
  }, [resetHideControlsTimer]);

  // Navigation functions
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const togglePlayPause = useCallback(() => {
    if (!autoplayPlugin.current) return;
    
    const autoplay = autoplayPlugin.current;
    if (isPlaying) {
      autoplay.stop();
    } else {
      autoplay.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          emblaApi?.scrollPrev();
          break;
        case 'ArrowRight':
          event.preventDefault();
          emblaApi?.scrollNext();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case ' ':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'Home':
          event.preventDefault();
          emblaApi?.scrollTo(0);
          break;
        case 'End':
          event.preventDefault();
          emblaApi?.scrollTo(images.length - 1);
          break;
        case 'i':
        case 'I':
          event.preventDefault();
          setShowMetadataOverlay(prev => !prev);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, emblaApi, onClose, images.length, togglePlayPause]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Touch/swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
    setIsSwiping(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
    
    const deltaX = Math.abs(currentTouch.x - touchStart.x);
    const deltaY = Math.abs(currentTouch.y - touchStart.y);
    
    // If horizontal swipe is more significant than vertical, prevent default scrolling
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
      setIsSwiping(true);
    }
    
    setTouchEnd(currentTouch);
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const isLeftSwipe = deltaX > minSwipeDistance;
    const isRightSwipe = deltaX < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);
    
    // Only process horizontal swipes
    if (!isVerticalSwipe) {
      if (isLeftSwipe && emblaApi) {
        emblaApi.scrollNext();
      } else if (isRightSwipe && emblaApi) {
        emblaApi.scrollPrev();
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setIsSwiping(false);
  }, [touchStart, touchEnd, minSwipeDistance, emblaApi]);

  // Image preloading for performance
  const preloadImage = useCallback((imageIndex: number) => {
    if (preloadedImages.has(imageIndex) || !images[imageIndex]) return;
    
    const image = images[imageIndex];
    const imageUrl = image.signedUrls?.original;
    
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        setPreloadedImages(prev => new Set(prev).add(imageIndex));
      };
      img.onerror = () => {
        console.warn(`Failed to preload image at index ${imageIndex}`);
      };
      img.src = imageUrl;
    }
  }, [images, preloadedImages]);

  // Preload adjacent images when carousel opens or slide changes
  useEffect(() => {
    if (!isOpen) return;
    
    const preloadAdjacent = () => {
      // Preload current image
      preloadImage(selectedIndex);
      
      // Preload next 2 images
      for (let i = 1; i <= 2; i++) {
        const nextIndex = selectedIndex + i;
        if (nextIndex < images.length) {
          preloadImage(nextIndex);
        }
      }
      
      // Preload previous 2 images
      for (let i = 1; i <= 2; i++) {
        const prevIndex = selectedIndex - i;
        if (prevIndex >= 0) {
          preloadImage(prevIndex);
        }
      }
    };
    
    preloadAdjacent();
  }, [isOpen, selectedIndex, preloadImage, images.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const currentImage = images[selectedIndex];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Image carousel"
      aria-describedby="carousel-instructions"
    >
      {/* Main Carousel */}
      <div className="relative w-full h-full overflow-hidden">
        <div 
          className="embla__viewport h-full w-full" 
          ref={emblaRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: isSwiping ? 'none' : 'auto' }}
        >
          <div className="flex h-full">
            {images.map((image, index) => (
              <div key={image.id} className="flex-[0_0_100%] min-w-0 relative">
                <div className="flex items-center justify-center w-full h-full">
                  <ImageErrorBoundary>
                    <img
                      src={image.signedUrls?.original || '/placeholder-image.jpg'}
                      alt={image.metadata.original_filename || `Image ${index + 1} of ${images.length}`}
                      className="max-w-full max-h-full object-contain"
                      loading={Math.abs(index - selectedIndex) <= 1 ? 'eager' : 'lazy'}
                      role="img"
                      aria-current={index === selectedIndex ? 'true' : 'false'}
                      aria-describedby={index === selectedIndex ? 'current-image-info' : undefined}
                    />
                  </ImageErrorBoundary>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className={cn(
        "absolute inset-0 pointer-events-none transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4 pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-black/50 text-white">
                {selectedIndex + 1} / {images.length}
              </Badge>
              {currentImage && (
                <span className="text-white text-sm font-medium">
                  {currentImage.metadata.original_filename}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetadataOverlay(!showMetadataOverlay)}
                className="text-white hover:bg-white/20"
                aria-label={showMetadataOverlay ? "Hide image details" : "Show image details"}
                title="Toggle image details (I key)"
              >
                <Info className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="text-white hover:bg-white/20"
                aria-label={isPlaying ? "Pause slideshow" : "Start slideshow"}
                title={isPlaying ? "Pause slideshow (Space)" : "Start slideshow (Space)"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
                aria-label="Close carousel"
                title="Close carousel (Escape)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="lg"
          onClick={scrollPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 pointer-events-auto"
          disabled={images.length <= 1}
          aria-label="Previous image"
          title="Previous image (Left arrow key)"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={scrollNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 pointer-events-auto"
          disabled={images.length <= 1}
          aria-label="Next image"
          title="Next image (Right arrow key)"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>

        {/* Bottom Thumbnail Strip */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 pointer-events-auto">
            <div className="flex justify-center">
              <div className="flex gap-2 max-w-full overflow-x-auto scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => scrollTo(index)}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all",
                      index === selectedIndex 
                        ? "border-white scale-110" 
                        : "border-white/30 hover:border-white/60"
                    )}
                  >
                    <img
                      src={image.signedUrls?.thumbnail || '/placeholder-image.jpg'}
                      alt={image.metadata.original_filename}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Overlay */}
      {showMetadataOverlay && currentImage && (
        <div className="absolute top-20 right-4 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto bg-black/80 backdrop-blur-sm rounded-lg p-4 pointer-events-auto">
          <div className="space-y-4 text-white">
            <h3 className="font-semibold text-lg border-b border-white/20 pb-2">Image Details</h3>
            
            {/* Basic Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-white/90">File Info</h4>
              <div className="space-y-1 text-sm text-white/80">
                <div><span className="text-white/60">Name:</span> {currentImage.metadata.original_filename}</div>
                <div><span className="text-white/60">Size:</span> {currentImage.metadata.file_size ? formatFileSize(currentImage.metadata.file_size) : 'Unknown'}</div>
                <div><span className="text-white/60">Type:</span> {currentImage.metadata.mime_type || 'Unknown'}</div>
                <div><span className="text-white/60">Format:</span> {currentImage.metadata.format || 'Unknown'}</div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-2">
              <h4 className="font-medium text-white/90">Dimensions</h4>
              <div className="space-y-1 text-sm text-white/80">
                <div><span className="text-white/60">Resolution:</span> {currentImage.metadata.width && currentImage.metadata.height ? `${currentImage.metadata.width}×${currentImage.metadata.height}` : 'Unknown'}</div>
                <div><span className="text-white/60">Aspect Ratio:</span> {currentImage.metadata.width && currentImage.metadata.height ? (currentImage.metadata.width / currentImage.metadata.height).toFixed(2) : 'Unknown'}</div>
                <div><span className="text-white/60">Megapixels:</span> {currentImage.metadata.width && currentImage.metadata.height ? ((currentImage.metadata.width * currentImage.metadata.height) / 1000000).toFixed(1) + 'MP' : 'Unknown'}</div>
              </div>
            </div>

            {/* Upload Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-white/90">Upload Info</h4>
              <div className="space-y-1 text-sm text-white/80">
                <div><span className="text-white/60">Uploaded:</span> {formatDate(currentImage.created_at)}</div>
                <div><span className="text-white/60">By:</span> {currentImage.metadata.uploaded_by || 'Unknown'}</div>
                <div><span className="text-white/60">Position:</span> {selectedIndex + 1} of {images.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 left-4 text-white/60 text-xs pointer-events-none">
        <div id="carousel-instructions">← → Navigate • Space Play/Pause • I Info • Esc Exit</div>
      </div>

      {/* Screen Reader Current Image Info */}
      {currentImage && (
        <div id="current-image-info" className="sr-only">
          Currently viewing {currentImage.metadata.original_filename || `image ${selectedIndex + 1}`}, 
          image {selectedIndex + 1} of {images.length}. 
          {currentImage.metadata.width && currentImage.metadata.height && 
            `Dimensions: ${currentImage.metadata.width} by ${currentImage.metadata.height} pixels. `}
          Use arrow keys to navigate, space to play or pause slideshow, I to toggle details, escape to close.
        </div>
      )}
    </div>
  );
}

export default Carousel; 