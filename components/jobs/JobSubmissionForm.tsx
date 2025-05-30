'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { notificationService } from '@/lib/services/notificationService';

interface Pipeline {
  id: string;
  name: string;
  description: string;
  library_id: number | null;
}

interface Library {
  id: number;
  name: string;
  description: string;
}

interface Image {
  id: string;
  gcs_path: string;
  metadata: any;
  signedUrls?: {
    thumbnail?: string;
    original?: string;
  };
}

interface JobSubmissionFormProps {
  onJobSubmitted?: (jobId: string) => void;
  defaultLibraryId?: number;
  defaultPipelineId?: string;
}

export default function JobSubmissionForm({ 
  onJobSubmitted, 
  defaultLibraryId, 
  defaultPipelineId 
}: JobSubmissionFormProps) {
  // State management
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [selectedLibrary, setSelectedLibrary] = useState<number>(0);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const router = useRouter();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load pipelines
        const pipelineRes = await fetch('/api/pipelines');
        if (pipelineRes.ok) {
          const pipelineData = await pipelineRes.json();
          setPipelines(pipelineData.pipelines || []);
        }

        // Load libraries
        const libraryRes = await fetch('/api/libraries?format=flat');
        if (libraryRes.ok) {
          const libraryData = await libraryRes.json();
          setLibraries(libraryData.libraries?.map((lib: any) => ({
            ...lib,
            id: parseInt(lib.id),
          })) || []);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      }
    };

    loadData();
  }, []);

  // Set defaults
  useEffect(() => {
    if (defaultPipelineId && pipelines.length > 0 && !selectedPipeline) {
      setSelectedPipeline(defaultPipelineId);
    }
  }, [defaultPipelineId, pipelines.length, selectedPipeline]);

  useEffect(() => {
    if (defaultLibraryId && libraries.length > 0 && !selectedLibrary) {
      setSelectedLibrary(defaultLibraryId);
    }
  }, [defaultLibraryId, libraries.length, selectedLibrary]);

  // Load images when library changes
  useEffect(() => {
    if (selectedLibrary <= 0) {
      setImages([]);
      setSelectedImageIds([]);
      return;
    }

    const loadImages = async () => {
      try {
        setLoading(true);
        setError('');
        
        const libraryRes = await fetch(`/api/libraries/${selectedLibrary}`);
        if (!libraryRes.ok) throw new Error('Failed to load library');
        
        const libraryData = await libraryRes.json();
        const library = libraryData.library;
        
        if (!library?.catalog_id) {
          throw new Error('Library has no catalog');
        }
        
        const imagesRes = await fetch(
          `/api/images?libraryId=${selectedLibrary}&catalogId=${library.catalog_id}&limit=100`
        );
        if (!imagesRes.ok) throw new Error('Failed to load images');
        
        const imagesData = await imagesRes.json();
        setImages(imagesData.images || []);
        setSelectedImageIds([]);
      } catch (err) {
        console.error('Error loading images:', err);
        setError(err instanceof Error ? err.message : 'Failed to load images');
        setImages([]);
        setSelectedImageIds([]);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [selectedLibrary]);

  // Event handlers
  const handlePipelineChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPipeline(e.target.value);
  }, []);

  const handleLibraryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLibrary(parseInt(e.target.value) || 0);
  }, []);

  const handleImageToggle = useCallback((imageId: string) => {
    setSelectedImageIds(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedImageIds(prev => {
      if (prev.length === images.length) {
        return [];
      } else {
        return images.map(img => img.id);
      }
    });
  }, [images]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPipeline || !selectedLibrary || selectedImageIds.length === 0) {
      setError('Please select a pipeline, library, and at least one image');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/jobs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId: selectedPipeline,
          libraryId: selectedLibrary,
          imageIds: selectedImageIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit job');
      }

      // Get pipeline name for better UX
      const pipelineName = pipelines.find(p => p.id === selectedPipeline)?.name || 'Analysis Pipeline';
      
      // Show toast notification
      notificationService.show({
        type: 'success',
        title: 'Job Submitted Successfully!',
        description: `${pipelineName} job started with ${selectedImageIds.length} images`,
        duration: 6000,
        action: {
          label: 'View Progress',
          onClick: () => {
            router.push('/analysis?tab=monitor&job=' + result.jobId);
          }
        }
      });

      // Register notification in notification center
      notificationService.show({
        type: 'info',
        title: 'AI Analysis Job Started',
        description: `Job ${result.jobId.slice(0, 8)} processing ${selectedImageIds.length} images with ${pipelineName}`,
        data: {
          jobId: result.jobId,
          pipelineName,
          imageCount: selectedImageIds.length,
          libraryId: selectedLibrary
        }
      });

      setSuccess(`Job submitted successfully! Job ID: ${result.jobId}`);
      setSelectedImageIds([]);
      
      // Navigate to Monitor Jobs view after a short delay to show the success message
      setTimeout(() => {
        router.push('/analysis?tab=monitor&job=' + result.jobId);
      }, 1500);
      
      onJobSubmitted?.(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job');
      
      // Show error toast
      notificationService.show({
        type: 'error',
        title: 'Job Submission Failed',
        description: err instanceof Error ? err.message : 'Failed to submit job',
        duration: 8000
      });
    } finally {
      setLoading(false);
    }
  }, [selectedPipeline, selectedLibrary, selectedImageIds, onJobSubmitted, pipelines, router]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Submit Analysis Job
        </CardTitle>
        <CardDescription>
          Select a pipeline, library, and images to process with AI analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Pipeline Selection - Native Select */}
          <div className="space-y-2">
            <Label htmlFor="pipeline">Analysis Pipeline</Label>
            <select
              id="pipeline"
              value={selectedPipeline}
              onChange={handlePipelineChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a pipeline...</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
            
            {/* Pipeline Description */}
            {selectedPipeline && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {pipelines.find(p => p.id === selectedPipeline)?.description}
              </div>
            )}
          </div>

          {/* Library Selection - Native Select */}
          <div className="space-y-2">
            <Label htmlFor="library">Image Library</Label>
            <select
              id="library"
              value={selectedLibrary > 0 ? selectedLibrary.toString() : ''}
              onChange={handleLibraryChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a library...</option>
              {libraries.map((library) => (
                <option key={library.id} value={library.id.toString()}>
                  {library.name}
                </option>
              ))}
            </select>
            
            {/* Library Description */}
            {selectedLibrary > 0 && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {libraries.find(l => l.id === selectedLibrary)?.description}
              </div>
            )}
          </div>

          {/* Image Selection */}
          {selectedLibrary > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Images to Process</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {selectedImageIds.length} of {images.length} selected
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedImageIds.length === images.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading images...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                  {images.map((image) => {
                    const isSelected = selectedImageIds.includes(image.id);
                    const thumbnailUrl = image.signedUrls?.thumbnail || image.signedUrls?.original;
                    const filename = image.metadata?.file_name || 
                                   image.gcs_path.split('/').pop() || 
                                   `Image ${image.id.slice(0, 8)}`;

                    return (
                      <div
                        key={image.id}
                        className={`relative group cursor-pointer rounded-lg border-2 transition-all duration-200 hover:border-primary/50 ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted hover:border-border'
                        }`}
                        onClick={() => handleImageToggle(image.id)}
                      >
                        {/* Thumbnail Image */}
                        <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={filename}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              title={filename}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Im0xNSAxM2MwIDEuMTA1LS44OTUgMi0yIDJzLTItLjg5NS0yLTJjMC0xLjEwNS44OTUtMiAyLTJzMiAuODk1IDIgMnoiIGZpbGw9IiM5Y2EzYWYiLz4KPHBhdGggZD0ibTYgMTBjMCAxLjEwNS0uODk1IDItMiAycy0yLS44OTUtMi0yYzAtMS4xMDUuODk1LTIgMi0yczIgLjg5NSAyIDJ6IiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Im0xOCAxMGMwIDEuMTA1LS44OTUgMi0yIDJzLTItLjg5NS0yLTJjMC0xLjEwNS44OTUtMiAyLTJzMiAuODk1IDIgMnoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+';
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-muted">
                              <div className="text-muted-foreground text-xs text-center p-2">
                                No preview
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Native Checkbox Overlay */}
                        <div className="absolute top-2 left-2">
                          <label className="cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleImageToggle(image.id)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shadow-sm ${
                              isSelected 
                                ? 'bg-primary border-primary text-primary-foreground' 
                                : 'bg-white/90 border-gray-300 hover:border-gray-400'
                            }`}>
                              {isSelected && (
                                <svg 
                                  className="w-3 h-3 text-white" 
                                  fill="currentColor" 
                                  viewBox="0 0 20 20"
                                >
                                  <path 
                                    fillRule="evenodd" 
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                    clipRule="evenodd" 
                                  />
                                </svg>
                              )}
                            </div>
                          </label>
                        </div>
                        
                        {/* Selection Overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-1">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {images.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No images found in this library
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !selectedPipeline || !selectedLibrary || selectedImageIds.length === 0}
              className="min-w-32"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Submit Job
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 