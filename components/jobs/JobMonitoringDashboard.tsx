'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Loader2, 
  Eye, 
  X, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle,
  Play,
  Pause,
  MoreHorizontal
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createSupabaseClient } from '@/lib/supabase';

interface Job {
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
  isComplete: boolean;
  isFailed: boolean;
  isActive: boolean;
  isPending: boolean;
  duration?: number;
}

interface JobDetails {
  job: Job;
  progress: any;
  results: any[];
  queueStatus: any;
}

export default function JobMonitoringDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    loadJobs();
    
    // Set up more frequent polling for active jobs
    const pollInterval = setInterval(() => {
      loadJobs();
    }, 5000); // Increased frequency to 5 seconds for better progress tracking

    // Set up Supabase real-time subscription for job updates using authenticated client
    const setupRealtimeSubscription = async () => {
      try {
        const supabase = createSupabaseClient();
        
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No authenticated user for real-time updates');
          return null;
        }

        console.log('Setting up real-time subscription for user:', user.id);

        const subscription = supabase
          .channel('job-updates')
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'jobs',
              filter: `created_by=eq.${user.id}` // Only listen to current user's jobs
            },
            (payload: any) => {
              console.log('Real-time job update received:', payload);
              
              // Type guard to ensure payload.new exists and has required properties
              if (!payload.new || typeof payload.new !== 'object' || !('id' in payload.new)) {
                console.log('Invalid payload structure:', payload);
                return;
              }

              const newJobData = payload.new as any; // Type assertion for Supabase payload
              
              // Update the jobs list with the new data
              setJobs(currentJobs => {
                const updatedJobs = [...currentJobs];
                const jobIndex = updatedJobs.findIndex(job => job.id === newJobData.id);
                
                if (payload.eventType === 'INSERT' && newJobData && jobIndex === -1) {
                  // Add new job - trigger a full reload to get complete data with joins
                  setTimeout(() => loadJobs(), 1000);
                  return updatedJobs;
                } else if (payload.eventType === 'UPDATE' && newJobData && jobIndex >= 0) {
                  console.log('Updating job progress in real-time:', {
                    jobId: newJobData.id,
                    status: newJobData.status,
                    progress: newJobData.progress,
                    processed: newJobData.processed_images,
                    total: newJobData.total_images
                  });
                  
                  // Update existing job with new data
                  const updatedJob = { 
                    ...updatedJobs[jobIndex], 
                    ...newJobData,
                    // Recalculate derived fields based on actual database values
                    progress: newJobData.progress || (newJobData.total_images > 0 
                      ? Math.round((newJobData.processed_images / newJobData.total_images) * 100)
                      : 0),
                    isComplete: newJobData.status === 'completed',
                    isFailed: newJobData.status === 'failed',
                    isActive: newJobData.status === 'processing',
                    isPending: newJobData.status === 'pending',
                  };
                  updatedJobs[jobIndex] = updatedJob;
                  
                  return updatedJobs;
                }
                
                return updatedJobs;
              });
            }
          )
          .subscribe((status: string) => {
            console.log('Subscription status:', status);
          });

        return subscription;
      } catch (error) {
        console.error('Failed to setup real-time subscription:', error);
        return null;
      }
    };

    let subscription: any = null;
    setupRealtimeSubscription().then(sub => {
      subscription = sub;
      console.log('Real-time subscription established:', sub);
    });

    return () => {
      clearInterval(pollInterval);
      if (subscription) {
        console.log('Unsubscribing from real-time updates');
        subscription.unsubscribe();
      }
    };
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/jobs/history?limit=50');
      if (!response.ok) {
        throw new Error('Failed to load jobs');
      }
      
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
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
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Helper function to safely format dates
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor the progress of your AI analysis jobs
          </p>
        </div>
        <Button onClick={loadJobs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>
            Your analysis jobs and their current status
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No jobs found. Submit your first analysis job to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Library</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.pipeline.name}</div>
                        {job.pipeline.description && (
                          <div className="text-sm text-muted-foreground">
                            {job.pipeline.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{job.library.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{job.processed_images} / {job.total_images} images</span>
                          <span>{job.progress || 0}%</span>
                        </div>
                        <Progress value={job.progress || 0} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {safeFormatDate(job.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.duration ? formatDuration(job.duration) : 
                       job.status === 'processing' ? (
                         <span className="text-muted-foreground">Running...</span>
                       ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/analysis/jobs/${job.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 