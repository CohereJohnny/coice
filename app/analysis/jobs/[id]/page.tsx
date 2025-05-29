'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JobResult {
  id: string;
  result: string;
  success: boolean;
  confidence?: number;
  error_message?: string;
  stage_order?: number;
  prompt_name?: string;
  prompt_type?: string;
  image_id: string;
  created_at: string;
  metadata?: any;
  image?: {
    id: string;
    gcs_path: string;
    metadata?: any;
  };
  stage?: {
    id: string;
    stage_order: number;
    prompt?: {
      id: string;
      name: string;
      prompt: string;
      type: string;
    };
  };
}

interface JobDetails {
  job: {
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    total_images: number;
    processed_images: number;
    pipeline: {
      id: string;
      name: string;
      description: string;
    };
    library: {
      id: number;
      name: string;
    };
    error_message?: string;
    results_summary?: any;
    progress?: number;
  };
  results: JobResult[];
}

interface TestResult {
  imageId: string;
  prompt: string;
  promptType: string;
  originalResult: string;
  originalConfidence?: number;
  freshResult: string;
  freshConfidence?: number;
  model: string;
  match: boolean;
  error?: string;
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [stageFilter, setStageFilter] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  
  // Modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const loadJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to load job details');
      }
      
      const data = await response.json();
      setJobDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJobDetails();
  }, [loadJobDetails]);

  // Function to get signed URL for an image
  const getSignedImageUrl = useCallback(async (imageId: string): Promise<string> => {
    // Check if we already have the URL cached
    if (imageUrls.has(imageId)) {
      return imageUrls.get(imageId)!;
    }

    try {
      const response = await fetch(`/api/images/${imageId}?signed=true`);
      if (!response.ok) {
        throw new Error('Failed to get signed URL');
      }
      
      const data = await response.json();
      const signedUrl = data.signedUrl;
      
      // Cache the URL
      setImageUrls(prev => new Map(prev).set(imageId, signedUrl));
      
      return signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return '/api/placeholder-image';
    }
  }, [imageUrls]);

  // Component to handle image display with signed URL
  const ImageDisplay = ({ imageId, className }: { imageId: string; className?: string }) => {
    const [imageSrc, setImageSrc] = useState('/api/placeholder-image');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      let isMounted = true;
      
      getSignedImageUrl(imageId).then(url => {
        if (isMounted) {
          setImageSrc(url);
          setIsLoading(false);
        }
      });

      return () => {
        isMounted = false;
      };
    }, [imageId]);

    return (
      <div className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        <img 
          src={imageSrc}
          alt="Analysis image"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/api/placeholder-image';
          }}
        />
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const safeFormatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const filteredResults = jobDetails?.results?.filter(result => {
    // Apply success/failure filter
    if (filter === 'success' && !result.success) return false;
    if (filter === 'failed' && result.success) return false;
    
    // Apply stage filter
    if (stageFilter !== 'all' && result.stage_order !== stageFilter) return false;
    
    // Apply search filter
    if (searchTerm && !result.result?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  }) || [];

  const uniqueStages = [...new Set(jobDetails?.results?.map(r => r.stage_order).filter(Boolean))].sort();

  // Test Results Modal Component
  const TestResultsModal = () => (
    <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Results</DialogTitle>
          <DialogDescription>
            Comparison between original analysis and fresh test
          </DialogDescription>
        </DialogHeader>
        
        {testLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Running fresh analysis...
          </div>
        ) : testResult ? (
          <div className="space-y-6">
            {/* Image Display */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-3">Image Being Analyzed</h4>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="lg:w-1/2">
                  <ImageDisplay 
                    imageId={testResult.imageId} 
                    className="w-full h-64 rounded-lg border"
                  />
                </div>
                <div className="lg:w-1/2 space-y-2">
                  <div className="text-sm">
                    <div><strong>Image ID:</strong> {testResult.imageId}</div>
                    <div><strong>Prompt Used:</strong> &quot;{testResult.prompt}&quot;</div>
                    <div><strong>Prompt Type:</strong> {testResult.promptType}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">Original Pipeline Result</h5>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-blue-700">
                    {testResult.originalResult}
                  </div>
                  {testResult.originalConfidence && (
                    <div className="text-sm text-blue-600">
                      Confidence: {Math.round(testResult.originalConfidence * 100)}%
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    From job pipeline execution
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-green-800 mb-2">Fresh Test Result</h5>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-green-700">
                    {testResult.freshResult}
                  </div>
                  {testResult.freshConfidence && (
                    <div className="text-sm text-green-600">
                      Confidence: {Math.round(testResult.freshConfidence * 100)}%
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    From live API test
                  </div>
                </div>
              </div>
            </div>

            {/* Match Status */}
            <div className={`border rounded-lg p-4 ${testResult.match ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2">
                {testResult.match ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${testResult.match ? 'text-green-800' : 'text-red-800'}`}>
                  {testResult.match ? 'Results Match' : 'Results Differ'}
                </span>
                {!testResult.match && (
                  <span className="text-sm text-gray-600 ml-2">
                    - Review the image to determine which result is correct
                  </span>
                )}
              </div>
            </div>

            {/* Model Info */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h5 className="font-medium text-blue-800 mb-2">Model Information</h5>
              <div className="text-sm text-blue-700 grid grid-cols-2 gap-4">
                <div><strong>Model:</strong> {testResult.model}</div>
                <div><strong>Timestamp:</strong> {new Date().toLocaleString()}</div>
              </div>
            </div>

            {/* Error Display */}
            {testResult.error && (
              <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                <h5 className="font-medium text-red-800 mb-2">Error</h5>
                <div className="text-sm text-red-700">{testResult.error}</div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading job details...
      </div>
    );
  }

  if (error || !jobDetails) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Job not found'}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.back()} 
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const successRate = jobDetails.results.length > 0 
    ? Math.round((jobDetails.results.filter(r => r.success).length / jobDetails.results.length) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => router.back()} 
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Job Analysis Results</h1>
            <p className="text-muted-foreground">Detailed analysis for job {jobId.slice(0, 8)}...</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={loadJobDetails} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {jobDetails.results.length > 0 && (
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Job Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Job Summary</CardTitle>
          <CardDescription>Overview of the analysis job</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h4 className="font-medium">Pipeline</h4>
              <p className="text-sm text-muted-foreground">{jobDetails.job.pipeline.name}</p>
            </div>
            <div>
              <h4 className="font-medium">Library</h4>
              <p className="text-sm text-muted-foreground">{jobDetails.job.library.name}</p>
            </div>
            <div>
              <h4 className="font-medium">Status</h4>
              <Badge className={getStatusColor(jobDetails.job.status)}>
                {jobDetails.job.status}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium">Progress</h4>
              <p className="text-sm text-muted-foreground">
                {jobDetails.job.processed_images} / {jobDetails.job.total_images} images ({jobDetails.job.progress || 0}%)
              </p>
            </div>
            <div>
              <h4 className="font-medium">Created</h4>
              <p className="text-sm text-muted-foreground">{safeFormatDate(jobDetails.job.created_at)}</p>
            </div>
            <div>
              <h4 className="font-medium">Completed</h4>
              <p className="text-sm text-muted-foreground">{safeFormatDate(jobDetails.job.completed_at)}</p>
            </div>
            <div>
              <h4 className="font-medium">Total Results</h4>
              <p className="text-sm text-muted-foreground">{jobDetails.results.length}</p>
            </div>
            <div>
              <h4 className="font-medium">Success Rate</h4>
              <p className="text-sm text-muted-foreground">{successRate}%</p>
            </div>
          </div>
          
          {jobDetails.job.progress !== undefined && jobDetails.job.progress < 100 && (
            <div className="mt-4">
              <Progress value={jobDetails.job.progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {jobDetails.job.error_message && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{jobDetails.job.error_message}</AlertDescription>
        </Alert>
      )}

      {/* Pipeline Prompts Information */}
      {jobDetails.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Prompts</CardTitle>
            <CardDescription>The actual prompts used in this analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uniqueStages.map(stageOrder => {
                const stageResult = jobDetails.results.find(r => r.stage_order === stageOrder);
                if (!stageResult) return null;
                
                return (
                  <div key={stageOrder} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">Stage {stageOrder}: {stageResult.prompt_name}</h4>
                        <Badge variant="outline" className="text-xs mt-1">
                          {stageResult.prompt_type}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div className="font-medium text-gray-700 mb-1">Prompt:</div>
                      <div className="text-gray-900">
                        {stageResult.stage?.prompt?.prompt || 'Prompt not available'}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      Expected response format: {stageResult.prompt_type}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {jobDetails.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Detailed results from each pipeline stage</CardDescription>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="all">All Results</option>
                  <option value="success">Successful Only</option>
                  <option value="failed">Failed Only</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm">Stage:</span>
                <select 
                  value={stageFilter} 
                  onChange={(e) => setStageFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="all">All Stages</option>
                  {uniqueStages.map(stage => (
                    <option key={stage} value={stage}>Stage {stage}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search results..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Analysis Result</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">Stage {result.stage_order}</div>
                        <div className="text-xs text-muted-foreground">{result.prompt_name}</div>
                        <Badge variant="outline" className="text-xs">
                          {result.prompt_type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Image thumbnail */}
                        <ImageDisplay imageId={result.image_id} className="w-16 h-12" />
                        <div>
                          <div className="text-xs font-mono">
                            {result.image_id.slice(0, 8)}...
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {result.image_id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm">
                        {result.success ? (
                          <div className="space-y-2">
                            <div className="bg-green-50 p-3 rounded border">
                              <div className="font-medium text-green-800 mb-1">
                                Analysis Result:
                              </div>
                              <div className="text-green-700">
                                {result.result}
                              </div>
                            </div>
                            
                            {/* Show metadata if available */}
                            {result.metadata && (
                              <div className="bg-blue-50 p-2 rounded border text-xs">
                                <div className="font-medium text-blue-800 mb-1">
                                  Model Info:
                                </div>
                                <div className="text-blue-700">
                                  Model: {result.metadata.model || 'Unknown'}<br/>
                                  Type: {result.metadata.promptType || 'Unknown'}<br/>
                                  {result.metadata.fallback && (
                                    <span className="text-orange-600">⚠ Fallback Response</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-red-50 p-3 rounded border">
                            <div className="font-medium text-red-800 mb-1">
                              Error:
                            </div>
                            <div className="text-red-700">
                              {result.error_message || 'Analysis failed'}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.confidence && (
                        <div className="text-sm">
                          <div className="font-medium">
                            {Math.round(result.confidence * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {result.confidence > 0.8 ? 'High' : 
                             result.confidence > 0.6 ? 'Medium' : 'Low'}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {safeFormatDate(result.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Button to view full image */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const imageUrl = await getSignedImageUrl(result.image_id);
                              window.open(imageUrl, '_blank');
                            } catch (error) {
                              alert('Failed to load image');
                            }
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          View
                        </Button>
                        
                        {/* Button to test this specific image */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              setTestLoading(true);
                              setShowTestModal(true);
                              
                              const imageUrl = await getSignedImageUrl(result.image_id);
                              
                              // Use the actual prompt text, not just the name
                              const actualPrompt = result.stage?.prompt?.prompt || result.prompt_name || 'Is there a flare burning in this image?';
                              const promptType = result.prompt_type || 'boolean';
                              
                              console.log('Testing with actual prompt:', actualPrompt);
                              console.log('Prompt type:', promptType);
                              
                              const testResponse = await fetch('/api/debug/cohere-test', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  imageUrl,
                                  prompt: actualPrompt,
                                  promptType: promptType
                                })
                              });
                              const data = await testResponse.json();
                              
                              // Set test result for modal
                              const testResultData: TestResult = {
                                imageId: result.image_id,
                                prompt: actualPrompt,
                                promptType: promptType,
                                originalResult: result.result,
                                originalConfidence: result.confidence,
                                freshResult: data.result?.response || 'Failed',
                                freshConfidence: data.result?.confidence,
                                model: data.result?.metadata?.model || 'Unknown',
                                match: result.result === data.result?.response,
                                error: data.error
                              };
                              
                              setTestResult(testResultData);
                            } catch (error) {
                              setTestResult({
                                imageId: result.image_id,
                                prompt: result.stage?.prompt?.prompt || 'Unknown',
                                promptType: result.prompt_type || 'boolean',
                                originalResult: result.result,
                                originalConfidence: result.confidence,
                                freshResult: 'Error',
                                freshConfidence: 0,
                                model: 'Unknown',
                                match: false,
                                error: `Test failed: ${error}`
                              });
                            } finally {
                              setTestLoading(false);
                            }
                          }}
                          className="h-6 px-2 text-xs"
                          disabled={testLoading}
                        >
                          {testLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No results match the current filters.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job Summary Data */}
      {jobDetails.job.results_summary && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Job Summary</CardTitle>
            <CardDescription>Technical details and metadata</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
              {JSON.stringify(jobDetails.job.results_summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
      
      {/* Test Results Modal */}
      <TestResultsModal />
    </div>
  );
} 