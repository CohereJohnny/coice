// Mobile Responsiveness Hook
// Sprint 14: Mobile touch interactions and responsive optimization

'use client';

import { useEffect, useState, useCallback } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  userAgent: string;
  platform: string;
}

export interface ViewportInfo {
  width: number;
  height: number;
  availableWidth: number;
  availableHeight: number;
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface TouchTargetSize {
  minimum: number; // 44px recommended by Apple, 48dp by Google
  comfortable: number; // 48px+ for better UX
  spacing: number; // Spacing between touch targets
}

export interface UseMobileResponsiveOptions {
  // Touch target optimization
  enhanceTouchTargets?: boolean;
  minTouchTargetSize?: number;
  
  // Layout optimization
  enableViewportOptimization?: boolean;
  enableSafeAreaHandling?: boolean;
  
  // Performance optimization
  enableHoverOptimization?: boolean; // Disable hover on touch devices
  enableScrollOptimization?: boolean;
  
  // Accessibility
  respectReducedMotion?: boolean;
  enhanceContrastOnMobile?: boolean;
}

export function useMobileResponsive(options: UseMobileResponsiveOptions = {}) {
  const {
    enhanceTouchTargets = true,
    minTouchTargetSize = 44,
    enableViewportOptimization = true,
    enableSafeAreaHandling = true,
    enableHoverOptimization = true,
    enableScrollOptimization = true,
    respectReducedMotion = true,
    enhanceContrastOnMobile = false
  } = options;

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenSize: 'lg',
    orientation: 'landscape',
    pixelRatio: 1,
    userAgent: '',
    platform: ''
  });

  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>({
    width: 1920,
    height: 1080,
    availableWidth: 1920,
    availableHeight: 1080,
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  const [touchTargetSize, setTouchTargetSize] = useState<TouchTargetSize>({
    minimum: minTouchTargetSize,
    comfortable: Math.max(minTouchTargetSize, 48),
    spacing: 8
  });

  // Detect device capabilities
  const detectDevice = useCallback((): DeviceInfo => {
    if (typeof window === 'undefined') {
      return deviceInfo; // Return default for SSR
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const pixelRatio = window.devicePixelRatio || 1;

    // Touch device detection
    const isTouchDevice = 'ontouchstart' in window || 
                         navigator.maxTouchPoints > 0 || 
                         (navigator as any).msMaxTouchPoints > 0;

    // Screen size detection (Tailwind breakpoints)
    let screenSize: DeviceInfo['screenSize'] = 'lg';
    if (width < 640) screenSize = 'xs';
    else if (width < 768) screenSize = 'sm';
    else if (width < 1024) screenSize = 'md';
    else if (width < 1280) screenSize = 'lg';
    else if (width < 1536) screenSize = 'xl';
    else screenSize = '2xl';

    // Device type detection
    const isMobile = screenSize === 'xs' || screenSize === 'sm';
    const isTablet = screenSize === 'md' && isTouchDevice;
    const isDesktop = !isMobile && !isTablet;

    // Orientation detection
    const orientation = width > height ? 'landscape' : 'portrait';

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      screenSize,
      orientation,
      pixelRatio,
      userAgent,
      platform
    };
  }, [deviceInfo]);

  // Get viewport information
  const getViewportInfo = useCallback((): ViewportInfo => {
    if (typeof window === 'undefined') {
      return viewportInfo; // Return default for SSR
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const availableWidth = window.screen?.availWidth || width;
    const availableHeight = window.screen?.availHeight || height;

    // Safe area insets (for devices with notches, etc.)
    const computedStyle = getComputedStyle(document.documentElement);
    const safeAreaInsets = {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0')
    };

    return {
      width,
      height,
      availableWidth,
      availableHeight,
      safeAreaInsets
    };
  }, [viewportInfo]);

  // Calculate optimal touch target sizes
  const calculateTouchTargetSize = useCallback((device: DeviceInfo): TouchTargetSize => {
    const baseSizePx = minTouchTargetSize;
    
    // Adjust for device pixel ratio
    const adjustedSize = device.isMobile ? 
      Math.max(baseSizePx, 44 * device.pixelRatio) : 
      baseSizePx;

    return {
      minimum: adjustedSize,
      comfortable: Math.max(adjustedSize, 48),
      spacing: device.isMobile ? 12 : 8
    };
  }, [minTouchTargetSize]);

  // Handle resize events
  const handleResize = useCallback(() => {
    const newDeviceInfo = detectDevice();
    const newViewportInfo = getViewportInfo();
    const newTouchTargetSize = calculateTouchTargetSize(newDeviceInfo);

    setDeviceInfo(newDeviceInfo);
    setViewportInfo(newViewportInfo);
    setTouchTargetSize(newTouchTargetSize);
  }, [detectDevice, getViewportInfo, calculateTouchTargetSize]);

  // Initialize and set up event listeners
  useEffect(() => {
    handleResize(); // Initial call

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  // Apply mobile optimizations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Touch target optimization
    if (enhanceTouchTargets && deviceInfo.isTouchDevice) {
      root.style.setProperty('--touch-target-min-size', `${touchTargetSize.minimum}px`);
      root.style.setProperty('--touch-target-spacing', `${touchTargetSize.spacing}px`);
    }

    // Hover optimization (disable hover effects on touch devices)
    if (enableHoverOptimization && deviceInfo.isTouchDevice) {
      root.classList.add('touch-device');
      root.classList.remove('hover-device');
    } else {
      root.classList.add('hover-device');
      root.classList.remove('touch-device');
    }

    // Viewport optimization
    if (enableViewportOptimization) {
      root.style.setProperty('--viewport-width', `${viewportInfo.width}px`);
      root.style.setProperty('--viewport-height', `${viewportInfo.height}px`);
    }

    // Safe area handling
    if (enableSafeAreaHandling) {
      root.style.setProperty('--safe-area-inset-top', `${viewportInfo.safeAreaInsets.top}px`);
      root.style.setProperty('--safe-area-inset-right', `${viewportInfo.safeAreaInsets.right}px`);
      root.style.setProperty('--safe-area-inset-bottom', `${viewportInfo.safeAreaInsets.bottom}px`);
      root.style.setProperty('--safe-area-inset-left', `${viewportInfo.safeAreaInsets.left}px`);
    }

    // Scroll optimization
    if (enableScrollOptimization && deviceInfo.isTouchDevice) {
      root.style.setProperty('-webkit-overflow-scrolling', 'touch');
      root.style.setProperty('scroll-behavior', 'smooth');
    }

    // Reduced motion handling
    if (respectReducedMotion) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        root.classList.add('reduce-motion');
      }
    }

    // Mobile contrast enhancement
    if (enhanceContrastOnMobile && deviceInfo.isMobile) {
      root.classList.add('enhanced-contrast');
    }

  }, [
    deviceInfo, 
    viewportInfo, 
    touchTargetSize, 
    enhanceTouchTargets, 
    enableHoverOptimization, 
    enableViewportOptimization, 
    enableSafeAreaHandling, 
    enableScrollOptimization, 
    respectReducedMotion, 
    enhanceContrastOnMobile
  ]);

  // Utility functions
  const isMobileLayout = useCallback(() => {
    return deviceInfo.isMobile || deviceInfo.screenSize === 'xs' || deviceInfo.screenSize === 'sm';
  }, [deviceInfo]);

  const isTabletLayout = useCallback(() => {
    return deviceInfo.isTablet || deviceInfo.screenSize === 'md';
  }, [deviceInfo]);

  const shouldUseMobileUI = useCallback(() => {
    return deviceInfo.isTouchDevice && (deviceInfo.isMobile || deviceInfo.isTablet);
  }, [deviceInfo]);

  const getOptimalImageSize = useCallback((baseWidth: number, baseHeight: number) => {
    const { pixelRatio, screenSize } = deviceInfo;
    const { width } = viewportInfo;

    // Calculate responsive image size
    let scaleFactor = 1;
    
    if (screenSize === 'xs') scaleFactor = 0.5;
    else if (screenSize === 'sm') scaleFactor = 0.7;
    else if (screenSize === 'md') scaleFactor = 0.8;
    
    const optimizedWidth = Math.min(baseWidth * scaleFactor * pixelRatio, width);
    const optimizedHeight = (optimizedWidth / baseWidth) * baseHeight;

    return {
      width: Math.round(optimizedWidth),
      height: Math.round(optimizedHeight),
      pixelRatio
    };
  }, [deviceInfo, viewportInfo]);

  const getResponsiveClasses = useCallback(() => {
    const classes = [];
    
    if (deviceInfo.isMobile) classes.push('mobile-layout');
    if (deviceInfo.isTablet) classes.push('tablet-layout');
    if (deviceInfo.isDesktop) classes.push('desktop-layout');
    if (deviceInfo.isTouchDevice) classes.push('touch-enabled');
    if (deviceInfo.orientation === 'portrait') classes.push('portrait');
    else classes.push('landscape');
    
    classes.push(`screen-${deviceInfo.screenSize}`);
    
    return classes.join(' ');
  }, [deviceInfo]);

  return {
    // Device and viewport information
    deviceInfo,
    viewportInfo,
    touchTargetSize,
    
    // Utility functions
    isMobileLayout,
    isTabletLayout,
    shouldUseMobileUI,
    getOptimalImageSize,
    getResponsiveClasses,
    
    // Status flags
    isReady: deviceInfo.userAgent !== '', // Indicates detection is complete
    supportsTouch: deviceInfo.isTouchDevice,
    prefersReducedMotion: typeof window !== 'undefined' ? 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  };
} 