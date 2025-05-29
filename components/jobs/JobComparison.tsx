import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Clock, 
  Zap, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  X
} from 'lucide-react';

export interface JobComparisonData {
  id: string;
  pipeline_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  progress: number;
  image_count: number;
  processed_count: number;
  duration_ms?: number;
  result_summary?: {
    total_results: number;
    avg_confidence: number;
    stage_results: Record<string, number>;
  };
  performance_metrics?: {
    images_per_second: number;
    avg_processing_time: number;
    memory_usage_mb: number;
    api_calls_made: number;
  };
}

export interface JobComparisonProps {
  jobs: JobComparisonData[];
  onAddJob?: () => void;
  onRemoveJob?: (jobId: string) => void;
  maxJobs?: number;
  className?: string;
}

export function JobComparison({
  jobs,
  onAddJob,
  onRemoveJob,
  maxJobs = 4,
  className = '',
}: JobComparisonProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'results'>('overview');

  // Calculate comparison metrics
  const comparisonMetrics = useMemo(() => {
    const completedJobs = jobs.filter(job => job.status === 'completed');
    
    if (completedJobs.length === 0) return null;

    const avgDuration = completedJobs.reduce((sum, job) => sum + (job.duration_ms || 0), 0) / completedJobs.length;
    const avgImagesPerSecond = completedJobs.reduce((sum, job) => 
      sum + (job.performance_metrics?.images_per_second || 0), 0) / completedJobs.length;
    const avgConfidence = completedJobs.reduce((sum, job) => 
      sum + (job.result_summary?.avg_confidence || 0), 0) / completedJobs.length;
    
    const fastestJob = completedJobs.reduce((fastest, job) => 
      (job.duration_ms || Infinity) < (fastest.duration_ms || Infinity) ? job : fastest);
    const slowestJob = completedJobs.reduce((slowest, job) => 
      (job.duration_ms || 0) > (slowest.duration_ms || 0) ? job : slowest);

    return {
      avgDuration,
      avgImagesPerSecond,
      avgConfidence,
      fastestJob,
      slowestJob,
    };
  }, [jobs]);

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get performance indicator
  const getPerformanceIndicator = (current: number, average: number) => {
    const diff = ((current - average) / average) * 100;
    if (Math.abs(diff) < 5) return <Minus className="h-4 w-4 text-gray-500" />;
    return diff > 0 ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Comparison</h2>
          <p className="text-muted-foreground">
            Compare {jobs.length} job{jobs.length !== 1 ? 's' : ''} side-by-side
          </p>
        </div>
        
        {jobs.length < maxJobs && onAddJob && (
          <Button onClick={onAddJob} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Job
          </Button>
        )}
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No jobs selected for comparison</p>
            {onAddJob && (
              <Button onClick={onAddJob} className="mt-4" variant="outline">
                Select Jobs to Compare
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Metrics */}
          {comparisonMetrics && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Duration</p>
                      <p className="text-lg font-semibold">
                        {formatDuration(comparisonMetrics.avgDuration)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Speed</p>
                      <p className="text-lg font-semibold">
                        {comparisonMetrics.avgImagesPerSecond.toFixed(1)} img/s
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Confidence</p>
                      <p className="text-lg font-semibold">
                        {(comparisonMetrics.avgConfidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-lg font-semibold">
                        {jobs.filter(job => job.status === 'completed').length}/{jobs.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Comparison Table */}
          <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Job Overview</CardTitle>
                  <CardDescription>Basic information and status for each job</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {jobs.map((job) => (
                      <div key={job.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          {getStatusIcon(job.status)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium truncate">{job.pipeline_name}</h4>
                            {onRemoveJob && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => onRemoveJob(job.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                            <span>ID: {job.id.slice(0, 8)}...</span>
                            <Badge variant={
                              job.status === 'completed' ? 'default' :
                              job.status === 'failed' ? 'destructive' :
                              job.status === 'running' ? 'secondary' : 'outline'
                            }>
                              {job.status}
                            </Badge>
                            <span>{job.image_count} images</span>
                            {job.duration_ms && (
                              <span>{formatDuration(job.duration_ms)}</span>
                            )}
                          </div>
                          
                          {job.status === 'running' && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs">
                                <span>Progress</span>
                                <span>{job.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${job.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Processing speed and efficiency comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Job</th>
                          <th className="text-right py-2">Duration</th>
                          <th className="text-right py-2">Speed (img/s)</th>
                          <th className="text-right py-2">API Calls</th>
                          <th className="text-right py-2">Memory</th>
                          <th className="text-center py-2">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.filter(job => job.status === 'completed').map((job) => (
                          <tr key={job.id} className="border-b">
                            <td className="py-2">
                              <div>
                                <div className="font-medium">{job.pipeline_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {job.id.slice(0, 8)}...
                                </div>
                              </div>
                            </td>
                            <td className="text-right py-2">
                              {job.duration_ms ? formatDuration(job.duration_ms) : 'N/A'}
                            </td>
                            <td className="text-right py-2">
                              {job.performance_metrics?.images_per_second?.toFixed(1) || 'N/A'}
                            </td>
                            <td className="text-right py-2">
                              {job.performance_metrics?.api_calls_made || 'N/A'}
                            </td>
                            <td className="text-right py-2">
                              {job.performance_metrics?.memory_usage_mb ? 
                                `${job.performance_metrics.memory_usage_mb.toFixed(0)}MB` : 'N/A'}
                            </td>
                            <td className="text-center py-2">
                              {comparisonMetrics && job.performance_metrics?.images_per_second && 
                                getPerformanceIndicator(
                                  job.performance_metrics.images_per_second,
                                  comparisonMetrics.avgImagesPerSecond
                                )
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results">
              <Card>
                <CardHeader>
                  <CardTitle>Result Analysis</CardTitle>
                  <CardDescription>Output quality and result breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {jobs.filter(job => job.result_summary).map((job) => (
                      <div key={job.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{job.pipeline_name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {job.result_summary?.total_results} results
                            </Badge>
                            <Badge variant={
                              (job.result_summary?.avg_confidence || 0) > 0.8 ? 'default' :
                              (job.result_summary?.avg_confidence || 0) > 0.6 ? 'secondary' : 'destructive'
                            }>
                              {((job.result_summary?.avg_confidence || 0) * 100).toFixed(1)}% confidence
                            </Badge>
                          </div>
                        </div>
                        
                        {job.result_summary?.stage_results && (
                          <div className="grid gap-2 md:grid-cols-3">
                            {Object.entries(job.result_summary.stage_results).map(([stage, count]) => (
                              <div key={stage} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{stage}:</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
} 