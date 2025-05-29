'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Play } from 'lucide-react';

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
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>(defaultPipelineId || '');
  const [selectedLibrary, setSelectedLibrary] = useState<number>(defaultLibraryId || 0);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load pipelines and libraries on mount
  useEffect(() => {
    loadPipelines();
    loadLibraries();
  }, []);

  // Load images when library is selected
  useEffect(() => {
    if (selectedLibrary > 0) {
      loadImages(selectedLibrary);
    } else {
      setImages([]);
    }
  }, [selectedLibrary]);

  const loadPipelines = async () => {
    try {
      const response = await fetch('/api/pipelines');
      if (!response.ok) {
        throw new Error('Failed to load pipelines');
      }
      
      const data = await response.json();
      const pipelinesData = data.pipelines || [];
      setPipelines(pipelinesData);
    } catch (err) {
      console.error('Error loading pipelines:', err);
      setError('Failed to load pipelines');
    }
  };

  const loadLibraries = async () => {
    try {
      const response = await fetch('/api/libraries?format=flat');
      if (!response.ok) {
        throw new Error('Failed to load libraries');
      }
      
      const data = await response.json();
      const librariesData = data.libraries || [];
      // Convert string IDs back to numbers for the form
      const formattedLibraries = librariesData.map((lib: any) => ({
        ...lib,
        id: parseInt(lib.id),
      }));
      setLibraries(formattedLibraries);
    } catch (err) {
      console.error('Error loading libraries:', err);
      setError('Failed to load libraries');
    }
  };

  const loadImages = async (libraryId: number) => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      console.log(`Loading images for library ${libraryId}`);
      
      // First get library details to get the catalog_id
      const libraryResponse = await fetch(`/api/libraries/${libraryId}`);
      if (!libraryResponse.ok) {
        const errorData = await libraryResponse.json();
        throw new Error(`Failed to load library details: ${errorData.error || libraryResponse.statusText}`);
      }
      
      const libraryData = await libraryResponse.json();
      const library = libraryData.library;
      
      console.log('Library data:', library);
      
      if (!library) {
        throw new Error('Library not found');
      }
      
      if (!library.catalog_id) {
        throw new Error('Library does not have a catalog assigned');
      }
      
      console.log(`Loading images for library ${libraryId} in catalog ${library.catalog_id}`);
      
      // Now get images using the correct API with both libraryId and catalogId
      const imagesResponse = await fetch(`/api/images?libraryId=${libraryId}&catalogId=${library.catalog_id}&limit=100`);
      if (!imagesResponse.ok) {
        const errorData = await imagesResponse.json();
        throw new Error(`Failed to load images: ${errorData.error || imagesResponse.statusText}`);
      }
      
      const imagesData = await imagesResponse.json();
      const imagesList = imagesData.images || [];
      
      console.log(`Loaded ${imagesList.length} images`);
      setImages(imagesList);
    } catch (err) {
      console.error('Error loading images:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load images';
      setError(`Images loading error: ${errorMessage}`);
      setImages([]); // Clear images on error
    } finally {
      setLoading(false);
    }
  };

  const handleImageToggle = (imageId: string) => {
    setSelectedImageIds(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedImageIds.length === images.length) {
      setSelectedImageIds([]);
    } else {
      setSelectedImageIds(images.map(img => img.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        headers: {
          'Content-Type': 'application/json',
        },
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

      setSuccess(`Job submitted successfully! Job ID: ${result.jobId}`);
      setSelectedImageIds([]);
      
      if (onJobSubmitted) {
        onJobSubmitted(result.jobId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job');
    } finally {
      setLoading(false);
    }
  };

  const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);
  const selectedLibraryData = libraries.find(l => l.id === selectedLibrary);

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

          {/* Pipeline Selection */}
          <div className="space-y-2">
            <Label htmlFor="pipeline">Analysis Pipeline</Label>
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
              <SelectTrigger>
                <SelectValue placeholder="Select a pipeline..." />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    <div className="flex flex-col text-left w-full">
                      <span className="font-medium">{pipeline.name}</span>
                      {pipeline.description && (
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {pipeline.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPipelineData && selectedPipelineData.description && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedPipelineData.description}
                </p>
              </div>
            )}
          </div>

          {/* Library Selection */}
          <div className="space-y-2">
            <Label htmlFor="library">Image Library</Label>
            <Select 
              value={selectedLibrary.toString()} 
              onValueChange={(value) => setSelectedLibrary(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a library..." />
              </SelectTrigger>
              <SelectContent>
                {libraries.map((library) => (
                  <SelectItem key={library.id} value={library.id.toString()}>
                    <div className="flex flex-col">
                      <span>{library.name}</span>
                      {library.description && (
                        <span className="text-sm text-muted-foreground">
                          {library.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="flex items-center space-x-2 p-2 rounded border hover:bg-gray-50"
                    >
                      <Checkbox
                        id={image.id}
                        checked={selectedImageIds.includes(image.id)}
                        onCheckedChange={() => handleImageToggle(image.id)}
                      />
                      <Label
                        htmlFor={image.id}
                        className="text-sm cursor-pointer flex-1 truncate"
                      >
                        {image.metadata?.file_name || 
                         image.gcs_path.split('/').pop() || 
                         `Image ${image.id.slice(0, 8)}`}
                      </Label>
                    </div>
                  ))}
                  
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