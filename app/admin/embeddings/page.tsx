'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, CheckCircle, XCircle, Database } from 'lucide-react';

interface EmbeddingStats {
  processed: number;
  success: number;
  errors: number;
}

interface BatchResults {
  catalogs: EmbeddingStats;
  libraries: EmbeddingStats;
  images: EmbeddingStats;
  job_results: EmbeddingStats;
}

export default function EmbeddingsAdminPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BatchResults | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const generateEmbeddings = async (contentTypes: string[], force?: boolean) => {
    setLoading(true);
    setProgress(0);
    setResults(null);
    setCurrentStep('Starting embedding generation...');

    try {
      const response = await fetch('/api/embeddings/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content_types: contentTypes,
          force_regenerate: force
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResults(data.details);
        setProgress(100);
        setCurrentStep('Completed successfully!');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Embedding generation failed:', error);
      setCurrentStep(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const generateEmbeddingsForImages = async () => {
    setLoading(true);
    setProgress(0);
    setResults(null);
    setCurrentStep('Processing images only...');

    try {
      // Process images individually to show progress
      const response = await fetch('/api/embeddings/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content_types: ['image'],
          batch_size: 20
        })
      });

      const data = await response.json();
      setResults(data.results);
      setProgress(100);
      setCurrentStep('Image embeddings completed!');
    } catch (error) {
      setCurrentStep(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStats = (label: string, stats: EmbeddingStats) => {
    const successRate = stats.processed > 0 ? Math.round((stats.success / stats.processed) * 100) : 0;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{label}</span>
          <Badge variant={stats.errors > 0 ? "destructive" : "default"}>
            {successRate}% success
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="font-semibold">{stats.processed}</div>
            <div className="text-muted-foreground">Processed</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">{stats.success}</div>
            <div className="text-muted-foreground">Success</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-red-600">{stats.errors}</div>
            <div className="text-muted-foreground">Errors</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Embedding Generation</h1>
          <p className="text-muted-foreground">
            Generate Cohere V4 embeddings for existing content to enable semantic search.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Content Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">5</div>
                  <div className="text-muted-foreground">Catalogs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">6</div>
                  <div className="text-muted-foreground">Libraries</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">104</div>
                  <div className="text-muted-foreground">Images</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">507</div>
                  <div className="text-muted-foreground">Job Results</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-amber-800 text-sm">
                  <strong>Note:</strong> Currently, no embeddings exist for any content. 
                  Generate embeddings to enable semantic search functionality.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Embeddings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Button
                  onClick={() => generateEmbeddings(['catalog', 'library'])}
                  disabled={loading}
                  className="justify-start"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Generate Text Embeddings (Catalogs + Libraries)
                </Button>
                
                <Button
                  onClick={generateEmbeddingsForImages}
                  disabled={loading}
                  variant="outline"
                  className="justify-start"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Generate Image Embeddings (First 20 Images)
                </Button>
                
                <Button
                  onClick={() => generateEmbeddings(['job_result'])}
                  disabled={loading}
                  variant="outline"
                  className="justify-start"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Generate Job Result Embeddings (First 50)
                </Button>
                
                <Button
                  onClick={() => generateEmbeddings(['catalog', 'library', 'image', 'job_result'])}
                  disabled={loading}
                  variant="default"
                  className="justify-start"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Generate All Embeddings (Full Batch)
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 text-amber-700">🔄 Force Regenerate (All Content)</h4>
                <div className="grid gap-3">
                  <Button
                    onClick={() => generateEmbeddings(['image'], true)}
                    disabled={loading}
                    variant="secondary"
                    className="justify-start border-amber-300 bg-amber-50 hover:bg-amber-100"
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    🔥 Force Regenerate ALL Image Embeddings (Fix Dimensions)
                  </Button>
                  
                  <Button
                    onClick={() => generateEmbeddings(['catalog', 'library', 'image', 'job_result'], true)}
                    disabled={loading}
                    variant="secondary"
                    className="justify-start border-red-300 bg-red-50 hover:bg-red-100"
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    🔥 Force Regenerate EVERYTHING (Complete Reset)
                  </Button>
                </div>
                <p className="text-sm text-amber-700 mt-2">
                  ⚠️ These buttons will regenerate embeddings even if they already exist. 
                  Use this to fix dimension mismatches from previous generations.
                </p>
              </div>

              {loading && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground">{currentStep}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Card */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Generation Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {Object.entries(results).map(([type, stats]) => (
                    <div key={type}>
                      {renderStats(
                        type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
                        stats
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Embeddings Generated Successfully!</p>
                      <p className="text-green-700 text-sm">
                        You can now search for your content including dog photos and other images.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 