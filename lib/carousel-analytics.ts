/**
 * Carousel Analytics and Performance Monitoring
 * Tracks user interactions, performance metrics, and usage patterns
 */

export interface CarouselInteraction {
  action: string;
  timestamp: number;
  imageIndex: number;
  totalImages: number;
  zoomLevel?: number;
  isMobile: boolean;
  metadata?: Record<string, any>;
}

export interface CarouselPerformanceMetric {
  imageIndex: number;
  loadStartTime: number;
  loadEndTime?: number;
  loadDuration?: number;
  imageSize?: number;
  cacheHit?: boolean;
  retryCount?: number;
  errorCount?: number;
  lastError?: string;
}

export interface CarouselSessionData {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalInteractions: number;
  imagesViewed: Set<number>;
  averageViewTime: number;
  totalZoomInteractions: number;
  touchGesturesUsed: Set<string>;
  keyboardShortcutsUsed: Set<string>;
  slideshowUsed: boolean;
  metadataToggled: boolean;
  shareActions: number;
  deviceInfo: {
    isMobile: boolean;
    isTablet: boolean;
    screenWidth: number;
    screenHeight: number;
    orientation: 'portrait' | 'landscape';
    touchSupported: boolean;
  };
}

export interface CarouselUsageReport {
  totalSessions: number;
  averageSessionDuration: number;
  averageImagesPerSession: number;
  mostViewedImageIndex: number;
  popularInteractions: Array<{ action: string; count: number }>;
  performanceMetrics: {
    averageLoadTime: number;
    slowestLoadTime: number;
    fastestLoadTime: number;
    errorRate: number;
    cacheHitRate: number;
  };
  userExperienceMetrics: {
    mobileUsagePercentage: number;
    touchGestureUsage: Record<string, number>;
    keyboardUsage: Record<string, number>;
    slideshowUsageRate: number;
    metadataUsageRate: number;
  };
}

export class CarouselAnalytics {
  private interactions: CarouselInteraction[] = [];
  private performanceMetrics: Map<number, CarouselPerformanceMetric> = new Map();
  private currentSession: CarouselSessionData;
  private imageViewStartTimes: Map<number, number> = new Map();
  private isEnabled: boolean = true;

  constructor(sessionId?: string) {
    this.currentSession = this.initializeSession(sessionId);
    this.setupPerformanceObserver();
  }

  private initializeSession(sessionId?: string): CarouselSessionData {
    return {
      sessionId: sessionId || this.generateSessionId(),
      startTime: Date.now(),
      totalInteractions: 0,
      imagesViewed: new Set(),
      averageViewTime: 0,
      totalZoomInteractions: 0,
      touchGesturesUsed: new Set(),
      keyboardShortcutsUsed: new Set(),
      slideshowUsed: false,
      metadataToggled: false,
      shareActions: 0,
      deviceInfo: this.getDeviceInfo()
    };
  }

