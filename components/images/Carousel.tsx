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
  Minimize,
  Loader2
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
  const [showMetadataOverlay, setShowMetadataOverlay] = useState(showMetadata);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  
  // Performance optimization - preloaded images
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());

  // Virtual scrolling for thumbnail strip
  const [thumbnailViewport, setThumbnailViewport] = useState({ start: 0, end: 20 });
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  // Enhanced loading and animation states
  const [imageLoadingStates, setImageLoadingStates] = useState<Map<number, boolean>>(new Map());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageLoadProgress, setImageLoadProgress] = useState<Map<number, number>>(new Map());
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState<Map<number, boolean>>(new Map());

  // Animation states
  const [controlsAnimating, setControlsAnimating] = useState(false);
  const [overlayAnimating, setOverlayAnimating] = useState(false);
  const [buttonAnimations, setButtonAnimations] = useState<Map<string, boolean>>(new Map());

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Slideshow enhancements
  const [slideshowSpeed, setSlideshowSpeed] = useState(autoplayDelay || 3000);
  const [showSlideshowProgress, setShowSlideshowProgress] = useState(false);
  const [slideshowProgress, setSlideshowProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
    [autoplayPlugin.current]
  );

  // Enhanced animation functions
  const triggerButtonAnimation = useCallback((buttonId: string) => {
    setButtonAnimations(prev => new Map(prev).set(buttonId, true));
    setTimeout(() => {
      setButtonAnimations(prev => new Map(prev).set(buttonId, false));
    }, 150);
  }, []);

  const handleControlsAnimation = useCallback(() => {
    setControlsAnimating(true);
    setTimeout(() => setControlsAnimating(false), 300);
  }, []);

  const handleOverlayAnimation = useCallback(() => {
    setOverlayAnimating(true);
    setTimeout(() => setOverlayAnimating(false), 200);
  }, []);

  // Enhanced loading states with progress
  const handleImageLoadStart = useCallback((index: number) => {
    setImageLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.set(index, true);
      return newMap;
    });
    setShowLoadingSkeleton(prev => new Map(prev).set(index, true));
    setImageLoadProgress(prev => new Map(prev).set(index, 0));
    
    // Simulate loading progress for better UX
    const progressInterval = setInterval(() => {
      setImageLoadProgress(prev => {
        const currentProgress = prev.get(index) || 0;
        if (currentProgress < 90) {
          return new Map(prev).set(index, currentProgress + 10);
        }
        clearInterval(progressInterval);
        return prev;
      });
    }, 100);
  }, []);

  const handleImageLoad = useCallback((index: number) => {
    setImageLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.set(index, false);
      return newMap;
    });
    setImageLoadProgress(prev => new Map(prev).set(index, 100));
    
    // Hide skeleton with delay for smooth transition
    setTimeout(() => {
      setShowLoadingSkeleton(prev => new Map(prev).set(index, false));
    }, 200);
  }, []);

  // Update selected index when carousel changes
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const newIndex = emblaApi.selectedScrollSnap();
    if (newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
      handleControlsAnimation();
    }
  }, [emblaApi, selectedIndex, handleControlsAnimation]);

  // Initialize carousel
  useEffect(() => {
    if (!emblaApi) return;
    
    emblaApi.on('select', onSelect);
    onSelect();

    // Initialize autoplay state
    if (autoplayPlugin.current) {
      if (isPlaying) {
        autoplayPlugin.current.play();
      } else {
        autoplayPlugin.current.stop();
      }
    }

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect, isPlaying]);

  // Handle initial index change
  useEffect(() => {
    if (emblaApi && initialIndex !== selectedIndex) {
      emblaApi.scrollTo(initialIndex);
    }
  }, [emblaApi, initialIndex]);

  // Auto-hide controls with enhanced animation
  const resetHideControlsTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    
    if (!showControls) {
      handleControlsAnimation();
    }
    setShowControls(true);
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      handleControlsAnimation();
    }, 3000);
  }, [showControls, handleControlsAnimation]);

  // Mouse movement handler
  const handleMouseMove = useCallback(() => {
    resetHideControlsTimer();
  }, [resetHideControlsTimer]);

  // Enhanced navigation functions with animations
  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
      triggerButtonAnimation('prev');
    }
  }, [emblaApi, triggerButtonAnimation]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
      triggerButtonAnimation('next');
    }
  }, [emblaApi, triggerButtonAnimation]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
      triggerButtonAnimation(`thumb-${index}`);
    }
  }, [emblaApi, triggerButtonAnimation]);

  const togglePlayPause = useCallback(() => {
    if (!autoplayPlugin.current || !emblaApi) return;
    
    const autoplay = autoplayPlugin.current;
    if (isPlaying) {
      autoplay.stop();
    } else {
      if (emblaApi.canScrollNext() || emblaApi.canScrollPrev() || images.length > 1) {
        autoplay.play();
      }
    }
    setIsPlaying(!isPlaying);
    triggerButtonAnimation('playpause');
  }, [isPlaying, emblaApi, images.length, triggerButtonAnimation]);

  // Enhanced metadata overlay toggle
  const toggleMetadataOverlay = useCallback(() => {
    handleOverlayAnimation();
    setShowMetadataOverlay(prev => !prev);
    triggerButtonAnimation('metadata');
  }, [handleOverlayAnimation, triggerButtonAnimation]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          scrollPrev();
          break;
        case 'ArrowRight':
          event.preventDefault();
          scrollNext();
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
          toggleMetadataOverlay();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, emblaApi, onClose, images.length, togglePlayPause, scrollPrev, scrollNext, toggleMetadataOverlay]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
    triggerButtonAnimation('fullscreen');
  }, [triggerButtonAnimation]);

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
    
    if (!isVerticalSwipe) {
      if (isLeftSwipe && emblaApi) {
        scrollNext();
      } else if (isRightSwipe && emblaApi) {
        scrollPrev();
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setIsSwiping(false);
  }, [touchStart, touchEnd, minSwipeDistance, emblaApi, scrollNext, scrollPrev]);

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
      preloadImage(selectedIndex);
      
      for (let i = 1; i <= 2; i++) {
        const nextIndex = selectedIndex + i;
        if (nextIndex < images.length) {
          preloadImage(nextIndex);
        }
      }
      
      for (let i = 1; i <= 2; i++) {
        const prevIndex = selectedIndex - i;
        if (prevIndex >= 0) {
          preloadImage(prevIndex);
        }
      }
    };
    
    preloadAdjacent();
  }, [isOpen, selectedIndex, preloadImage, images.length]);

  // Slideshow progress tracking
  useEffect(() => {
    if (!isPlaying || !showSlideshowProgress) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setSlideshowProgress(0);
      return;
    }

    setSlideshowProgress(0);
    const interval = 50;
    const increment = (interval / slideshowSpeed) * 100;

    progressIntervalRef.current = setInterval(() => {
      setSlideshowProgress(prev => {
        if (prev >= 100) {
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, showSlideshowProgress, slideshowSpeed]);

  // Reset progress when slide changes
  useEffect(() => {
    if (isPlaying && showSlideshowProgress) {
      setSlideshowProgress(0);
    }
  }, [selectedIndex, isPlaying, showSlideshowProgress]);

  // Update autoplay delay when speed changes
  useEffect(() => {
    if (autoplayPlugin.current && emblaApi) {
      autoplayPlugin.current.stop();
      autoplayPlugin.current = Autoplay({ delay: slideshowSpeed, stopOnInteraction: false });
      
      if (isPlaying) {
        autoplayPlugin.current.play();
      }
    }
  }, [slideshowSpeed, emblaApi, isPlaying]);

  // Virtual scrolling for thumbnails
  useEffect(() => {
    if (images.length <= 20) return;
    
    const buffer = 5;
    const viewportSize = 20;
    
    let start = Math.max(0, selectedIndex - Math.floor(viewportSize / 2));
    let end = Math.min(images.length, start + viewportSize);
    
    if (end === images.length) {
      start = Math.max(0, end - viewportSize);
    }
    
    setThumbnailViewport({ start, end });
  }, [selectedIndex, images.length]);

  // Enhanced transition effects
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 400); // Increased duration for smoother effect
    return () => clearTimeout(timer);
  }, [selectedIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
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
                  {/* Enhanced Loading Skeleton */}
                  {showLoadingSkeleton.get(index) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-4">
                        {/* Animated Loading Spinner */}
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-white/20 rounded-full"></div>
                          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-white border-r-transparent rounded-full animate-spin"></div>
                        </div>
                        
                        {/* Loading Progress */}
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${imageLoadProgress.get(index) || 0}%` }}
                            />
                          </div>
                          <span className="text-white/80 text-sm font-medium">
                            Loading image... {Math.round(imageLoadProgress.get(index) || 0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simple Loading Indicator for Quick Loads */}
                  {imageLoadingStates.get(index) && !showLoadingSkeleton.get(index) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
                  
                  <ImageErrorBoundary>
                    <img
                      src={image.signedUrls?.original || '/placeholder-image.jpg'}
                      alt={image.metadata.original_filename || `Image ${index + 1} of ${images.length}`}
                      className={cn(
                        "max-w-full max-h-full object-contain transition-all duration-500 ease-out",
                        isTransitioning && index === selectedIndex 
                          ? "opacity-95 scale-[0.98] filter blur-[1px]" 
                          : "opacity-100 scale-100 filter blur-0",
                        imageLoadingStates.get(index) ? "opacity-0 scale-95" : "opacity-100 scale-100"
                      )}
                      loading={Math.abs(index - selectedIndex) <= 1 ? 'eager' : 'lazy'}
                      role="img"
                      aria-current={index === selectedIndex ? 'true' : 'false'}
                      aria-describedby={index === selectedIndex ? 'current-image-info' : undefined}
                      onLoadStart={() => handleImageLoadStart(index)}
                      onLoad={() => handleImageLoad(index)}
                      onError={() => handleImageLoad(index)}
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
        "absolute inset-0 pointer-events-none transition-all duration-500 ease-out",
        showControls ? "opacity-100" : "opacity-0",
        controlsAnimating && "transform scale-[1.02]"
      )}>
        {/* Top Bar */}
        <div className={cn(
          "absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent p-4 pointer-events-auto transition-all duration-300",
          showControls ? "translate-y-0" : "-translate-y-full"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className={cn(
                "bg-black/50 text-white border-white/20 transition-all duration-300",
                isTransitioning && "animate-pulse"
              )}>
                {selectedIndex + 1} / {images.length}
              </Badge>
              {currentImage && (
                <span className={cn(
                  "text-white text-sm font-medium transition-all duration-300",
                  isTransitioning ? "opacity-70 translate-x-1" : "opacity-100 translate-x-0"
                )}>
                  {currentImage.metadata.original_filename}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMetadataOverlay}
                className={cn(
                  "text-white hover:bg-white/20 transition-all duration-200 hover:scale-110",
                  showMetadataOverlay && "bg-white/20 scale-105",
                  buttonAnimations.get('metadata') && "animate-pulse scale-95"
                )}
                aria-label={showMetadataOverlay ? "Hide image details" : "Show image details"}
                title="Toggle image details (I key)"
              >
                <Info className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className={cn(
                  "text-white hover:bg-white/20 transition-all duration-200 hover:scale-110",
                  isPlaying && "bg-white/10",
                  buttonAnimations.get('playpause') && "animate-pulse scale-95"
                )}
                aria-label={isPlaying ? "Pause slideshow" : "Start slideshow"}
                title={isPlaying ? "Pause slideshow (Space)" : "Start slideshow (Space)"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              {/* Enhanced Slideshow Speed Control */}
              {isPlaying && (
                <div className="flex items-center gap-1 animate-in slide-in-from-right-5 duration-300">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSlideshowSpeed(Math.max(1000, slideshowSpeed - 1000))}
                    className="text-white hover:bg-white/20 text-xs px-2 transition-all duration-200 hover:scale-110"
                    title="Slower slideshow"
                  >
                    -
                  </Button>
                  <span className="text-white text-xs px-1 min-w-[3rem] text-center font-mono">
                    {(slideshowSpeed / 1000).toFixed(1)}s
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSlideshowSpeed(Math.min(10000, slideshowSpeed + 1000))}
                    className="text-white hover:bg-white/20 text-xs px-2 transition-all duration-200 hover:scale-110"
                    title="Faster slideshow"
                  >
                    +
                  </Button>
                </div>
              )}
              
              {/* Progress Indicator Toggle */}
              {isPlaying && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSlideshowProgress(!showSlideshowProgress)}
                  className={cn(
                    "text-white hover:bg-white/20 transition-all duration-200 hover:scale-110",
                    showSlideshowProgress && "bg-white/20 scale-105"
                  )}
                  title="Toggle progress indicator"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className={cn(
                  "text-white hover:bg-white/20 transition-all duration-200 hover:scale-110",
                  buttonAnimations.get('fullscreen') && "animate-pulse scale-95"
                )}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 hover:bg-red-500/20 transition-all duration-200 hover:scale-110"
                aria-label="Close carousel"
                title="Close carousel (Escape)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Slideshow Progress Indicator */}
        {isPlaying && showSlideshowProgress && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-black/40 via-black/20 to-black/40 pointer-events-none">
            <div className="relative h-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 transition-all duration-100 ease-linear"
                style={{ width: `${slideshowProgress}%` }}
              />
              <div 
                className="absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white/40 to-transparent"
                style={{ transform: `translateX(${slideshowProgress < 90 ? 0 : (slideshowProgress - 90) * 10}px)` }}
              />
            </div>
          </div>
        )}

        {/* Enhanced Navigation Arrows */}
        <Button
          variant="ghost"
          size="lg"
          onClick={scrollPrev}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 pointer-events-auto",
            "transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-white/20",
            "backdrop-blur-sm border border-white/10 hover:border-white/30",
            buttonAnimations.get('prev') && "animate-pulse scale-110",
            showControls ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
          )}
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
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 pointer-events-auto",
            "transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-white/20",
            "backdrop-blur-sm border border-white/10 hover:border-white/30",
            buttonAnimations.get('next') && "animate-pulse scale-110",
            showControls ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
          )}
          disabled={images.length <= 1}
          aria-label="Next image"
          title="Next image (Right arrow key)"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>

        {/* Enhanced Bottom Thumbnail Strip */}
        {images.length > 1 && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-4 pointer-events-auto transition-all duration-300",
            showControls ? "translate-y-0" : "translate-y-full"
          )}>
            <div className="flex justify-center">
              <div 
                ref={thumbnailStripRef}
                className="flex gap-3 max-w-full overflow-x-auto scrollbar-hide"
              >
                {/* Virtual scrolling for large image sets */}
                {images.length > 20 ? (
                  <>
                    {/* Enhanced indicator for hidden thumbnails on the left */}
                    {thumbnailViewport.start > 0 && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-white/30 flex items-center justify-center backdrop-blur-sm bg-black/40 transition-all duration-300 hover:border-white/50">
                        <span className="text-white/80 text-xs font-semibold">+{thumbnailViewport.start}</span>
                      </div>
                    )}
                    
                    {/* Render visible thumbnails */}
                    {images.slice(thumbnailViewport.start, thumbnailViewport.end).map((image, index) => {
                      const actualIndex = thumbnailViewport.start + index;
                      return (
                        <button
                          key={image.id}
                          onClick={() => scrollTo(actualIndex)}
                          className={cn(
                            "flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all duration-300",
                            "hover:scale-110 hover:shadow-lg hover:shadow-white/20 backdrop-blur-sm",
                            actualIndex === selectedIndex 
                              ? "border-white scale-110 shadow-lg shadow-white/30 ring-2 ring-white/50" 
                              : "border-white/30 hover:border-white/60",
                            buttonAnimations.get(`thumb-${actualIndex}`) && "animate-pulse scale-105"
                          )}
                        >
                          <img
                            src={image.signedUrls?.thumbnail || '/placeholder-image.jpg'}
                            alt={image.metadata.original_filename}
                            className="w-full h-full object-cover transition-all duration-300 hover:scale-105"
                            loading="lazy"
                          />
                        </button>
                      );
                    })}
                    
                    {/* Enhanced indicator for hidden thumbnails on the right */}
                    {thumbnailViewport.end < images.length && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-white/30 flex items-center justify-center backdrop-blur-sm bg-black/40 transition-all duration-300 hover:border-white/50">
                        <span className="text-white/80 text-xs font-semibold">+{images.length - thumbnailViewport.end}</span>
                      </div>
                    )}
                  </>
                ) : (
                  /* Render all thumbnails for small sets */
                  images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => scrollTo(index)}
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all duration-300",
                        "hover:scale-110 hover:shadow-lg hover:shadow-white/20 backdrop-blur-sm",
                        index === selectedIndex 
                          ? "border-white scale-110 shadow-lg shadow-white/30 ring-2 ring-white/50" 
                          : "border-white/30 hover:border-white/60",
                        buttonAnimations.get(`thumb-${index}`) && "animate-pulse scale-105"
                      )}
                    >
                      <img
                        src={image.signedUrls?.thumbnail || '/placeholder-image.jpg'}
                        alt={image.metadata.original_filename}
                        className="w-full h-full object-cover transition-all duration-300 hover:scale-105"
                        loading="lazy"
                      />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Metadata Overlay */}
      {showMetadataOverlay && currentImage && (
        <div className={cn(
          "absolute top-20 right-4 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto pointer-events-auto",
          "bg-black/80 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl",
          "transition-all duration-500 ease-out",
          overlayAnimating ? "scale-95 opacity-80" : "scale-100 opacity-100",
          showMetadataOverlay 
            ? "translate-x-0 opacity-100" 
            : "translate-x-full opacity-0"
        )}>
          <div className="p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <h3 className="font-semibold text-lg">Image Details</h3>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-white/90 text-sm uppercase tracking-wide">File Info</h4>
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex justify-between">
                  <span className="text-white/60">Name:</span> 
                  <span className="font-mono text-xs bg-white/10 px-2 py-1 rounded">{currentImage.metadata.original_filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Size:</span> 
                  <span>{currentImage.metadata.file_size ? formatFileSize(currentImage.metadata.file_size) : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Type:</span> 
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">{currentImage.metadata.mime_type || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Format:</span> 
                  <span>{currentImage.metadata.format || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              <h4 className="font-medium text-white/90 text-sm uppercase tracking-wide">Dimensions</h4>
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex justify-between">
                  <span className="text-white/60">Resolution:</span> 
                  <span className="font-mono">{currentImage.metadata.width && currentImage.metadata.height ? `${currentImage.metadata.width}×${currentImage.metadata.height}` : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Aspect Ratio:</span> 
                  <span>{currentImage.metadata.width && currentImage.metadata.height ? (currentImage.metadata.width / currentImage.metadata.height).toFixed(2) : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Megapixels:</span> 
                  <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">{currentImage.metadata.width && currentImage.metadata.height ? ((currentImage.metadata.width * currentImage.metadata.height) / 1000000).toFixed(1) + 'MP' : 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Upload Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-white/90 text-sm uppercase tracking-wide">Upload Info</h4>
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex justify-between">
                  <span className="text-white/60">Uploaded:</span> 
                  <span className="text-xs">{formatDate(currentImage.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">By:</span> 
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">{currentImage.metadata.uploaded_by || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Position:</span> 
                  <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">{selectedIndex + 1} of {images.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Keyboard Shortcuts Help */}
      <div className={cn(
        "absolute bottom-4 left-4 text-white/60 text-xs pointer-events-none transition-all duration-300",
        showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}>
        <div id="carousel-instructions" className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">←</kbd>
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">→</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">Space</kbd>
              Play/Pause
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">I</kbd>
              Info
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd>
              Exit
            </span>
          </div>
        </div>
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