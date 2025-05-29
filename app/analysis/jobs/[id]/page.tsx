'use client';

import { useState, useEffect, useCallback, memo } from 'react';
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
  Search,
  Clock,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Import our new components
import { ProgressBar, JobTimeline } from '@/components/jobs';
import type { ProgressStage, TimelineEvent } from '@/components/jobs';
import { useJobSubscription } from '@/app/hooks/useJobSubscription';
import { imageService } from '@/lib/services/imageService';

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
  
  // Modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Real-time job subscription for live updates
  const {
    isConnected: isRealTimeConnected,
    connectionError: realTimeError,
    refreshJobStatus,
  } = useJobSubscription({
    jobId,
    enableNotifications: true,
    onJobUpdate: (jobUpdate) => {
      console.log('Job details page received update:', jobUpdate);
      // Refresh job details when we get real-time updates
      loadJobDetails();
    },
    onJobCompleted: (jobUpdate) => {
      console.log('Job completed, refreshing details');
      loadJobDetails();
    },
    onJobFailed: (jobUpdate) => {
      console.log('Job failed, refreshing details');
      loadJobDetails();
    },
  });

  const loadJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to load job details');
      }
      
      const data = await response.json();
      
      // Log the raw date values for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Raw job data received:', {
          created_at: data.job?.created_at,
          completed_at: data.job?.completed_at,
          created_at_type: typeof data.job?.created_at,
          completed_at_type: typeof data.job?.completed_at,
          job_status: data.job?.status
        });
      }
      
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

  // Debug function to get cache stats
  const getCacheStats = () => {
    return imageService.getCacheStats();
  };

  // Component to handle image display with signed URL using the new service
  const ImageDisplay = memo(function ImageDisplay({ imageId, className }: { imageId: string; className?: string }) {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      let isMounted = true;
      
      imageService.getSignedImageUrl(imageId)
        .then(url => {
          if (isMounted) {
            setImageSrc(url);
            setIsLoading(false);
            setError(url === '/api/placeholder-image');
          }
        })
        .catch(err => {
          console.error('Image load error:', err);
          if (isMounted) {
            setImageSrc('/api/placeholder-image');
            setIsLoading(false);
            setError(true);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [imageId]);

    return (
      <div className={`relative ${className || ''}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        <img 
          src={imageSrc || '/api/placeholder-image'}
          alt="Analysis image"
          className="w-full h-full object-cover rounded"
          onError={(e) => {
            if (!error) {
              (e.target as HTMLImageElement).src = '/api/placeholder-image';
              setError(true);
            }
          }}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      </div>
    );
  });

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

  const safeFormatDate = (dateString: string | null | undefined, fieldName?: string) => {
    // Log raw input for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Date formatting for ${fieldName || 'unknown field'}:`, {
        input: dateString,
        type: typeof dateString,
        isNull: dateString === null,
        isUndefined: dateString === undefined,
        isEmpty: dateString === ''
      });
    }
    
    if (!dateString) {
      // Show more specific information about what's missing
      if (dateString === null) return 'Not set (null)';
      if (dateString === undefined) return 'Not set (undefined)';
      if (dateString === '') return 'Not set (empty)';
      return 'Not set';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error(`Invalid date for ${fieldName}:`, dateString);
        return `Invalid date: "${dateString}"`;
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error(`Date formatting error for ${fieldName}:`, error, 'Input:', dateString);
      return `Error parsing: "${dateString}"`;
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
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
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
                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Original Pipeline Result</h5>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {testResult.originalResult}
                  </div>
                  {testResult.originalConfidence && (
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      Confidence: {Math.round(testResult.originalConfidence * 100)}%
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    From job pipeline execution
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Fresh Test Result</h5>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {testResult.freshResult}
                  </div>
                  {testResult.freshConfidence && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Confidence: {Math.round(testResult.freshConfidence * 100)}%
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    From live API test
                  </div>
                </div>
              </div>
            </div>

            {/* Match Status */}
            <div className={`border rounded-lg p-4 ${testResult.match ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center gap-2">
                {testResult.match ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className={`font-medium ${testResult.match ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {testResult.match ? 'Results Match' : 'Results Differ'}
                </span>
                {!testResult.match && (
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                    - Review the image to determine which result is correct
                  </span>
                )}
              </div>
            </div>

            {/* Model Info */}
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Model Information</h5>
              <div className="text-sm text-blue-700 dark:text-blue-300 grid grid-cols-2 gap-4">
                <div><strong>Model:</strong> {testResult.model}</div>
                <div><strong>Timestamp:</strong> {new Date().toLocaleString()}</div>
              </div>
            </div>

            {/* Error Display */}
            {testResult.error && (
              <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">Error</h5>
                <div className="text-sm text-red-700 dark:text-red-300">{testResult.error}</div>
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

  // Create timeline events from job data
  const createTimelineEvents = (): TimelineEvent[] => {
    if (!jobDetails) return [];

    const events: TimelineEvent[] = [];

    // Job started event - add validation for timestamp
    if (jobDetails.job.created_at) {
      // Validate the timestamp before using it
      const jobStartTime = new Date(jobDetails.job.created_at);
      const isValidStartTime = !isNaN(jobStartTime.getTime());
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Job created_at:', jobDetails.job.created_at);
        console.log('Parsed date:', jobStartTime);
        console.log('Is valid:', isValidStartTime);
      }
      
      events.push({
        id: 'job-started',
        title: 'Job Started',
        description: `Analysis pipeline "${jobDetails.job.pipeline.name}" initiated`,
        timestamp: isValidStartTime ? jobDetails.job.created_at : new Date().toISOString(),
        status: 'completed',
        icon: <Activity className="w-3 h-3" />,
        details: {
          total: jobDetails.job.total_images,
        },
      });
    }

    // Add stage completion events based on results
    const stageCompletions = new Map<number, { completed: number; failed: number; timestamp: string }>();
    
    jobDetails.results.forEach(result => {
      const stageOrder = result.stage_order || 1;
      const existing = stageCompletions.get(stageOrder) || { 
        completed: 0, 
        failed: 0, 
        timestamp: result.created_at || new Date().toISOString() 
      };
      
      if (result.success) {
        existing.completed++;
      } else {
        existing.failed++;
      }
      
      // Use the latest timestamp for this stage (with validation)
      const resultTimestamp = result.created_at || new Date().toISOString();
      const currentTimestamp = existing.timestamp || new Date().toISOString();
      
      if (new Date(resultTimestamp) > new Date(currentTimestamp)) {
        existing.timestamp = resultTimestamp;
      }
      
      stageCompletions.set(stageOrder, existing);
    });

    // Create events for each stage
    Array.from(stageCompletions.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([stageOrder, data]) => {
        const stageResult = jobDetails.results.find(r => r.stage_order === stageOrder);
        const total = data.completed + data.failed;
        
        events.push({
          id: `stage-${stageOrder}`,
          title: `Stage ${stageOrder} Completed`,
          description: stageResult?.prompt_name || `Pipeline stage ${stageOrder}`,
          timestamp: data.timestamp || new Date().toISOString(),
          status: data.failed > 0 ? 'completed' : 'completed', // Could be 'failed' if all failed
          details: {
            processed: total,
            total: jobDetails.job.total_images,
            errors: data.failed > 0 ? [`${data.failed} images failed processing`] : undefined,
          },
        });
      });

    // Job completion event - add validation
    if (jobDetails.job.completed_at) {
      const completionTime = new Date(jobDetails.job.completed_at);
      const isValidCompletionTime = !isNaN(completionTime.getTime());
      
      events.push({
        id: 'job-completed',
        title: jobDetails.job.status === 'completed' ? 'Job Completed' : 'Job Failed',
        description: jobDetails.job.status === 'completed' 
          ? `Analysis completed successfully with ${successRate}% success rate`
          : `Job failed: ${jobDetails.job.error_message || 'Unknown error'}`,
        timestamp: isValidCompletionTime ? jobDetails.job.completed_at : new Date().toISOString(),
        status: jobDetails.job.status === 'completed' ? 'completed' : 'failed',
        icon: jobDetails.job.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />,
        details: {
          processed: jobDetails.job.processed_images,
          total: jobDetails.job.total_images,
        },
      });
    }

    return events;
  };

  // Create progress stages from pipeline data
  const createProgressStages = (): ProgressStage[] => {
    if (!jobDetails) return [];

    const stages: ProgressStage[] = [];
    const uniqueStages = [...new Set(jobDetails.results.map(r => r.stage_order || 1))].sort();

    uniqueStages.forEach((stageOrder, index) => {
      const stageResults = jobDetails.results.filter(r => (r.stage_order || 1) === stageOrder);
      const stageResult = stageResults[0]; // Get first result for stage info
      const completed = stageResults.filter(r => r.success).length;
      const total = stageResults.length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      let status: ProgressStage['status'] = 'pending';
      if (total > 0) {
        if (completed === total) {
          status = 'completed';
        } else if (completed > 0) {
          status = 'processing';
        } else {
          status = 'failed';
        }
      }

      stages.push({
        id: `stage-${stageOrder}`,
        name: stageResult?.prompt_name || `Stage ${stageOrder}`,
        description: stageResult?.prompt_type || 'Analysis stage',
        status,
        progress,
        icon: <span className="text-xs font-medium">{stageOrder}</span>,
      });
    });

    return stages;
  };

  const timelineEvents = createTimelineEvents();
  const progressStages = createProgressStages();

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
            <div className="flex items-center space-x-4">
              <p className="text-muted-foreground">Detailed analysis for job {jobId.slice(0, 8)}...</p>
              {/* Real-time status indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isRealTimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-muted-foreground">
                  {isRealTimeConnected ? 'Live updates' : 'Disconnected'}
                </span>
                {realTimeError && (
                  <span className="text-xs text-red-500" title={realTimeError}>
                    ⚠️
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={loadJobDetails} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <Button 
              onClick={() => setShowDebugPanel(!showDebugPanel)} 
              variant="outline"
              size="sm"
            >
              Debug
            </Button>
          )}
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
              <p className="text-sm text-muted-foreground">{safeFormatDate(jobDetails.job.created_at, 'created_at')}</p>
            </div>
            <div>
              <h4 className="font-medium">Completed</h4>
              <p className="text-sm text-muted-foreground">{safeFormatDate(jobDetails.job.completed_at, 'completed_at')}</p>
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
              <ProgressBar
                progress={jobDetails.job.progress}
                status={jobDetails.job.status as any}
                stages={progressStages}
                variant="segmented"
                showStageNames={true}
                showStageProgress={true}
                showTimeEstimate={true}
                animated={true}
                size="md"
              />
            </div>
          )}
          
          {/* Show completed progress bar for finished jobs */}
          {jobDetails.job.status === 'completed' && (
            <div className="mt-4">
              <ProgressBar
                progress={100}
                status="completed"
                stages={progressStages}
                variant="segmented"
                showStageNames={true}
                showPercentage={true}
                animated={false}
                size="md"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Panel for Development */}
      {process.env.NODE_ENV === 'development' && showDebugPanel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-4">
              {/* Date Information */}
              <div>
                <div className="font-medium mb-2">Date Fields:</div>
                <div className="space-y-1">
                  <div>Created At: <span className="font-mono">{JSON.stringify(jobDetails.job.created_at)} ({typeof jobDetails.job.created_at})</span></div>
                  <div>Completed At: <span className="font-mono">{JSON.stringify(jobDetails.job.completed_at)} ({typeof jobDetails.job.completed_at})</span></div>
                  <div>Job Status: <span className="font-mono">{jobDetails.job.status}</span></div>
                </div>
              </div>
              
              {/* Image Request Statistics */}
              <div>
                <div className="font-medium mb-2">Image Request Statistics:</div>
                <div>Cache Size: {getCacheStats().cacheSize}</div>
                <div>Pending Requests: {getCacheStats().pendingRequests}</div>
                <div className="space-y-1">
                  <div className="font-medium">Request Counts by Image ID:</div>
                  {Object.entries(getCacheStats().requestCounts).map(([imageId, count]) => (
                    <div key={imageId} className={`ml-2 ${count > 1 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                      {imageId.slice(0, 8)}...: {count} requests {count > 1 && '⚠️'}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => imageService.clearCache()} 
                  variant="outline" 
                  size="sm"
                  className="mt-2"
                >
                  Clear Cache
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Timeline */}
      {timelineEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Job Timeline
            </CardTitle>
            <CardDescription>Chronological view of job execution events</CardDescription>
          </CardHeader>
          <CardContent>
            <JobTimeline
              events={timelineEvents}
              stages={progressStages}
              showDurations={true}
              showDetails={true}
              showMetadata={false}
              compact={false}
            />
          </CardContent>
        </Card>
      )}

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
                    
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                      <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Prompt:</div>
                      <div className="text-gray-900 dark:text-gray-100">
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
                  <TableHead className="w-52">Image</TableHead>
                  <TableHead className="w-72">Metadata</TableHead>
                  <TableHead>Analysis Result</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    {/* Image Column - 200x200 with overlay */}
                    <TableCell>
                      <div className="relative w-48 h-48">
                        <ImageDisplay imageId={result.image_id} className="w-full h-full" />
                        {/* Image name overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 dark:bg-black/80 text-white text-xs p-2 rounded-b">
                          <div className="font-mono truncate">
                            {result.image_id.slice(0, 12)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Metadata Column - Combined status, stage, confidence */}
                    <TableCell>
                      <div className="space-y-3">
                        {/* Status Badge - Remove redundant icon, keep only badge */}
                        <div>
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                        </div>
                        
                        {/* Stage Information */}
                        <div className="space-y-1">
                          <div className="font-medium text-sm">Stage {result.stage_order}</div>
                          <div className="text-xs text-muted-foreground">{result.prompt_name}</div>
                          <Badge variant="outline" className="text-xs">
                            {result.prompt_type}
                          </Badge>
                        </div>
                        
                        {/* Confidence */}
                        {result.confidence && (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              Confidence: {Math.round(result.confidence * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {result.confidence > 0.8 ? 'High' : 
                               result.confidence > 0.6 ? 'Medium' : 'Low'}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Analysis Result Column - Only the result */}
                    <TableCell className="max-w-md">
                      <div className="text-sm">
                        {result.success ? (
                          <div className="bg-green-50 dark:bg-green-950 p-3 rounded border dark:border-green-800">
                            <div className="font-medium text-green-800 dark:text-green-200 mb-1">
                              Analysis Result:
                            </div>
                            <div className="text-green-700 dark:text-green-300">
                              {result.result}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-red-50 dark:bg-red-950 p-3 rounded border dark:border-red-800">
                            <div className="font-medium text-red-800 dark:text-red-200 mb-1">
                              Error:
                            </div>
                            <div className="text-red-700 dark:text-red-300">
                              {result.error_message || 'Analysis failed'}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Actions Column - Only Test button */}
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            setTestLoading(true);
                            setShowTestModal(true);
                            
                            const imageUrl = await imageService.getSignedImageUrl(result.image_id);
                            
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
                        className="h-8 px-3 text-xs"
                        disabled={testLoading}
                      >
                        {testLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
                      </Button>
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
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 dark:text-gray-100 p-4 rounded overflow-auto">
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