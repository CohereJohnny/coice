'use client';

import { useState, useCallback, useEffect } from 'react';
import { CarouselState, CarouselImage } from '../types';

interface UseCarouselStateProps {
  images: CarouselImage[];
  initialIndex?: number;
  isOpen: boolean;
  autoplay?: boolean;
  showMetadata?: boolean;
}

export function useCarouselState({
  images,
  initialIndex = 0,
  isOpen,
  autoplay = false,
  showMetadata = false
}: UseCarouselStateProps) {
  // Core state
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [showMetadataOverlay, setShowMetadataOverlay] = useState(showMetadata);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Zoom and pan state
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCenter, setZoomCenter] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Slideshow state
  const [slideshowSpeed, setSlideshowSpeed] = useState(3000);
  const [showSlideshowProgress, setShowSlideshowProgress] = useState(false);
  const [slideshowProgress, setSlideshowProgress] = useState(0);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Reset zoom when image changes
  const resetZoom = useCallback(() => {
    setIsZoomed(false);
    setZoomLevel(1);
    setZoomCenter({ x: 0, y: 0 });
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Handle zoom with bounds checking
  const handleZoom = useCallback((newZoomLevel: number, center: { x: number; y: number }) => {
    const minZoom = 1;
    const maxZoom = 5;
    
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoomLevel));
    
    if (clampedZoom === 1) {
      resetZoom();
    } else {
      setIsZoomed(true);
      setZoomLevel(clampedZoom);
      setZoomCenter(center);
    }
  }, [resetZoom]);

  // Handle pan for zoomed images
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    if (!isZoomed || zoomLevel <= 1) return;
    
    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
  }, [isZoomed, zoomLevel]);

  // Navigation functions
  const goToNext = useCallback(() => {
    setSelectedIndex(prev => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setSelectedIndex(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToImage = useCallback((index: number) => {
    if (index >= 0 && index < images.length) {
      setSelectedIndex(index);
    }
  }, [images.length]);

  // Slideshow controls
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleMetadata = useCallback(() => {
    setShowMetadataOverlay(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // URL state persistence
  const updateUrlState = useCallback(() => {
    if (typeof window === 'undefined' || !isOpen) return;
    
    const url = new URL(window.location.href);
    url.searchParams.set('carousel', 'true');
    url.searchParams.set('image', selectedIndex.toString());
    
    if (isZoomed) {
      url.searchParams.set('zoom', zoomLevel.toString());
    } else {
      url.searchParams.delete('zoom');
    }
    
    if (showMetadataOverlay) {
      url.searchParams.set('metadata', 'true');
    } else {
      url.searchParams.delete('metadata');
    }
    
    window.history.replaceState({}, '', url.toString());
  }, [isOpen, selectedIndex, isZoomed, zoomLevel, showMetadataOverlay]);

  // Reset zoom when image changes
  useEffect(() => {
    resetZoom();
  }, [selectedIndex, resetZoom]);

  // Update URL state with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(updateUrlState, 500);
    return () => clearTimeout(timeoutId);
  }, [updateUrlState]);

  // Theme detection
  useEffect(() => {
    const detectTheme = () => {
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedTheme(isDark ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme);
      }
    };

    detectTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', detectTheme);
    
    return () => mediaQuery.removeEventListener('change', detectTheme);
  }, [theme]);

  return {
    // Core state
    selectedIndex,
    isPlaying,
    showMetadata: showMetadataOverlay,
    showControls,
    isFullscreen,
    
    // Zoom state
    isZoomed,
    zoomLevel,
    zoomCenter,
    panOffset,
    
    // Slideshow state
    slideshowSpeed,
    showSlideshowProgress,
    slideshowProgress,
    setSlideshowProgress,
    
    // Theme
    theme,
    resolvedTheme,
    
    // Actions
    goToNext,
    goToPrevious,
    goToImage,
    togglePlayPause,
    toggleMetadata,
    toggleFullscreen,
    handleZoom,
    handlePan,
    resetZoom,
    
    // Setters for external control
    setShowControls,
    setSlideshowSpeed,
    setShowSlideshowProgress,
    setTheme,
    setSelectedIndex
  };
} 