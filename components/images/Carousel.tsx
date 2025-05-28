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
    >
      {/* Main Carousel */}
      <div className="relative w-full h-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((image, index) => (
            <div key={image.id} className="flex-[0_0_100%] min-w-0 relative">
              <div className="flex items-center justify-center w-full h-full">
                <ImageErrorBoundary>
                  <img
                    src={image.signedUrls?.original || '/placeholder-image.jpg'}
                    alt={image.metadata.original_filename}
                    className="max-w-full max-h-full object-contain"
                    loading={Math.abs(index - selectedIndex) <= 1 ? 'eager' : 'lazy'}
                  />
                </ImageErrorBoundary>
              </div>
            </div>
          ))}
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
              >
                <Info className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
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
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={scrollNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 pointer-events-auto"
          disabled={images.length <= 1}
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
          <MetadataDisplay 
            metadata={currentImage.metadata}
            variant="panel"
            className="text-white"
          />
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 left-4 text-white/60 text-xs pointer-events-none">
        <div>← → Navigate • Space Play/Pause • I Info • Esc Exit</div>
      </div>
    </div>
  );
}

export default Carousel; 