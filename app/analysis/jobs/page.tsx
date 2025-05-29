'use client'

import { useState, useEffect, useMemo } from 'react';
import { AuthGuard } from '@/app/components/auth/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobComparison, JobComparisonData } from '@/components/jobs/JobComparison';
import { JobAnalytics, JobAnalyticsData } from '@/components/jobs/JobAnalytics';
import { useJobSubscription } from '@/app/hooks/useJobSubscription';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  MoreHorizontal,
  Plus,
  BarChart3,
  History,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface JobData {
  id: string;
  pipeline_id: string;
  pipeline_name: string;
  library_id: number;
  library_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  updated_at: string;
  image_count: number;
  processed_count: number;
  duration_ms?: number;
  error_message?: string;
  performance_metrics?: {
    images_per_second: number;
    avg_processing_time: number;
    memory_usage_mb: number;
    api_calls_made: number;
  };
  result_summary?: {
    total_results: number;
    avg_confidence: number;
    stage_results: Record<string, number>;
  };
}

export default function JobHistoryPage() {
  // State management
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [comparisonJobs, setComparisonJobs] = useState<JobData[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'running' | 'completed' | 'failed'>('all');
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'duration_ms' | 'progress'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'history' | 'comparison' | 'analytics'>('history');

  // Real-time subscriptions
  const { isConnected: isRealTimeConnected } = useJobSubscription({
    onJobUpdate: (job: any) => {
      setJobs(prev => prev.map(j => j.id === job.id ? { 
        ...j, 
        status: job.status as JobData['status'],
        progress: job.progress || j.progress,
        processed_count: job.processed_images || j.processed_count,
        updated_at: job.updated_at || new Date().toISOString()
      } : j));
    },
    onJobCompleted: (job: any) => {
      setJobs(prev => prev.map(j => j.id === job.id ? { 
        ...j, 
        status: 'completed' as const, 
        progress: 100,
        processed_count: job.total_images || j.image_count,
        updated_at: new Date().toISOString()
      } : j));
    },
    onJobFailed: (job: any) => {
      setJobs(prev => prev.map(j => j.id === job.id ? { 
        ...j, 
        status: 'failed' as const,
        error_message: job.error_message || 'Job failed',
        updated_at: new Date().toISOString()
      } : j));
    },
  });

  // Load jobs data
  useEffect(() => {
    const loadJobs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/jobs/history');
        if (!response.ok) {
          throw new Error('Failed to load job history');
        }
        const data = await response.json();
        setJobs(data.jobs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    loadJobs();
  }, [timeRange]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    let filtered = [...jobs];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(job => 
        job.pipeline_name.toLowerCase().includes(searchLower) ||
        job.library_name.toLowerCase().includes(searchLower) ||
        job.id.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Pipeline filter
    if (pipelineFilter !== 'all') {
      filtered = filtered.filter(job => job.pipeline_name === pipelineFilter);
    }

    // Time range filter
    const now = new Date();
    const cutoff = new Date();
    switch (timeRange) {
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoff.setDate(now.getDate() - 90);
        break;
      default:
        cutoff.setFullYear(2000); // Show all
    }
    filtered = filtered.filter(job => new Date(job.created_at) >= cutoff);

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];
      
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [jobs, searchTerm, statusFilter, pipelineFilter, timeRange, sortBy, sortOrder]);

  // Get unique pipelines for filter
  const uniquePipelines = useMemo(() => {
    const pipelines = [...new Set(jobs.map(job => job.pipeline_name))];
    return pipelines.sort();
  }, [jobs]);

  // Job selection handlers
  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const selectAllJobs = () => {
    setSelectedJobs(new Set(filteredJobs.map(job => job.id)));
  };

  const clearSelection = () => {
    setSelectedJobs(new Set());
  };

  // Comparison handlers
  const addToComparison = (job: JobData) => {
    if (comparisonJobs.length < 4 && !comparisonJobs.find(j => j.id === job.id)) {
      setComparisonJobs([...comparisonJobs, job]);
    }
  };

  const removeFromComparison = (jobId: string) => {
    setComparisonJobs(comparisonJobs.filter(job => job.id !== jobId));
  };

  // Bulk operations
  const deleteSelectedJobs = async () => {
    if (selectedJobs.size === 0) return;
    
    try {
      const response = await fetch('/api/jobs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: Array.from(selectedJobs) }),
      });
      
      if (!response.ok) throw new Error('Failed to delete jobs');
      
      setJobs(jobs.filter(job => !selectedJobs.has(job.id)));
      setSelectedJobs(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete jobs');
    }
  };

  // Export jobs
  const exportJobs = () => {
    const exportData = filteredJobs.map(job => ({
      id: job.id,
      pipeline: job.pipeline_name,
      library: job.library_name,
      status: job.status,
      created: job.created_at,
      duration: job.duration_ms ? `${Math.floor(job.duration_ms / 1000)}s` : 'N/A',
      images: job.image_count,
      processed: job.processed_count,
      progress: `${job.progress}%`,
    }));

    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job History</h1>
            <p className="text-muted-foreground">
              View and analyze your analysis job history
              {isRealTimeConnected && (
                <span className="ml-2 inline-flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  Live updates
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={exportJobs}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            {selectedJobs.size > 0 && (
              <Button variant="destructive" onClick={deleteSelectedJobs}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedJobs.size})
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <BarChart3 className="h-4 w-4 mr-2" />
              Comparison
              {comparisonJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {comparisonJobs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid gap-4 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search jobs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pipelines</SelectItem>
                      {uniquePipelines.map(pipeline => (
                        <SelectItem key={pipeline} value={pipeline}>{pipeline}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                    <SelectTrigger>
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                    const [field, order] = value.split('-');
                    setSortBy(field as any);
                    setSortOrder(order as any);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at-desc">Newest first</SelectItem>
                      <SelectItem value="created_at-asc">Oldest first</SelectItem>
                      <SelectItem value="updated_at-desc">Recently updated</SelectItem>
                      <SelectItem value="duration_ms-desc">Longest duration</SelectItem>
                      <SelectItem value="duration_ms-asc">Shortest duration</SelectItem>
                      <SelectItem value="progress-desc">Most progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(selectedJobs.size > 0 || filteredJobs.length !== jobs.length) && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-muted-foreground">
                        Showing {filteredJobs.length} of {jobs.length} jobs
                      </span>
                      {selectedJobs.size > 0 && (
                        <span className="text-sm font-medium">
                          {selectedJobs.size} selected
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {selectedJobs.size === 0 ? (
                        <Button variant="outline" size="sm" onClick={selectAllJobs}>
                          Select All
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={clearSelection}>
                          Clear Selection
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job List */}
            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading job history...</p>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <History className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No jobs found matching your criteria</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <Card key={job.id} className={`${selectedJobs.has(job.id) ? 'ring-2 ring-blue-500' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(job.id)}
                          onChange={() => toggleJobSelection(job.id)}
                          className="h-4 w-4"
                        />
                        
                        <div className="flex-shrink-0">
                          {getStatusIcon(job.status)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-medium truncate">{job.pipeline_name}</h4>
                              <Badge variant={
                                job.status === 'completed' ? 'default' :
                                job.status === 'failed' ? 'destructive' :
                                job.status === 'running' ? 'secondary' : 'outline'
                              }>
                                {job.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{job.library_name}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addToComparison(job)}
                                disabled={comparisonJobs.length >= 4 || comparisonJobs.find(j => j.id === job.id) !== undefined}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Compare
                              </Button>
                              
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/analysis/jobs/${job.id}`}>
                                  View Details
                                </a>
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-6 mt-2 text-sm text-muted-foreground">
                            <span>ID: {job.id.slice(0, 8)}...</span>
                            <span>{job.image_count} images</span>
                            <span>{formatDate(job.created_at)}</span>
                            {job.duration_ms && <span>{formatDuration(job.duration_ms)}</span>}
                          </div>
                          
                          {job.status === 'running' && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>{job.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${job.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {job.status === 'failed' && job.error_message && (
                            <p className="text-sm text-red-600 mt-2">{job.error_message}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison">
            <JobComparison
              jobs={comparisonJobs as JobComparisonData[]}
              onAddJob={() => setActiveTab('history')}
              onRemoveJob={removeFromComparison}
              maxJobs={4}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <JobAnalytics
              jobs={filteredJobs as JobAnalyticsData[]}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
} 