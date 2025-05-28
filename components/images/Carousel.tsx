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
  
  // Touch/swipe state with advanced gestures
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  
  // Advanced touch features
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCenter, setZoomCenter] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastTap, setLastTap] = useState<number>(0);
  const [touchDistance, setTouchDistance] = useState(0);
  const [initialTouchDistance, setInitialTouchDistance] = useState(0);
  const [swipeVelocity, setSwipeVelocity] = useState({ x: 0, y: 0 });
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [lastTouchPosition, setLastTouchPosition] = useState({ x: 0, y: 0 });

  // Touch momentum scrolling
  const [momentum, setMomentum] = useState({ x: 0, y: 0 });
  const momentumRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Performance optimization - preloaded images
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());

  // Virtual scrolling for thumbnail strip
  const [thumbnailViewport, setThumbnailViewport] = useState({ start: 0, end: 20 });
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  // Mobile breakpoint detection
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Detect mobile/tablet and orientation
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setOrientation(height > width ? 'portrait' : 'landscape');
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('orientationchange', checkScreenSize);
    };
  }, []);

  // Auto-hide controls faster on mobile for better UX
  const mobileHideDelay = isMobile ? 2000 : 3000;

  // Enhanced animation states
  const [imageLoadingStates, setImageLoadingStates] = useState<Map<number, boolean>>(new Map());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageLoadProgress, setImageLoadProgress] = useState<Map<number, number>>(new Map());
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState<Map<number, boolean>>(new Map());

  // Animation states
  const [controlsAnimating, setControlsAnimating] = useState(false);
  const [overlayAnimating, setOverlayAnimating] = useState(false);
  const [buttonAnimations, setButtonAnimations] = useState<Map<string, boolean>>(new Map());

  // Minimum swipe distance (in px) - responsive to screen size
  const minSwipeDistance = isMobile ? 30 : 50;

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

  // Advanced Touch Gesture Functions
  
  // Calculate distance between two touches for pinch-to-zoom
  const calculateTouchDistance = useCallback((touch1: React.Touch, touch2: React.Touch): number => {
    const deltaX = touch1.clientX - touch2.clientX;
    const deltaY = touch1.clientY - touch2.clientY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }, []);

  // Calculate center point between two touches
  const calculateTouchCenter = useCallback((touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

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
    }, mobileHideDelay);
  }, [showControls, handleControlsAnimation, mobileHideDelay]);

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

  // Reset zoom and pan to default state
  const resetZoom = useCallback(() => {
    setIsZoomed(false);
    setZoomLevel(1);
    setZoomCenter({ x: 0, y: 0 });
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
  }, []);

  // Handle zoom with bounds checking
  const handleZoom = useCallback((newZoomLevel: number, center: { x: number; y: number }) => {
    const minZoom = 1;
    const maxZoom = isMobile ? 3 : 5;
    
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoomLevel));
    
    if (clampedZoom === 1) {
      resetZoom();
    } else {
      setIsZoomed(true);
      setZoomLevel(clampedZoom);
      setZoomCenter(center);
    }
  }, [isMobile, resetZoom]);

  // Handle pan with bounds checking
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    if (!isZoomed || zoomLevel <= 1) return;
    
    // Calculate bounds based on zoom level
    const maxPanX = (zoomLevel - 1) * window.innerWidth / 2;
    const maxPanY = (zoomLevel - 1) * window.innerHeight / 2;
    
    setPanOffset(prev => ({
      x: Math.max(-maxPanX, Math.min(maxPanX, prev.x + deltaX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, prev.y + deltaY))
    }));
  }, [isZoomed, zoomLevel]);

  // Calculate velocity for momentum scrolling
  const calculateVelocity = useCallback((currentPos: { x: number; y: number }, currentTime: number) => {
    const timeDelta = currentTime - lastTouchTime;
    if (timeDelta === 0) return { x: 0, y: 0 };
    
    const velocityX = (currentPos.x - lastTouchPosition.x) / timeDelta;
    const velocityY = (currentPos.y - lastTouchPosition.y) / timeDelta;
    
    return { x: velocityX, y: velocityY };
  }, [lastTouchTime, lastTouchPosition]);

  // Apply momentum scrolling
  const applyMomentum = useCallback(() => {
    if (Math.abs(momentumRef.current.x) < 0.1 && Math.abs(momentumRef.current.y) < 0.1) {
      return;
    }
    
    // Apply momentum with decay
    momentumRef.current.x *= 0.95;
    momentumRef.current.y *= 0.95;
    
    if (isZoomed && zoomLevel > 1) {
      handlePan(momentumRef.current.x * 10, momentumRef.current.y * 10);
    }
    
    animationFrameRef.current = requestAnimationFrame(applyMomentum);
  }, [isZoomed, zoomLevel, handlePan]);

  // Start momentum scrolling
  const startMomentum = useCallback((velocity: { x: number; y: number }) => {
    momentumRef.current = velocity;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(applyMomentum);
  }, [applyMomentum]);

  // Enhanced touch handlers with advanced gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const currentTime = Date.now();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchEnd(null);
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY
      });
      setIsSwiping(false);
      setLastTouchTime(currentTime);
      setLastTouchPosition({ x: touch.clientX, y: touch.clientY });
      
      // Double-tap detection
      const timeSinceLastTap = currentTime - lastTap;
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // Double tap detected - toggle zoom
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const centerX = touch.clientX - rect.left;
        const centerY = touch.clientY - rect.top;
        
        if (isZoomed) {
          resetZoom();
        } else {
          handleZoom(2.5, { x: centerX, y: centerY });
        }
        
        setLastTap(0); // Reset to prevent triple-tap
      } else {
        setLastTap(currentTime);
      }
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom start
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = calculateTouchDistance(touch1, touch2);
      
      setInitialTouchDistance(distance);
      setTouchDistance(distance);
      setZoomCenter(calculateTouchCenter(touch1, touch2));
      
      // Stop momentum
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [lastTap, isZoomed, resetZoom, handleZoom, calculateTouchDistance, calculateTouchCenter]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentTime = Date.now();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const currentTouch = {
        x: touch.clientX,
        y: touch.clientY
      };
      
      if (!touchStart) return;
      
      const deltaX = currentTouch.x - touchStart.x;
      const deltaY = currentTouch.y - touchStart.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      if (isZoomed && zoomLevel > 1) {
        // Pan the zoomed image
        if (absDeltaX > 5 || absDeltaY > 5) {
          e.preventDefault();
          setIsPanning(true);
          handlePan(deltaX - (lastTouchPosition.x - touchStart.x), deltaY - (lastTouchPosition.y - touchStart.y));
        }
      } else {
        // Regular swipe navigation
        if (absDeltaX > absDeltaY && absDeltaX > 10) {
          e.preventDefault();
          setIsSwiping(true);
        }
      }
      
      setTouchEnd(currentTouch);
      
      // Calculate velocity for momentum
      const velocity = calculateVelocity(currentTouch, currentTime);
      setSwipeVelocity(velocity);
      setLastTouchTime(currentTime);
      setLastTouchPosition(currentTouch);
      
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = calculateTouchDistance(touch1, touch2);
      
      if (initialTouchDistance > 0) {
        const scale = distance / initialTouchDistance;
        const newZoomLevel = Math.max(1, zoomLevel * scale);
        const center = calculateTouchCenter(touch1, touch2);
        
        handleZoom(newZoomLevel, center);
        setTouchDistance(distance);
        setInitialTouchDistance(distance); // Update for next frame
      }
    }
  }, [touchStart, isZoomed, zoomLevel, lastTouchPosition, handlePan, calculateVelocity, initialTouchDistance, calculateTouchDistance, calculateTouchCenter, handleZoom]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) {
      setTouchStart(null);
      setTouchEnd(null);
      setIsSwiping(false);
      setIsPanning(false);
      return;
    }
    
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const isLeftSwipe = deltaX > minSwipeDistance;
    const isRightSwipe = deltaX < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);
    
    // Only navigate if not zoomed and not panning
    if (!isZoomed && !isPanning && !isVerticalSwipe) {
      if (isLeftSwipe && emblaApi) {
        scrollNext();
      } else if (isRightSwipe && emblaApi) {
        scrollPrev();
      }
    }
    
    // Start momentum scrolling if there's sufficient velocity
    if (Math.abs(swipeVelocity.x) > 0.5 || Math.abs(swipeVelocity.y) > 0.5) {
      startMomentum(swipeVelocity);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setIsSwiping(false);
    setIsPanning(false);
    setInitialTouchDistance(0);
  }, [touchStart, touchEnd, minSwipeDistance, isZoomed, isPanning, emblaApi, scrollNext, scrollPrev, swipeVelocity, startMomentum]);

  // Reset zoom when image changes
  useEffect(() => {
    resetZoom();
  }, [selectedIndex, resetZoom]);

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
    const viewportSize = isMobile ? 10 : 20;
    if (images.length <= viewportSize) return;
    
    const buffer = 5;
    
    let start = Math.max(0, selectedIndex - Math.floor(viewportSize / 2));
    let end = Math.min(images.length, start + viewportSize);
    
    if (end === images.length) {
      start = Math.max(0, end - viewportSize);
    }
    
    setThumbnailViewport({ start, end });
  }, [selectedIndex, images.length, isMobile]);

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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Reset zoom on escape for better UX
      if (event.key === 'Escape' && isZoomed) {
        event.preventDefault();
        resetZoom();
        return;
      }
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (!isZoomed) scrollPrev();
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (!isZoomed) scrollNext();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case ' ':
          event.preventDefault();
          if (!isZoomed) togglePlayPause();
          break;
        case 'Home':
          event.preventDefault();
          if (!isZoomed) emblaApi?.scrollTo(0);
          break;
        case 'End':
          event.preventDefault();
          if (!isZoomed) emblaApi?.scrollTo(images.length - 1);
          break;
        case 'i':
        case 'I':
          event.preventDefault();
          toggleMetadataOverlay();
          break;
        case '+':
        case '=':
          event.preventDefault();
          if (isMobile) break; // Only on desktop
          handleZoom(zoomLevel * 1.2, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
          break;
        case '-':
          event.preventDefault();
          if (isMobile) break; // Only on desktop
          handleZoom(zoomLevel / 1.2, zoomCenter);
          break;
        case '0':
          event.preventDefault();
          resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, emblaApi, onClose, images.length, togglePlayPause, scrollPrev, scrollNext, toggleMetadataOverlay, isZoomed, resetZoom, isMobile, handleZoom, zoomLevel, zoomCenter]);

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
                          <div className={cn(
                            "border-4 border-white/20 rounded-full",
                            isMobile ? "w-8 h-8" : "w-12 h-12"
                          )}></div>
                          <div className={cn(
                            "absolute top-0 left-0 border-4 border-white border-r-transparent rounded-full animate-spin",
                            isMobile ? "w-8 h-8" : "w-12 h-12"
                          )}></div>
                        </div>
                        
                        {/* Loading Progress */}
                        <div className="flex flex-col items-center gap-2">
                          <div className={cn(
                            "h-1 bg-white/20 rounded-full overflow-hidden",
                            isMobile ? "w-24" : "w-32"
                          )}>
                            <div 
                              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${imageLoadProgress.get(index) || 0}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-white/80 font-medium",
                            isMobile ? "text-xs" : "text-sm"
                          )}>
                            Loading image... {Math.round(imageLoadProgress.get(index) || 0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simple Loading Indicator for Quick Loads */}
                  {imageLoadingStates.get(index) && !showLoadingSkeleton.get(index) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Loader2 className={cn(
                        "text-white animate-spin",
                        isMobile ? "h-6 w-6" : "h-8 w-8"
                      )} />
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
                      style={{
                        transform: index === selectedIndex && isZoomed 
                          ? `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)` 
                          : undefined,
                        transformOrigin: index === selectedIndex && isZoomed 
                          ? `${zoomCenter.x}px ${zoomCenter.y}px` 
                          : 'center',
                        cursor: isZoomed && index === selectedIndex 
                          ? (isPanning ? 'grabbing' : 'grab') 
                          : 'default'
                      }}
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
        {/* Top Bar - Mobile Responsive */}
        <div className={cn(
          "absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-auto transition-all duration-300",
          showControls ? "translate-y-0" : "-translate-y-full",
          isMobile ? "p-2" : "p-4"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Badge variant="secondary" className={cn(
                "bg-black/50 text-white border-white/20 transition-all duration-300",
                isTransitioning && "animate-pulse",
                isMobile ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5"
              )}>
                {selectedIndex + 1} / {images.length}
              </Badge>
              {currentImage && !isMobile && (
                <span className={cn(
                  "text-white text-sm font-medium transition-all duration-300 hidden sm:block",
                  isTransitioning ? "opacity-70 translate-x-1" : "opacity-100 translate-x-0"
                )}>
                  {currentImage.metadata.original_filename}
                </span>
              )}
            </div>
            
            <div className={cn(
              "flex items-center",
              isMobile ? "gap-1" : "gap-2"
            )}>
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "sm"}
                onClick={toggleMetadataOverlay}
                className={cn(
                  "text-white hover:bg-white/20 transition-all duration-200",
                  isMobile ? "hover:scale-105 h-8 w-8 p-0" : "hover:scale-110 h-9 w-9",
                  showMetadataOverlay && "bg-white/20 scale-105",
                  buttonAnimations.get('metadata') && "animate-pulse scale-95"
                )}
                aria-label={showMetadataOverlay ? "Hide image details" : "Show image details"}
                title="Toggle image details (I key)"
              >
                <Info className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
              </Button>
              
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "sm"}
                onClick={togglePlayPause}
                className={cn(
                  "text-white hover:bg-white/20 transition-all duration-200",
                  isMobile ? "hover:scale-105 h-8 w-8 p-0" : "hover:scale-110 h-9 w-9",
                  isPlaying && "bg-white/10",
                  buttonAnimations.get('playpause') && "animate-pulse scale-95"
                )}
                aria-label={isPlaying ? "Pause slideshow" : "Start slideshow"}
                title={isPlaying ? "Pause slideshow (Space)" : "Start slideshow (Space)"}
              >
                {isPlaying ? (
                  <Pause className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                ) : (
                  <Play className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                )}
              </Button>
              
              {/* Enhanced Slideshow Speed Control - Hidden on small mobile */}
              {isPlaying && !isMobile && (
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
              
              {/* Progress Indicator Toggle - Hidden on mobile */}
              {isPlaying && !isMobile && (
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
              
              {/* Fullscreen - Hidden on mobile due to iOS limitations */}
              {!isMobile && (
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
              )}
              
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "sm"}
                onClick={onClose}
                className={cn(
                  "text-white hover:bg-white/20 hover:bg-red-500/20 transition-all duration-200",
                  isMobile ? "hover:scale-105 h-8 w-8 p-0" : "hover:scale-110 h-9 w-9"
                )}
                aria-label="Close carousel"
                title="Close carousel (Escape)"
              >
                <X className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
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

        {/* Enhanced Navigation Arrows - Mobile Responsive */}
        <Button
          variant="ghost"
          size={isMobile ? "default" : "lg"}
          onClick={scrollPrev}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-white hover:bg-white/20 pointer-events-auto",
            "transition-all duration-300 hover:shadow-lg hover:shadow-white/20",
            "backdrop-blur-sm border border-white/10 hover:border-white/30",
            buttonAnimations.get('prev') && "animate-pulse scale-110",
            showControls ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0",
            isMobile 
              ? "left-2 h-12 w-12 hover:scale-110" 
              : "left-4 hover:scale-125"
          )}
          disabled={images.length <= 1}
          aria-label="Previous image"
          title="Previous image (Left arrow key)"
        >
          <ChevronLeft className={isMobile ? "h-6 w-6" : "h-8 w-8"} />
        </Button>

        <Button
          variant="ghost"
          size={isMobile ? "default" : "lg"}
          onClick={scrollNext}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-white hover:bg-white/20 pointer-events-auto",
            "transition-all duration-300 hover:shadow-lg hover:shadow-white/20",
            "backdrop-blur-sm border border-white/10 hover:border-white/30",
            buttonAnimations.get('next') && "animate-pulse scale-110",
            showControls ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
            isMobile 
              ? "right-2 h-12 w-12 hover:scale-110" 
              : "right-4 hover:scale-125"
          )}
          disabled={images.length <= 1}
          aria-label="Next image"
          title="Next image (Right arrow key)"
        >
          <ChevronRight className={isMobile ? "h-6 w-6" : "h-8 w-8"} />
        </Button>

        {/* Enhanced Bottom Thumbnail Strip - Mobile Responsive */}
        {images.length > 1 && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-auto transition-all duration-300",
            showControls ? "translate-y-0" : "translate-y-full",
            isMobile ? "p-2" : "p-4"
          )}>
            <div className="flex justify-center">
              <div 
                ref={thumbnailStripRef}
                className={cn(
                  "flex max-w-full overflow-x-auto scrollbar-hide",
                  isMobile ? "gap-2" : "gap-3"
                )}
              >
                {/* Virtual scrolling for large image sets */}
                {images.length > (isMobile ? 10 : 20) ? (
                  <>
                    {/* Enhanced indicator for hidden thumbnails on the left */}
                    {thumbnailViewport.start > 0 && (
                      <div className={cn(
                        "flex-shrink-0 rounded-lg border-2 border-white/30 flex items-center justify-center backdrop-blur-sm bg-black/40 transition-all duration-300 hover:border-white/50",
                        isMobile ? "w-12 h-12" : "w-16 h-16"
                      )}>
                        <span className={cn(
                          "text-white/80 font-semibold",
                          isMobile ? "text-[10px]" : "text-xs"
                        )}>
                          +{thumbnailViewport.start}
                        </span>
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
                            "flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all duration-300",
                            "hover:shadow-lg hover:shadow-white/20 backdrop-blur-sm",
                            actualIndex === selectedIndex 
                              ? "border-white shadow-lg shadow-white/30 ring-2 ring-white/50" 
                              : "border-white/30 hover:border-white/60",
                            buttonAnimations.get(`thumb-${actualIndex}`) && "animate-pulse scale-105",
                            isMobile 
                              ? "w-12 h-12 hover:scale-105" 
                              : "w-16 h-16 hover:scale-110",
                            actualIndex === selectedIndex && (isMobile ? "scale-105" : "scale-110")
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
                      <div className={cn(
                        "flex-shrink-0 rounded-lg border-2 border-white/30 flex items-center justify-center backdrop-blur-sm bg-black/40 transition-all duration-300 hover:border-white/50",
                        isMobile ? "w-12 h-12" : "w-16 h-16"
                      )}>
                        <span className={cn(
                          "text-white/80 font-semibold",
                          isMobile ? "text-[10px]" : "text-xs"
                        )}>
                          +{images.length - thumbnailViewport.end}
                        </span>
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
                        "flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all duration-300",
                        "hover:shadow-lg hover:shadow-white/20 backdrop-blur-sm",
                        index === selectedIndex 
                          ? "border-white shadow-lg shadow-white/30 ring-2 ring-white/50" 
                          : "border-white/30 hover:border-white/60",
                        buttonAnimations.get(`thumb-${index}`) && "animate-pulse scale-105",
                        isMobile 
                          ? "w-12 h-12 hover:scale-105" 
                          : "w-16 h-16 hover:scale-110",
                        index === selectedIndex && (isMobile ? "scale-105" : "scale-110")
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

      {/* Enhanced Metadata Overlay - Mobile Responsive */}
      {showMetadataOverlay && currentImage && (
        <div className={cn(
          "absolute pointer-events-auto",
          "bg-black/80 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl",
          "transition-all duration-500 ease-out max-h-[calc(100vh-8rem)] overflow-y-auto",
          overlayAnimating ? "scale-95 opacity-80" : "scale-100 opacity-100",
          showMetadataOverlay 
            ? "translate-x-0 opacity-100" 
            : "translate-x-full opacity-0",
          // Mobile positioning: bottom sheet style
          isMobile 
            ? "bottom-4 left-4 right-4 max-h-[60vh]" 
            : "top-20 right-4 w-80"
        )}>
          <div className={cn(
            "space-y-4 text-white",
            isMobile ? "p-4" : "p-6"
          )}>
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <h3 className={cn(
                "font-semibold",
                isMobile ? "text-base" : "text-lg"
              )}>
                Image Details
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMetadataOverlay}
                    className="text-white/60 hover:text-white hover:bg-white/10 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Mobile filename display at top */}
            {isMobile && currentImage && (
              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <h4 className="font-medium text-white text-sm mb-1">Current Image</h4>
                <p className="text-white/80 text-xs font-mono break-all">
                  {currentImage.metadata.original_filename}
                </p>
              </div>
            )}
            
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className={cn(
                "font-medium text-white/90 uppercase tracking-wide",
                isMobile ? "text-xs" : "text-sm"
              )}>
                File Info
              </h4>
              <div className={cn(
                "space-y-2 text-white/80",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {!isMobile && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Name:</span> 
                    <span className="font-mono text-xs bg-white/10 px-2 py-1 rounded max-w-[200px] truncate">
                      {currentImage.metadata.original_filename}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/60">Size:</span> 
                  <span>{currentImage.metadata.file_size ? formatFileSize(currentImage.metadata.file_size) : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Type:</span> 
                  <span className={cn(
                    "bg-blue-500/20 text-blue-300 px-2 py-1 rounded",
                    isMobile ? "text-[10px]" : "text-xs"
                  )}>
                    {currentImage.metadata.mime_type || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Format:</span> 
                  <span>{currentImage.metadata.format || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              <h4 className={cn(
                "font-medium text-white/90 uppercase tracking-wide",
                isMobile ? "text-xs" : "text-sm"
              )}>
                Dimensions
              </h4>
              <div className={cn(
                "space-y-2 text-white/80",
                isMobile ? "text-xs" : "text-sm"
              )}>
                <div className="flex justify-between">
                  <span className="text-white/60">Resolution:</span> 
                  <span className="font-mono">
                    {currentImage.metadata.width && currentImage.metadata.height 
                      ? `${currentImage.metadata.width}×${currentImage.metadata.height}` 
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Aspect Ratio:</span> 
                  <span>
                    {currentImage.metadata.width && currentImage.metadata.height 
                      ? (currentImage.metadata.width / currentImage.metadata.height).toFixed(2) 
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Megapixels:</span> 
                  <span className={cn(
                    "bg-purple-500/20 text-purple-300 px-2 py-1 rounded",
                    isMobile ? "text-[10px]" : "text-xs"
                  )}>
                    {currentImage.metadata.width && currentImage.metadata.height 
                      ? ((currentImage.metadata.width * currentImage.metadata.height) / 1000000).toFixed(1) + 'MP' 
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Upload Info */}
            <div className="space-y-3">
              <h4 className={cn(
                "font-medium text-white/90 uppercase tracking-wide",
                isMobile ? "text-xs" : "text-sm"
              )}>
                Upload Info
              </h4>
              <div className={cn(
                "space-y-2 text-white/80",
                isMobile ? "text-xs" : "text-sm"
              )}>
                <div className="flex justify-between">
                  <span className="text-white/60">Uploaded:</span> 
                  <span className={isMobile ? "text-[10px]" : "text-xs"}>
                    {formatDate(currentImage.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">By:</span> 
                  <span className={cn(
                    "bg-green-500/20 text-green-300 px-2 py-1 rounded",
                    isMobile ? "text-[10px]" : "text-xs"
                  )}>
                    {currentImage.metadata.uploaded_by || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Position:</span> 
                  <span className={cn(
                    "bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded",
                    isMobile ? "text-[10px]" : "text-xs"
                  )}>
                    {selectedIndex + 1} of {images.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Keyboard Shortcuts Help - Mobile Responsive */}
      {!isMobile && (
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
      )}

      {/* Mobile Touch Instructions */}
      {isMobile && (
        <div className={cn(
          "absolute bottom-4 left-4 right-4 text-white/60 text-xs pointer-events-none transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}>
          <div id="carousel-instructions" className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 text-center">
            <div className="flex items-center justify-center gap-3 text-xs">
              <span>Swipe to navigate</span>
              <span>•</span>
              <span>Tap for controls</span>
              <span>•</span>
              <span>Pinch to zoom</span>
            </div>
          </div>
        </div>
      )}

      {/* Screen Reader Current Image Info */}
      {currentImage && (
        <div id="current-image-info" className="sr-only">
          Currently viewing {currentImage.metadata.original_filename || `image ${selectedIndex + 1}`}, 
          image {selectedIndex + 1} of {images.length}. 
          {currentImage.metadata.width && currentImage.metadata.height && 
            `Dimensions: ${currentImage.metadata.width} by ${currentImage.metadata.height} pixels. `}
          {isMobile 
            ? "Swipe left or right to navigate, tap to show or hide controls, tap info button to toggle details."
            : "Use arrow keys to navigate, space to play or pause slideshow, I to toggle details, escape to close."
          }
        </div>
      )}
    </div>
  );
}

export default Carousel; 