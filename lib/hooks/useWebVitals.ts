// Core Web Vitals Monitoring Hook
// Sprint 14: Performance monitoring and validation

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Metric } from 'web-vitals';

// Core Web Vitals metrics interface
export interface WebVitalsMetrics {
  // Core Web Vitals
  LCP: number | null; // Largest Contentful Paint
  FID: number | null; // First Input Delay
  CLS: number | null; // Cumulative Layout Shift
  
  // Additional metrics
  FCP: number | null; // First Contentful Paint
  TTFB: number | null; // Time to First Byte
  INP: number | null; // Interaction to Next Paint (new metric)
  
  // Custom metrics
  imageLoadTime: number | null;
  apiResponseTime: number | null;
  carouselLoadTime: number | null;
  
  // Performance grades
  performanceGrade: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface UseWebVitalsOptions {
  reportToAnalytics?: boolean;
  debugMode?: boolean;
  trackCustomMetrics?: boolean;
}

export function useWebVitals(options: UseWebVitalsOptions = {}) {
  const { reportToAnalytics = false, debugMode = false, trackCustomMetrics = true } = options;
  
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({
    LCP: null,
    FID: null,
    CLS: null,
    FCP: null,
    TTFB: null,
    INP: null,
    imageLoadTime: null,
    apiResponseTime: null,
    carouselLoadTime: null,
    performanceGrade: 'good',
    timestamp: Date.now()
  });

  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<WebVitalsMetrics[]>([]);
  const metricsRef = useRef<Partial<WebVitalsMetrics>>({});

  // Initialize Web Vitals monitoring
  useEffect(() => {
    let webVitalsScript: HTMLScriptElement | null = null;

    const initWebVitals = async () => {
      try {
        // Dynamic import of web-vitals library
        const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

        // Track Core Web Vitals
        onCLS((metric: Metric) => {
          metricsRef.current.CLS = metric.value;
          updateMetrics({ CLS: metric.value });
          if (debugMode) console.log('CLS:', metric.value);
        });

        // Note: FID is deprecated in v5, replaced by INP
        onINP((metric: Metric) => {
          metricsRef.current.INP = metric.value;
          // Also set FID for backward compatibility
          metricsRef.current.FID = metric.value;
          updateMetrics({ INP: metric.value, FID: metric.value });
          if (debugMode) console.log('INP:', metric.value);
        });

        onFCP((metric: Metric) => {
          metricsRef.current.FCP = metric.value;
          updateMetrics({ FCP: metric.value });
          if (debugMode) console.log('FCP:', metric.value);
        });

        onLCP((metric: Metric) => {
          metricsRef.current.LCP = metric.value;
          updateMetrics({ LCP: metric.value });
          if (debugMode) console.log('LCP:', metric.value);
        });

        onTTFB((metric: Metric) => {
          metricsRef.current.TTFB = metric.value;
          updateMetrics({ TTFB: metric.value });
          if (debugMode) console.log('TTFB:', metric.value);
        });

        // Track Interaction to Next Paint (if available)
        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === 'event') {
                  const inp = (entry as any).processingStart - entry.startTime;
                  metricsRef.current.INP = inp;
                  updateMetrics({ INP: inp });
                  if (debugMode) console.log('INP:', inp);
                }
              }
            });
            observer.observe({ entryTypes: ['event'] });
          } catch (e) {
            console.warn('INP monitoring not supported:', e);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize Web Vitals:', error);
        setIsLoading(false);
      }
    };

    initWebVitals();

    return () => {
      if (webVitalsScript) {
        document.head.removeChild(webVitalsScript);
      }
    };
  }, [debugMode]);

  // Track custom performance metrics
  useEffect(() => {
    if (!trackCustomMetrics) return;

    // Image loading performance
    const trackImagePerformance = () => {
      const imageEntries = performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('image') || entry.name.includes('.jpg') || entry.name.includes('.png') || entry.name.includes('.webp'));
      
      if (imageEntries.length > 0) {
        const avgImageTime = imageEntries.reduce((sum, entry) => sum + entry.duration, 0) / imageEntries.length;
        metricsRef.current.imageLoadTime = avgImageTime;
        updateMetrics({ imageLoadTime: avgImageTime });
        if (debugMode) console.log('Avg Image Load Time:', avgImageTime);
      }
    };

    // API response time tracking
    const trackApiPerformance = () => {
      const apiEntries = performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/api/'));
      
      if (apiEntries.length > 0) {
        const avgApiTime = apiEntries.reduce((sum, entry) => sum + entry.duration, 0) / apiEntries.length;
        metricsRef.current.apiResponseTime = avgApiTime;
        updateMetrics({ apiResponseTime: avgApiTime });
        if (debugMode) console.log('Avg API Response Time:', avgApiTime);
      }
    };

    // Track performance periodically
    const interval = setInterval(() => {
      trackImagePerformance();
      trackApiPerformance();
    }, 5000);

    return () => clearInterval(interval);
  }, [trackCustomMetrics, debugMode]);

  // Update metrics and calculate performance grade
  const updateMetrics = (newMetrics: Partial<WebVitalsMetrics>) => {
    setMetrics(current => {
      const updated = { ...current, ...newMetrics, timestamp: Date.now() };
      
      // Calculate performance grade based on Core Web Vitals thresholds
      const grade = calculatePerformanceGrade(updated);
      updated.performanceGrade = grade;
      
      // Store in history
      setHistory(prev => [...prev.slice(-9), updated]); // Keep last 10 entries
      
      // Report to analytics if enabled
      if (reportToAnalytics && newMetrics.LCP && newMetrics.FID && newMetrics.CLS) {
        reportMetrics(updated);
      }
      
      return updated;
    });
  };

  // Calculate performance grade based on Google's Core Web Vitals thresholds
  const calculatePerformanceGrade = (metrics: WebVitalsMetrics): 'excellent' | 'good' | 'needs-improvement' | 'poor' => {
    const { LCP, FID, CLS } = metrics;
    
    if (!LCP || !FID || CLS === null) return 'good';
    
    // Google's thresholds
    const lcpGood = LCP <= 2500;
    const fidGood = FID <= 100;
    const clsGood = CLS <= 0.1;
    
    const lcpExcellent = LCP <= 1200;
    const fidExcellent = FID <= 50;
    const clsExcellent = CLS <= 0.05;
    
    const lcpPoor = LCP > 4000;
    const fidPoor = FID > 300;
    const clsPoor = CLS > 0.25;
    
    // Excellent: All metrics excellent
    if (lcpExcellent && fidExcellent && clsExcellent) return 'excellent';
    
    // Poor: Any metric poor
    if (lcpPoor || fidPoor || clsPoor) return 'poor';
    
    // Good: All metrics good
    if (lcpGood && fidGood && clsGood) return 'good';
    
    // Needs improvement: Some metrics not good
    return 'needs-improvement';
  };

  // Report metrics to analytics
  const reportMetrics = async (metrics: WebVitalsMetrics) => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'web-vitals',
          metrics,
          url: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to report Web Vitals:', error);
    }
  };

  // Manual metric tracking functions
  const trackCustomMetric = (name: string, value: number) => {
    const customKey = name as keyof WebVitalsMetrics;
    updateMetrics({ [customKey]: value } as Partial<WebVitalsMetrics>);
  };

  const trackCarouselLoad = (loadTime: number) => {
    metricsRef.current.carouselLoadTime = loadTime;
    updateMetrics({ carouselLoadTime: loadTime });
    if (debugMode) console.log('Carousel Load Time:', loadTime);
  };

  // Performance recommendations
  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];
    
    if (metrics.LCP && metrics.LCP > 2500) {
      recommendations.push('Optimize Largest Contentful Paint: Consider image optimization, preloading, or CDN usage');
    }
    
    if (metrics.FID && metrics.FID > 100) {
      recommendations.push('Improve First Input Delay: Reduce JavaScript execution time or use code splitting');
    }
    
    if (metrics.CLS && metrics.CLS > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift: Set explicit dimensions for images and ads');
    }
    
    if (metrics.imageLoadTime && metrics.imageLoadTime > 1000) {
      recommendations.push('Optimize image loading: Use modern formats (WebP/AVIF) and appropriate sizing');
    }
    
    if (metrics.apiResponseTime && metrics.apiResponseTime > 500) {
      recommendations.push('Improve API performance: Consider caching, database optimization, or CDN');
    }
    
    return recommendations;
  };

  return {
    metrics,
    isLoading,
    history,
    trackCustomMetric,
    trackCarouselLoad,
    getRecommendations,
    
    // Utility methods
    isGoodPerformance: metrics.performanceGrade === 'excellent' || metrics.performanceGrade === 'good',
    needsImprovement: metrics.performanceGrade === 'needs-improvement' || metrics.performanceGrade === 'poor'
  };
} 