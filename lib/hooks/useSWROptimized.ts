import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { useCallback, useRef, useEffect } from 'react';

// Enhanced fetcher with error handling and performance monitoring
interface FetcherOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  onPerformanceMetric?: (metrics: {
    url: string;
    duration: number;
    size?: number;
    cached: boolean;
  }) => void;
}

export function createOptimizedFetcher(options: FetcherOptions = {}) {
  const {
    timeout = 10000,
    retryCount = 3,
    retryDelay = 1000,
    onPerformanceMetric
  } = options;

  return async function optimizedFetcher(url: string): Promise<any> {
    const startTime = performance.now();
    let attempt = 0;
    let lastError: Error | null = null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      while (attempt < retryCount) {
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              // Add cache control headers
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          const duration = performance.now() - startTime;
          
          // Report performance metrics
          onPerformanceMetric?.({
            url,
            duration,
            size: response.headers.get('content-length') 
              ? parseInt(response.headers.get('content-length')!, 10) 
              : undefined,
            cached: response.headers.get('cache-control')?.includes('max-age') || false,
          });

          return data;
        } catch (error) {
          lastError = error as Error;
          attempt++;
          
          if (attempt < retryCount) {
            // Exponential backoff
            await new Promise(resolve => 
              setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
            );
          }
        }
      }

      throw lastError || new Error('Max retries exceeded');
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

// Default optimized fetcher instance
export const defaultFetcher = createOptimizedFetcher({
  onPerformanceMetric: (metrics) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Performance:', metrics);
    }
  },
});

// Enhanced SWR hook with optimizations
interface UseSWROptimizedOptions extends SWRConfiguration {
  enabled?: boolean;
  prefetch?: boolean;
  dedupe?: boolean;
  background?: boolean;
}

export function useSWROptimized<Data = any, Error = any>(
  key: string | null,
  fetcher?: (key: string) => Promise<Data>,
  options: UseSWROptimizedOptions = {}
): SWRResponse<Data, Error> & {
  prefetch: () => void;
  invalidate: () => void;
} {
  const {
    enabled = true,
    prefetch = false,
    dedupe = true,
    background = true,
    ...swrOptions
  } = options;

  // Enhanced SWR configuration
  const enhancedConfig: SWRConfiguration = {
    fetcher: fetcher || defaultFetcher,
    dedupingInterval: dedupe ? 2000 : 0,
    focusThrottleInterval: 5000,
    revalidateOnFocus: background,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    // Enhanced cache configuration
    compare: (a: Data, b: Data) => {
      return JSON.stringify(a) === JSON.stringify(b);
    },
    ...swrOptions,
  };

  // Conditional key for enabling/disabling
  const conditionalKey = enabled ? key : null;

  const response = useSWR<Data, Error>(conditionalKey, enhancedConfig);

  // Prefetch functionality
  const prefetchRef = useRef<boolean>(false);
  
  const prefetchData = useCallback(() => {
    if (key && !prefetchRef.current && typeof window !== 'undefined') {
      prefetchRef.current = true;
      // Use requestIdleCallback for better performance
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          response.mutate();
        });
      } else {
        setTimeout(() => {
          response.mutate();
        }, 0);
      }
    }
  }, [key, response]);

  // Auto-prefetch if enabled
  useEffect(() => {
    if (prefetch) {
      prefetchData();
    }
  }, [prefetch, prefetchData]);

  // Manual invalidation
  const invalidate = useCallback(() => {
    response.mutate();
  }, [response]);

  return {
    ...response,
    prefetch: prefetchData,
    invalidate,
  };
}

// Specific hooks for common API patterns

// Hook for paginated data with infinite loading
export function usePaginatedSWR<T>(
  baseKey: string,
  pageSize: number = 20,
  options: UseSWROptimizedOptions = {}
) {
  const getKey = (pageIndex: number, previousPageData: T[] | null) => {
    if (previousPageData && !previousPageData.length) return null;
    return `${baseKey}?page=${pageIndex}&limit=${pageSize}`;
  };

  // This would typically use useSWRInfinite from SWR
  // For now, return a basic implementation
  return useSWROptimized(
    `${baseKey}?page=0&limit=${pageSize}`,
    undefined,
    options
  );
}

// Hook for real-time data with subscription
export function useRealtimeSWR<T>(
  key: string | null,
  fetcher?: (key: string) => Promise<T>,
  options: UseSWROptimizedOptions & {
    realtimeInterval?: number;
  } = {}
) {
  const { realtimeInterval = 5000, ...restOptions } = options;

  return useSWROptimized(key, fetcher, {
    refreshInterval: realtimeInterval,
    revalidateOnFocus: true,
    ...restOptions,
  });
}

// Hook with optimistic updates
export function useOptimisticSWR<T>(
  key: string | null,
  fetcher?: (key: string) => Promise<T>,
  options: UseSWROptimizedOptions = {}
) {
  const response = useSWROptimized(key, fetcher, options);

  const optimisticUpdate = useCallback(
    async (updateFn: (data: T) => T, apiCall: () => Promise<T>) => {
      if (!response.data) return;

      // Optimistic update
      const optimisticData = updateFn(response.data);
      response.mutate(optimisticData, false);

      try {
        // Actual API call
        const newData = await apiCall();
        response.mutate(newData, false);
      } catch (error) {
        // Revert on error
        response.mutate();
        throw error;
      }
    },
    [response]
  );

  return {
    ...response,
    optimisticUpdate,
  };
}

// Performance monitoring hook
export function useSWRPerformance() {
  const metricsRef = useRef<Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    errors: number;
  }>>(new Map());

  const trackMetric = useCallback((url: string, duration: number, error?: boolean) => {
    const current = metricsRef.current.get(url) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      errors: 0,
    };

    const updated = {
      count: current.count + 1,
      totalTime: current.totalTime + duration,
      avgTime: 0,
      errors: current.errors + (error ? 1 : 0),
    };
    
    updated.avgTime = updated.totalTime / updated.count;
    metricsRef.current.set(url, updated);
  }, []);

  const getMetrics = useCallback(() => {
    return Object.fromEntries(metricsRef.current);
  }, []);

  const clearMetrics = useCallback(() => {
    metricsRef.current.clear();
  }, []);

  return {
    trackMetric,
    getMetrics,
    clearMetrics,
  };
} 