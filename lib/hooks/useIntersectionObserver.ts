import { useEffect, useRef, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
  enabled?: boolean;
}

interface UseIntersectionObserverReturn {
  isIntersecting: boolean;
  wasIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [RefObject<Element | null>, UseIntersectionObserverReturn] {
  const {
    threshold = 0.1,
    root = null,
    rootMargin = '50px',
    triggerOnce = true,
    enabled = true
  } = options;

  const ref = useRef<Element>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [wasIntersecting, setWasIntersecting] = useState(false);

  useEffect(() => {
    if (!enabled || !ref.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const element = ref.current;
    let hasIntersected = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        const isCurrentlyIntersecting = entry.isIntersecting;
        
        setIsIntersecting(isCurrentlyIntersecting);
        
        if (isCurrentlyIntersecting && !hasIntersected) {
          setWasIntersecting(true);
          hasIntersected = true;
          
          if (triggerOnce) {
            observer.unobserve(element);
          }
        }
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, triggerOnce, enabled]);

  return [
    ref,
    {
      isIntersecting,
      wasIntersecting,
      entry,
    },
  ];
}

// Hook for preloading images when they're about to enter viewport
export function useImagePreloader(
  imageSrc: string,
  options: UseIntersectionObserverOptions = {}
) {
  const [imageRef, { wasIntersecting }] = useIntersectionObserver({
    rootMargin: '200px', // Start loading 200px before element enters viewport
    ...options,
  });
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wasIntersecting || !imageSrc || isLoaded || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setError('Failed to load image');
      setIsLoading(false);
    };
    
    img.src = imageSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [wasIntersecting, imageSrc, isLoaded, isLoading]);

  return {
    imageRef,
    isLoaded,
    isLoading,
    error,
    shouldLoad: wasIntersecting,
  };
}

// Hook for batch preloading multiple images
export function useBatchImagePreloader(
  imageSrcs: string[],
  batchSize: number = 3
) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [currentBatch, setCurrentBatch] = useState(0);

  const startPreloading = (startIndex: number = 0) => {
    const batch = imageSrcs.slice(startIndex, startIndex + batchSize);
    
    batch.forEach((src) => {
      if (loadedImages.has(src) || loadingImages.has(src)) {
        return;
      }

      setLoadingImages(prev => new Set(prev).add(src));

      const img = new Image();
      
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
      };
      
      img.onerror = () => {
        setErrors(prev => new Map(prev).set(src, 'Failed to load'));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
      };
      
      img.src = src;
    });
  };

  const preloadNext = () => {
    const nextBatchStart = (currentBatch + 1) * batchSize;
    if (nextBatchStart < imageSrcs.length) {
      setCurrentBatch(prev => prev + 1);
      startPreloading(nextBatchStart);
    }
  };

  return {
    loadedImages,
    loadingImages,
    errors,
    startPreloading,
    preloadNext,
    isImageLoaded: (src: string) => loadedImages.has(src),
    isImageLoading: (src: string) => loadingImages.has(src),
    getImageError: (src: string) => errors.get(src),
  };
} 