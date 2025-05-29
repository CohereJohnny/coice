'use client';

import { useState, useEffect } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface Job {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
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
  errorMessage?: string;
  resultsSummary?: any;
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
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadJobs();
    // Set up polling for active jobs
    const interval = setInterval(() => {
      loadJobs();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
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

  const loadJobDetails = async (jobId: string) => {
    try {
      setLoadingDetails(true);
      
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to load job details');
      }
      
      const data = await response.json();
      setSelectedJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }
      
      await loadJobs(); // Refresh the job list
      setSelectedJob(null); // Close details if it was the cancelled job
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
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
                          <span>{job.processedImages} / {job.totalImages} images</span>
                          <span>{job.progress || 0}%</span>
                        </div>
                        <Progress value={job.progress || 0} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadJobDetails(job.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Job Details</DialogTitle>
                              <DialogDescription>
                                Detailed information about job {job.id}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {loadingDetails ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading details...
                              </div>
                            ) : selectedJob ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium">Pipeline</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedJob.job.pipeline.name}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Library</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedJob.job.library.name}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Status</h4>
                                    <Badge className={getStatusColor(selectedJob.job.status)}>
                                      {selectedJob.job.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Progress</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedJob.job.processedImages} / {selectedJob.job.totalImages} images
                                    </p>
                                  </div>
                                </div>
                                
                                {selectedJob.progress && (
                                  <div>
                                    <h4 className="font-medium mb-2">Current Progress</h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span>{selectedJob.progress.stage}</span>
                                        <span>{selectedJob.progress.percentage}%</span>
                                      </div>
                                      <Progress value={selectedJob.progress.percentage} />
                                      {selectedJob.progress.currentImage && (
                                        <p className="text-sm text-muted-foreground">
                                          Processing: {selectedJob.progress.currentImage}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {selectedJob.job.errorMessage && (
                                  <div>
                                    <h4 className="font-medium mb-2 text-red-600">Error</h4>
                                    <p className="text-sm bg-red-50 p-2 rounded">
                                      {selectedJob.job.errorMessage}
                                    </p>
                                  </div>
                                )}
                                
                                {selectedJob.results && selectedJob.results.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Results</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedJob.results.length} results available
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </DialogContent>
                        </Dialog>
                        
                        {(job.status === 'pending' || job.status === 'processing') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelJob(job.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
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