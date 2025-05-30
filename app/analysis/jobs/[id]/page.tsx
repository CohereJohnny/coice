'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  Activity,
  BarChart3,
  Shield,
  GitCompare,
  FileText,
  Target,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Import our new Sprint 11 components
import { ProgressBar, JobTimeline } from '@/components/jobs';
import { JobResultsView } from '@/components/jobs/JobResultsView';
import { JobAnalyticsDashboard } from '@/components/jobs/JobAnalyticsDashboard';
import { JobComparisonTools } from '@/components/jobs/JobComparisonTools';
import { ResultValidationPanel } from '@/components/jobs/ResultValidationPanel';
import type { ProgressStage, TimelineEvent } from '@/components/jobs';
import { useJobSubscription } from '@/app/hooks/useJobSubscription';
import { imageService } from '@/lib/services/imageService';
import { useFeatureFlag } from '@/lib/featureFlags';

// Helper function to safely format dates
const safeFormatDistanceToNow = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return formatDistanceToNow(date);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

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
    totalImages: number;
    processedImages: number;
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
  
  // Feature flags for advanced features
  const isAnalyticsEnabled = useFeatureFlag('jobAnalyticsDashboard');
  const isComparisonEnabled = useFeatureFlag('jobComparisonTools');
  const isValidationEnabled = useFeatureFlag('resultValidation');
  
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [stageFilter, setStageFilter] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Pagination state for Quick Results Overview
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
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
      console.log('Raw job data:', {
        created_at: data.job?.created_at,
        completed_at: data.job?.completed_at,
        type_created: typeof data.job?.created_at,
        type_completed: typeof data.job?.completed_at
      });
      
      setJobDetails(data);
      
      // If we're on the analytics tab, also load analytics data (only if feature is enabled)
      if (activeTab === 'analytics' && isAnalyticsEnabled) {
        loadAnalyticsData();
      }
      
    } catch (err) {
      console.error('Error loading job details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [jobId, activeTab, isAnalyticsEnabled]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, stageFilter, searchTerm]);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      
      // Get job creation date for timeframe
      const jobDate = jobDetails?.job?.created_at ? new Date(jobDetails.job.created_at) : new Date();
      const startDate = new Date(jobDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before job
      const endDate = new Date(); // Current date
      
      // Fetch analytics data with job-specific filters if available
      const params = new URLSearchParams({
        dateFrom: startDate.toISOString(),
        dateTo: endDate.toISOString(),
        timeframeStart: startDate.toISOString(),
        timeframeEnd: endDate.toISOString(),
        groupBy: 'day'
      });
      
      // Add pipeline filter if we have pipeline info
      if (jobDetails?.job?.pipeline?.id) {
        params.append('pipelineIds', jobDetails.job.pipeline.id);
      }
      
      const response = await fetch(`/api/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load analytics data');
      }
      
      const analyticsResponse = await response.json();
      
      if (analyticsResponse.success) {
        setAnalyticsData(analyticsResponse.data);
      } else {
        console.error('Analytics API error:', analyticsResponse.error);
        setAnalyticsData(null);
      }
      
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [jobDetails]);

  // Handle tab changes to load data as needed
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    
    // Load analytics data when switching to analytics tab (only if feature is enabled)
    if (newTab === 'analytics' && isAnalyticsEnabled && !analyticsData && !analyticsLoading) {
      loadAnalyticsData();
    }
  }, [analyticsData, analyticsLoading, loadAnalyticsData, isAnalyticsEnabled]);

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
      
      const loadImage = async () => {
        try {
          const url = await imageService.getSignedImageUrl(imageId);
          if (isMounted) {
            setImageSrc(url);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Failed to load image:', err);
          if (isMounted) {
            setError(true);
            setIsLoading(false);
          }
        }
      };

      loadImage();
      
      return () => {
        isMounted = false;
      };
    }, [imageId]);

    if (isLoading) {
      return (
        <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      );
    }

    if (error) {
      return (
        <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
          <div className="text-center">
            <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <div className="text-sm text-gray-500">Failed to load</div>
          </div>
        </div>
      );
    }

    return (
      <img
        src={imageSrc}
        alt={`Image ${imageId.slice(0, 8)}`}
        className={`object-cover ${className}`}
        onError={() => setError(true)}
      />
    );
  });

  // Expandable Analysis Result Component
  const ExpandableAnalysisResult = memo(function ExpandableAnalysisResult({ 
    result, 
    isSuccess = true,
    className = '' 
  }: { 
    result: string; 
    isSuccess?: boolean;
    className?: string;
  }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // For non-descriptive results, always show full content (they're typically short)
    const isDescriptive = result.length > 150; // Rough heuristic for descriptive content
    const shouldBeCollapsible = isDescriptive;
    
    if (!shouldBeCollapsible) {
      // Short results (boolean/keywords) - always show full content
      return (
        <div className={className}>
          {result}
        </div>
      );
    }
    
    // Long results (descriptive) - make collapsible
    const previewLength = 120;
    const preview = result.length > previewLength 
      ? result.substring(0, previewLength) + '...'
      : result;
    
    const contentToShow = isExpanded ? result : preview;
    
    return (
      <div className={className}>
        <div className="space-y-2">
          {contentToShow}
          
          {result.length > previewLength && (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  });

  // Markdown-aware Expandable Analysis Result Component
  const MarkdownExpandableAnalysisResult = memo(function MarkdownExpandableAnalysisResult({ 
    result, 
    promptType,
    isSuccess = true,
    className = '' 
  }: { 
    result: string; 
    promptType: string;
    isSuccess?: boolean;
    className?: string;
  }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // For descriptive types, make them collapsible by default
    const shouldBeCollapsible = promptType === 'descriptive' && result.length > 150;
    
    if (!shouldBeCollapsible) {
      // Short results or non-descriptive - always show full content
      return (
        <div className={className}>
          {promptType === 'descriptive' ? (
            <div className="prose prose-sm prose-green dark:prose-invert max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          ) : (
            result
          )}
        </div>
      );
    }
    
    // Long descriptive results - make collapsible
    const previewLength = 120;
    const preview = result.length > previewLength 
      ? result.substring(0, previewLength) + '...'
      : result;
    
    const contentToShow = isExpanded ? result : preview;
    
    return (
      <div className={className}>
        <div className="space-y-2">
          {promptType === 'descriptive' ? (
            <div className="prose prose-sm prose-green dark:prose-invert max-w-none">
              <ReactMarkdown>{contentToShow}</ReactMarkdown>
            </div>
          ) : (
            contentToShow
          )}
          
          {result.length > previewLength && (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  });

  // Calculate progress for the job if in progress
  const calculateProgress = useCallback(() => {
    if (!jobDetails) return 0;
    const { job } = jobDetails;
    
    if (job.status === 'completed') return 100;
    if (job.status === 'failed' || job.status === 'cancelled') return 0;
    
    if (job.progress !== undefined && job.progress !== null) {
      return job.progress;
    }
    
    if (job.totalImages > 0) {
      return Math.round((job.processedImages / job.totalImages) * 100);
    }
    
    return 0;
  }, [jobDetails]);

  // Filter results based on current filters
  const filteredResults = jobDetails?.results?.filter(result => {
    const matchesFilter = filter === 'all' || 
      (filter === 'success' && result.success) ||
      (filter === 'failed' && !result.success);
    
    const matchesStage = stageFilter === 'all' || result.stage_order === stageFilter;
    
    const matchesSearch = !searchTerm || 
      result.result?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.prompt_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.image_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesStage && matchesSearch;
  }) || [];

  // Get unique stages for filtering
  const uniqueStages = Array.from(new Set(jobDetails?.results?.map(r => r.stage_order))).sort();

  // Pagination Controls Component
  const PaginationControls = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show:</span>
        <select 
          value={pageSize} 
          onChange={(e) => {
            const newPageSize = Number(e.target.value);
            setPageSize(newPageSize);
            setCurrentPage(1); // Reset to first page when changing page size
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span className="text-sm text-muted-foreground">per page</span>
      </div>

      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredResults.length)} of {filteredResults.length} results
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm px-2">
          Page {currentPage} of {Math.ceil(filteredResults.length / pageSize)}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(Math.ceil(filteredResults.length / pageSize), currentPage + 1))}
          disabled={currentPage >= Math.ceil(filteredResults.length / pageSize)}
          className="h-8 px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Test Results Modal Component
  const TestResultsModal = () => (
    <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Results Comparison</DialogTitle>
          <DialogDescription>
            Comparing original result with fresh API call
          </DialogDescription>
        </DialogHeader>
        
        {testResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Original Result</h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <p className="text-sm">{testResult.originalResult}</p>
                  {testResult.originalConfidence && (
                    <p className="text-xs text-gray-500 mt-1">
                      Confidence: {Math.round(testResult.originalConfidence * 100)}%
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Fresh Test Result</h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <p className="text-sm">{testResult.freshResult}</p>
                  {testResult.freshConfidence && (
                    <p className="text-xs text-gray-500 mt-1">
                      Confidence: {Math.round(testResult.freshConfidence * 100)}%
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="font-medium">Match: </span>
                  <Badge variant={testResult.match ? "default" : "destructive"}>
                    {testResult.match ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Model: </span>
                  {testResult.model}
                </div>
                <div>
                  <span className="font-medium">Prompt Type: </span>
                  {testResult.promptType}
                </div>
              </div>
              
              {testResult.error && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{testResult.error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!jobDetails) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Job not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Job Details</h1>
            <p className="text-muted-foreground">
              {jobDetails.job.pipeline.name} • {jobDetails.job.library.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadJobDetails} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant={
            jobDetails.job.status === 'completed' ? 'default' :
            jobDetails.job.status === 'failed' ? 'destructive' :
            jobDetails.job.status === 'processing' ? 'secondary' :
            'outline'
          }>
            {jobDetails.job.status}
          </Badge>
        </div>
      </div>

      {/* Job Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Job Overview</CardTitle>
          <CardDescription>
            Created {safeFormatDistanceToNow(jobDetails.job.created_at)} ago
            {jobDetails.job.completed_at && (
              <> • Completed {safeFormatDistanceToNow(jobDetails.job.completed_at)} ago</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{jobDetails.job.totalImages}</div>
              <div className="text-sm text-muted-foreground">Total Images</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{jobDetails.job.processedImages}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{progress}%</div>
              <div className="text-sm text-muted-foreground">Progress</div>
            </div>
          </div>
          
          {jobDetails.job.status === 'processing' && (
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time connection status */}
      {realTimeError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Real-time updates disconnected: {realTimeError}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className={`grid w-full ${
          // Calculate grid columns based on enabled features
          2 + (isAnalyticsEnabled ? 1 : 0) + (isComparisonEnabled ? 1 : 0) + (isValidationEnabled ? 1 : 0) === 2 ? 'grid-cols-2' :
          2 + (isAnalyticsEnabled ? 1 : 0) + (isComparisonEnabled ? 1 : 0) + (isValidationEnabled ? 1 : 0) === 3 ? 'grid-cols-3' :
          2 + (isAnalyticsEnabled ? 1 : 0) + (isComparisonEnabled ? 1 : 0) + (isValidationEnabled ? 1 : 0) === 4 ? 'grid-cols-4' :
          'grid-cols-5'
        }`}>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Results
          </TabsTrigger>
          {isAnalyticsEnabled && (
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          )}
          {isComparisonEnabled && (
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Comparison
            </TabsTrigger>
          )}
          {isValidationEnabled && (
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Validation
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Progress Bar for processing jobs */}
          {jobDetails.job.status === 'processing' && (
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>Real-time job progress tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  progress={calculateProgress()}
                  status={jobDetails.job.status as any}
                  showPercentage={true}
                  animated={true}
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

          {/* Basic Results Table for Overview */}
          {jobDetails.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Results Overview</CardTitle>
                <CardDescription>Basic results preview - see Results tab for advanced features</CardDescription>
                
                {/* Basic Filters */}
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
                {/* Top pagination controls - show only when there are results */}
                {filteredResults.length > 0 && (
                  <PaginationControls className="mb-4 pb-4 border-b" />
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Image</TableHead>
                      <TableHead className="w-72">Metadata</TableHead>
                      <TableHead>Analysis Result</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((result) => (
                      <TableRow key={result.id}>
                        {/* Image Column */}
                        <TableCell>
                          <div className="relative w-[100px] h-[100px]">
                            <ImageDisplay imageId={result.image_id} className="w-full h-full rounded" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 dark:bg-black/80 text-white text-xs p-1 rounded-b">
                              <div className="font-mono truncate text-[10px]">
                                {result.image_id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Metadata Column */}
                        <TableCell>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="font-medium text-sm">Stage {result.stage_order}</div>
                              <div className="text-xs text-muted-foreground">{result.prompt_name}</div>
                              <Badge variant="outline" className="text-xs">
                                {result.prompt_type}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Analysis Result Column */}
                        <TableCell className="max-w-md">
                          <div className="text-sm">
                            {result.success ? (
                              <div className="bg-green-50 dark:bg-green-950 p-3 rounded border dark:border-green-800">
                                <div className="font-medium text-green-800 dark:text-green-200 mb-1">
                                  Analysis Result:
                                </div>
                                <div className="text-green-700 dark:text-green-300">
                                  <MarkdownExpandableAnalysisResult 
                                    result={result.result} 
                                    promptType={result.prompt_type || 'boolean'}
                                    isSuccess={result.success} 
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="bg-red-50 dark:bg-red-950 p-3 rounded border dark:border-red-800">
                                <div className="font-medium text-red-800 dark:text-red-200 mb-1">
                                  Error:
                                </div>
                                <div className="text-red-700 dark:text-red-300">
                                  <ExpandableAnalysisResult 
                                    result={result.error_message || 'Analysis failed'} 
                                    isSuccess={false} 
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        {/* Actions Column */}
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                setTestLoading(true);
                                setShowTestModal(true);
                                
                                const imageUrl = await imageService.getSignedImageUrl(result.image_id);
                                const actualPrompt = result.stage?.prompt?.prompt || result.prompt_name || 'Is there a flare burning in this image?';
                                const promptType = result.prompt_type || 'boolean';
                                
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

                {/* Bottom pagination controls - show only when there are results */}
                {filteredResults.length > 0 && (
                  <PaginationControls className="mt-4 pt-4 border-t" />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Advanced Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Results View</CardTitle>
              <CardDescription>
                Comprehensive results interface with filtering, comparison, and export features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobResultsView 
                jobId={jobId}
                onResultSelect={(result) => {
                  console.log('Selected result:', result);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        {isAnalyticsEnabled && (
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Analytics Dashboard</CardTitle>
                <CardDescription>
                  Performance metrics, trends, and optimization recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JobAnalyticsDashboard 
                  data={analyticsData}
                  isLoading={analyticsLoading}
                  onRefresh={() => loadAnalyticsData()}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Comparison Tab */}
        {isComparisonEnabled && (
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Comparison Tools</CardTitle>
                <CardDescription>
                  Compare this job with others for performance analysis and A/B testing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JobComparisonTools 
                  data={undefined}
                  selectedJobIds={[jobId]}
                  onJobSelection={(jobIds) => {
                    console.log('Selected jobs for comparison:', jobIds);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Validation Tab */}
        {isValidationEnabled && (
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Result Validation & Quality Checks</CardTitle>
                <CardDescription>
                  Quality metrics, validation status, and approval workflows for job results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobDetails.results.length > 0 ? (
                  <div className="space-y-6">
                    {/* Job-level validation summary can go here */}
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">Result Validation Testing</h3>
                      <p className="mb-4">
                        This feature validates the quality and consistency of AI analysis results.<br/>
                        Select individual results from the Results tab to test validation features.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('results')}
                        className="mx-auto"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Go to Results Tab
                      </Button>
                    </div>
                    
                    {/* Example validation panel with first result */}
                    {jobDetails.results[0] && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">Example: Validation Panel for Result</h4>
                        <ResultValidationPanel
                          resultId={jobDetails.results[0].id}
                          onValidateResult={(resultId, options) => {
                            console.log('Validate result:', resultId, options);
                            // This will call the validation API
                          }}
                          onUpdateApproval={(resultId, status, notes) => {
                            console.log('Update approval:', resultId, status, notes);
                            // This will call the approval API
                          }}
                          className="border-l-4 border-l-blue-500 pl-4"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No results available for validation.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Test Results Modal */}
      <TestResultsModal />
    </div>
  );
} 