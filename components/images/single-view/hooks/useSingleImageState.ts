'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { 
  UseSingleImageStateProps, 
  UseSingleImageStateReturn, 
  ImageData, 
  ActionResult 
} from '../types';

/**
 * Custom hook for managing single image view state
 * Handles data fetching, actions, and navigation
 */
export function useSingleImageState({
  libraryId: providedLibraryId,
  imageId,
  refreshInterval
}: UseSingleImageStateProps): UseSingleImageStateReturn {
  const router = useRouter();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Core state
  const [image, setImage] = useState<ImageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [derivedLibraryId, setDerivedLibraryId] = useState<string | null>(null);
  
  // Get the effective library ID (provided or derived)
  const effectiveLibraryId = providedLibraryId || derivedLibraryId;
  
  // Action loading states
  const [loadingStates, setLoadingStates] = useState({
    keywords: false,
    description: false,
    analysis: false,
    download: false,
    delete: false
  });
  
  // Generated content state
  const [generatedContent, setGeneratedContent] = useState({
    keywords: [] as string[],
    description: '',
    analysisResults: [] as any[]
  });
  
  // Helper to update specific loading state
  const setLoadingState = useCallback((action: keyof typeof loadingStates, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [action]: loading }));
  }, []);
  
  // Fetch image data
  const fetchImage = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/images/${imageId}?signed=true`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch image');
      }
      
      const data = await response.json();
      
      // Check if we have the expected data structure
      if (!data.image) {
        throw new Error('Invalid response format: missing image data');
      }
      
      // Transform API response to match our ImageData interface
      const imageData: ImageData = {
        id: data.image.id,
        gcs_path: data.image.gcs_path,
        library_id: data.image.library_id || data.image.library?.id,
        metadata: data.image.metadata,
        created_at: data.image.created_at,
        signedUrls: {
          original: data.signedUrl,
          thumbnail: data.thumbnailSignedUrl || undefined
        },
        library: data.image.library ? {
          id: data.image.library.id,
          name: data.image.library.name,
          catalog_id: data.image.library.catalog_id
        } : undefined
      };
      
      setImage(imageData);
      
      // Derive library ID if not provided
      if (!providedLibraryId && imageData.library_id) {
        setDerivedLibraryId(imageData.library_id.toString());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [imageId, providedLibraryId]);
  
  // Refresh function (public API)
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await fetchImage();
  }, [fetchImage]);
  
  // Generate keywords action
  const generateKeywords = useCallback(async (): Promise<void> => {
    if (!image) return;
    
    setLoadingState('keywords', true);
    try {
      // TODO: Implement keyword generation API call
      // This would integrate with your AI/ML services
      const response = await fetch(`/api/images/${imageId}/keywords`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(prev => ({
          ...prev,
          keywords: data.keywords || []
        }));
        toast.success('Keywords generated successfully');
      } else {
        throw new Error('Failed to generate keywords');
      }
    } catch (err) {
      toast.error('Failed to generate keywords');
    } finally {
      setLoadingState('keywords', false);
    }
  }, [image, imageId, setLoadingState]);
  
  // Generate description action
  const generateDescription = useCallback(async (): Promise<void> => {
    if (!image) return;
    
    setLoadingState('description', true);
    try {
      // TODO: Implement description generation API call
      // This would integrate with vision models or VLLM
      const response = await fetch(`/api/images/${imageId}/description`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(prev => ({
          ...prev,
          description: data.description || ''
        }));
        toast.success('Description generated successfully');
      } else {
        throw new Error('Failed to generate description');
      }
    } catch (err) {
      toast.error('Failed to generate description');
    } finally {
      setLoadingState('description', false);
    }
  }, [image, imageId, setLoadingState]);
  
  // Start analysis action
  const startAnalysis = useCallback(async (): Promise<void> => {
    if (!image) return;
    
    setLoadingState('analysis', true);
    try {
      // TODO: Implement analysis pipeline trigger
      // This would create a new job for analyzing this specific image
      const response = await fetch(`/api/images/${imageId}/analyze`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(prev => ({
          ...prev,
          analysisResults: [...prev.analysisResults, data.result]
        }));
        toast.success('Analysis started successfully');
      } else {
        throw new Error('Failed to start analysis');
      }
    } catch (err) {
      toast.error('Failed to start analysis');
    } finally {
      setLoadingState('analysis', false);
    }
  }, [image, imageId, setLoadingState]);
  
  // Download image action
  const downloadImage = useCallback(async (): Promise<void> => {
    if (!image?.signedUrls?.original) {
      toast.error('Download URL not available');
      return;
    }
    
    setLoadingState('download', true);
    try {
      const response = await fetch(image.signedUrls.original);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.metadata.original_filename || `image-${image.id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (err) {
      toast.error('Failed to download image');
    } finally {
      setLoadingState('download', false);
    }
  }, [image, setLoadingState]);
  
  // Delete image action
  const deleteImage = useCallback(async (): Promise<void> => {
    if (!image) return;
    
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }
    
    setLoadingState('delete', true);
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Image deleted successfully');
        // Navigate back to library after successful deletion
        goToLibrary();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete image');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete image';
      toast.error(errorMessage);
    } finally {
      setLoadingState('delete', false);
    }
  }, [image, imageId, setLoadingState]);
  
  // Navigation helpers
  const goToLibrary = useCallback(() => {
    if (effectiveLibraryId) {
      router.push(`/libraries/${effectiveLibraryId}`);
    } else {
      toast.error('Library information not available');
    }
  }, [router, effectiveLibraryId]);
  
  const goToCarousel = useCallback(() => {
    if (effectiveLibraryId) {
      router.push(`/libraries/${effectiveLibraryId}?image=${imageId}&view=carousel`);
    } else {
      toast.error('Library information not available');
    }
  }, [router, effectiveLibraryId, imageId]);
  
  // Initial data fetch
  useEffect(() => {
    fetchImage();
  }, [fetchImage]);
  
  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchImage();
      }, refreshInterval * 1000);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval, fetchImage]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);
  
  return {
    // Core data
    image,
    error,
    
    // Loading states
    isLoading,
    loadingStates,
    
    // Generated content
    generatedContent,
    
    // Actions
    refresh,
    generateKeywords,
    generateDescription,
    startAnalysis,
    downloadImage,
    deleteImage,
    
    // Navigation helpers
    goToLibrary,
    goToCarousel
  };
} 