  private generateSessionId(): string {
    return `carousel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo() {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        screenWidth: 0,
        screenHeight: 0,
        orientation: 'landscape' as const,
        touchSupported: false
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;

    return {
      isMobile,
      isTablet,
      screenWidth: width,
      screenHeight: height,
      orientation: height > width ? 'portrait' as const : 'landscape' as const,
      touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };
  }

  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('carousel-image')) {
            this.processPerformanceEntry(entry);
          }
        });
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    // Process performance entries for carousel-specific measurements
    console.log('Performance entry:', entry);
  }

  /**
   * Track user interaction
   */
  trackInteraction(
    action: string,
    imageIndex: number,
    totalImages: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const interaction: CarouselInteraction = {
      action,
      timestamp: Date.now(),
      imageIndex,
      totalImages,
      isMobile: this.currentSession.deviceInfo.isMobile,
      metadata
    };

    this.interactions.push(interaction);
    this.currentSession.totalInteractions++;
    this.currentSession.imagesViewed.add(imageIndex);

    // Track specific interaction types
    this.trackSpecificInteraction(action, metadata);

    // Send to analytics service if configured
    this.sendToAnalyticsService(interaction);
  }

  private trackSpecificInteraction(action: string, metadata?: Record<string, any>): void {
    switch (action) {
      case 'zoom_in':
      case 'zoom_out':
      case 'zoom_reset':
        this.currentSession.totalZoomInteractions++;
        break;
      
      case 'touch_pinch':
      case 'touch_pan':
      case 'touch_swipe':
      case 'touch_double_tap':
        this.currentSession.touchGesturesUsed.add(action);
        break;
      
      case 'keyboard_arrow':
      case 'keyboard_space':
      case 'keyboard_escape':
      case 'keyboard_home':
      case 'keyboard_end':
        this.currentSession.keyboardShortcutsUsed.add(action);
        break;
      
      case 'slideshow_start':
      case 'slideshow_pause':
        this.currentSession.slideshowUsed = true;
        break;
      
      case 'metadata_toggle':
        this.currentSession.metadataToggled = true;
        break;
      
      case 'share_url':
      case 'copy_link':
        this.currentSession.shareActions++;
        break;
    }
  }

  /**
   * Track image load performance
   */
  trackImageLoadStart(imageIndex: number): void {
    if (!this.isEnabled) return;

    const metric: CarouselPerformanceMetric = {
      imageIndex,
      loadStartTime: Date.now()
    };

    this.performanceMetrics.set(imageIndex, metric);
    
    // Track image view start time
    this.imageViewStartTimes.set(imageIndex, Date.now());

    // Mark performance
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`carousel-image-${imageIndex}-load-start`);
    }
  }

  /**
   * Track image load completion
   */
  trackImageLoadEnd(imageIndex: number, imageSize?: number, cacheHit?: boolean): void {
    if (!this.isEnabled) return;

    const metric = this.performanceMetrics.get(imageIndex);
    if (!metric) return;

    const loadEndTime = Date.now();
    metric.loadEndTime = loadEndTime;
    metric.loadDuration = loadEndTime - metric.loadStartTime;
    metric.imageSize = imageSize;
    metric.cacheHit = cacheHit;

    this.performanceMetrics.set(imageIndex, metric);

    // Mark performance
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`carousel-image-${imageIndex}-load-end`);
      performance.measure(
        `carousel-image-${imageIndex}-load-duration`,
        `carousel-image-${imageIndex}-load-start`,
        `carousel-image-${imageIndex}-load-end`
      );
    }
  }

  /**
   * Track image load error
   */
  trackImageLoadError(imageIndex: number, error: string, retryCount?: number): void {
    if (!this.isEnabled) return;

    const metric = this.performanceMetrics.get(imageIndex) || {
      imageIndex,
      loadStartTime: Date.now()
    };

    metric.errorCount = (metric.errorCount || 0) + 1;
    metric.lastError = error;
    metric.retryCount = retryCount || 0;

    this.performanceMetrics.set(imageIndex, metric);
  }

  /**
   * Track image view duration
   */
  trackImageViewEnd(imageIndex: number): void {
    if (!this.isEnabled) return;

    const viewStartTime = this.imageViewStartTimes.get(imageIndex);
    if (viewStartTime) {
      const viewDuration = Date.now() - viewStartTime;
      this.trackInteraction('image_view_duration', imageIndex, 0, { 
        duration: viewDuration 
      });
      this.imageViewStartTimes.delete(imageIndex);
    }
  }

  /**
   * End current session
   */
  endSession(): void {
    this.currentSession.endTime = Date.now();
    
    // Calculate average view time
    const totalViewTime = Array.from(this.imageViewStartTimes.values())
      .reduce((sum, startTime) => sum + (Date.now() - startTime), 0);
    
    this.currentSession.averageViewTime = totalViewTime / Math.max(1, this.currentSession.imagesViewed.size);

    // Send session data to analytics
    this.sendSessionToAnalyticsService(this.currentSession);
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): CarouselUsageReport {
    const performanceValues = Array.from(this.performanceMetrics.values())
      .filter(m => m.loadDuration !== undefined);

    const loadTimes = performanceValues.map(m => m.loadDuration!);
    const errors = performanceValues.filter(m => m.errorCount && m.errorCount > 0);
    const cacheHits = performanceValues.filter(m => m.cacheHit === true);

    const interactionCounts = this.interactions.reduce((counts, interaction) => {
      counts[interaction.action] = (counts[interaction.action] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const popularInteractions = Object.entries(interactionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const touchGestureUsage = Array.from(this.currentSession.touchGesturesUsed)
      .reduce((usage, gesture) => {
        usage[gesture] = interactionCounts[gesture] || 0;
        return usage;
      }, {} as Record<string, number>);

    const keyboardUsage = Array.from(this.currentSession.keyboardShortcutsUsed)
      .reduce((usage, shortcut) => {
        usage[shortcut] = interactionCounts[shortcut] || 0;
        return usage;
      }, {} as Record<string, number>);

    return {
      totalSessions: 1, // This would be aggregated across multiple sessions
      averageSessionDuration: this.currentSession.endTime 
        ? this.currentSession.endTime - this.currentSession.startTime 
        : Date.now() - this.currentSession.startTime,
      averageImagesPerSession: this.currentSession.imagesViewed.size,
      mostViewedImageIndex: this.getMostViewedImageIndex(),
      popularInteractions,
      performanceMetrics: {
        averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0,
        slowestLoadTime: loadTimes.length > 0 ? Math.max(...loadTimes) : 0,
        fastestLoadTime: loadTimes.length > 0 ? Math.min(...loadTimes) : 0,
        errorRate: errors.length / Math.max(1, performanceValues.length),
        cacheHitRate: cacheHits.length / Math.max(1, performanceValues.length)
      },
      userExperienceMetrics: {
        mobileUsagePercentage: this.currentSession.deviceInfo.isMobile ? 100 : 0,
        touchGestureUsage,
        keyboardUsage,
        slideshowUsageRate: this.currentSession.slideshowUsed ? 100 : 0,
        metadataUsageRate: this.currentSession.metadataToggled ? 100 : 0
      }
    };
  }

  private getMostViewedImageIndex(): number {
    const imageCounts = this.interactions
      .filter(i => i.action === 'image_view' || i.action === 'navigate_to_image')
      .reduce((counts, interaction) => {
        counts[interaction.imageIndex] = (counts[interaction.imageIndex] || 0) + 1;
        return counts;
      }, {} as Record<number, number>);

    return Object.entries(imageCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] 
      ? parseInt(Object.entries(imageCounts).sort(([, a], [, b]) => b - a)[0][0])
      : 0;
  }

  /**
   * Send interaction to external analytics service
   */
  private sendToAnalyticsService(interaction: CarouselInteraction): void {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'carousel_interaction', {
        action: interaction.action,
        image_index: interaction.imageIndex,
        total_images: interaction.totalImages,
        zoom_level: interaction.zoomLevel,
        is_mobile: interaction.isMobile,
        custom_parameters: interaction.metadata
      });
    }

    // PostHog
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('carousel_interaction', {
        action: interaction.action,
        imageIndex: interaction.imageIndex,
        totalImages: interaction.totalImages,
        zoomLevel: interaction.zoomLevel,
        isMobile: interaction.isMobile,
        ...interaction.metadata
      });
    }

    // Custom analytics endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'carousel_interaction',
          data: interaction
        })
      }).catch(error => {
        console.warn('Failed to send analytics:', error);
      });
    }
  }

  /**
   * Send session data to analytics service
   */
  private sendSessionToAnalyticsService(session: CarouselSessionData): void {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'carousel_session_end', {
        session_id: session.sessionId,
        session_duration: session.endTime ? session.endTime - session.startTime : 0,
        total_interactions: session.totalInteractions,
        images_viewed: session.imagesViewed.size,
        average_view_time: session.averageViewTime,
        is_mobile: session.deviceInfo.isMobile
      });
    }
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear all stored data
   */
  clearData(): void {
    this.interactions = [];
    this.performanceMetrics.clear();
    this.imageViewStartTimes.clear();
    this.currentSession = this.initializeSession();
  }

  /**
   * Export data for debugging
   */
  exportData(): {
    interactions: CarouselInteraction[];
    performanceMetrics: Record<number, CarouselPerformanceMetric>;
    session: CarouselSessionData;
  } {
    return {
      interactions: [...this.interactions],
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      session: { ...this.currentSession }
    };
  }
}

// Global analytics instance (singleton)
let globalCarouselAnalytics: CarouselAnalytics | null = null;

/**
 * Get or create global analytics instance
 */
export function getCarouselAnalytics(): CarouselAnalytics {
  if (!globalCarouselAnalytics) {
    globalCarouselAnalytics = new CarouselAnalytics();
  }
  return globalCarouselAnalytics;
}

/**
 * Utility functions for common tracking scenarios
 */
export const CarouselTracker = {
  trackNavigation: (direction: 'previous' | 'next' | 'thumbnail', imageIndex: number, totalImages: number) => {
    getCarouselAnalytics().trackInteraction(`navigate_${direction}`, imageIndex, totalImages);
  },

  trackZoom: (action: 'in' | 'out' | 'reset', zoomLevel: number, imageIndex: number) => {
    getCarouselAnalytics().trackInteraction(`zoom_${action}`, imageIndex, 0, { zoomLevel });
  },

  trackSlideshow: (action: 'start' | 'pause' | 'speed_change', metadata?: Record<string, any>) => {
    getCarouselAnalytics().trackInteraction(`slideshow_${action}`, 0, 0, metadata);
  },

  trackTouch: (gesture: 'swipe' | 'pinch' | 'pan' | 'double_tap', imageIndex: number) => {
    getCarouselAnalytics().trackInteraction(`touch_${gesture}`, imageIndex, 0, { 
      touchSupported: 'ontouchstart' in window 
    });
  },

  trackKeyboard: (key: string, imageIndex: number) => {
    getCarouselAnalytics().trackInteraction('keyboard_shortcut', imageIndex, 0, { key });
  },

  trackShare: (method: 'copy' | 'native', imageIndex: number) => {
    getCarouselAnalytics().trackInteraction(`share_${method}`, imageIndex, 0);
  },

  trackError: (type: 'image_load' | 'component_error', imageIndex: number, error: string) => {
    getCarouselAnalytics().trackInteraction(`error_${type}`, imageIndex, 0, { error });
  }
};

export default CarouselAnalytics; 