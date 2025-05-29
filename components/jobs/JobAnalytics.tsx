import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Filter
} from 'lucide-react';

export interface JobAnalyticsData {
  id: string;
  pipeline_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  duration_ms?: number;
  image_count: number;
  processed_count: number;
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

export interface JobAnalyticsProps {
  jobs: JobAnalyticsData[];
  timeRange?: '7d' | '30d' | '90d' | 'all';
  onTimeRangeChange?: (range: '7d' | '30d' | '90d' | 'all') => void;
  className?: string;
}

export function JobAnalytics({
  jobs,
  timeRange = '30d',
  onTimeRangeChange,
  className = '',
}: JobAnalyticsProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'trends' | 'insights'>('overview');

  // Calculate analytics metrics
  const analytics = useMemo(() => {
    const completedJobs = jobs.filter(job => job.status === 'completed');
    const failedJobs = jobs.filter(job => job.status === 'failed');
    const totalJobs = jobs.length;

    if (totalJobs === 0) {
      return {
        successRate: 0,
        avgDuration: 0,
        avgImagesPerSecond: 0,
        avgConfidence: 0,
        totalImagesProcessed: 0,
        pipelineBreakdown: {},
        statusBreakdown: { completed: 0, failed: 0, running: 0, pending: 0 },
        performanceTrends: [],
        timeDistribution: {},
      };
    }

    const successRate = (completedJobs.length / totalJobs) * 100;
    const avgDuration = completedJobs.reduce((sum, job) => sum + (job.duration_ms || 0), 0) / (completedJobs.length || 1);
    const avgImagesPerSecond = completedJobs.reduce((sum, job) => 
      sum + (job.performance_metrics?.images_per_second || 0), 0) / (completedJobs.length || 1);
    const avgConfidence = completedJobs.reduce((sum, job) => 
      sum + (job.result_summary?.avg_confidence || 0), 0) / (completedJobs.length || 1);
    const totalImagesProcessed = jobs.reduce((sum, job) => sum + job.processed_count, 0);

    // Pipeline breakdown
    const pipelineBreakdown = jobs.reduce((acc, job) => {
      acc[job.pipeline_name] = (acc[job.pipeline_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Status breakdown
    const statusBreakdown = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, { completed: 0, failed: 0, running: 0, pending: 0 });

    // Performance trends (last 30 days)
    const performanceTrends = completedJobs
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(job => ({
        date: job.created_at,
        duration: job.duration_ms || 0,
        speed: job.performance_metrics?.images_per_second || 0,
        confidence: job.result_summary?.avg_confidence || 0,
      }));

    // Time distribution (by hour)
    const timeDistribution = jobs.reduce((acc, job) => {
      const hour = new Date(job.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      successRate,
      avgDuration,
      avgImagesPerSecond,
      avgConfidence,
      totalImagesProcessed,
      pipelineBreakdown,
      statusBreakdown,
      performanceTrends,
      timeDistribution,
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

  // Get trend indicator
  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 5) return null;
    
    return {
      direction: change > 0 ? 'up' : 'down',
      percentage: Math.abs(change).toFixed(1),
      icon: change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
      color: change > 0 ? 'text-green-500' : 'text-red-500',
    };
  };

  // Generate insights
  const insights = useMemo(() => {
    const insights = [];

    if (analytics.successRate < 80) {
      insights.push({
        type: 'warning',
        title: 'Low Success Rate',
        description: `Only ${analytics.successRate.toFixed(1)}% of jobs complete successfully`,
        action: 'Review failed jobs and improve pipeline configuration',
      });
    }

    if (analytics.avgImagesPerSecond < 1) {
      insights.push({
        type: 'info',
        title: 'Processing Speed',
        description: `Average processing speed is ${analytics.avgImagesPerSecond.toFixed(2)} images/second`,
        action: 'Consider optimizing pipeline or upgrading infrastructure',
      });
    }

    if (analytics.avgConfidence < 0.7) {
      insights.push({
        type: 'warning',
        title: 'Low Confidence Results',
        description: `Average confidence is ${(analytics.avgConfidence * 100).toFixed(1)}%`,
        action: 'Review prompts and consider refining analysis criteria',
      });
    }

    const topPipeline = Object.entries(analytics.pipelineBreakdown)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topPipeline) {
      insights.push({
        type: 'success',
        title: 'Most Used Pipeline',
        description: `"${topPipeline[0]}" accounts for ${((topPipeline[1] / jobs.length) * 100).toFixed(1)}% of jobs`,
        action: 'Consider creating templates based on this successful pattern',
      });
    }

    return insights;
  }, [analytics, jobs.length]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Analytics</h2>
          <p className="text-muted-foreground">
            Performance insights and trends for {jobs.length} jobs
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-32">
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
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{formatDuration(analytics.avgDuration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Speed</p>
                <p className="text-2xl font-bold">{analytics.avgImagesPerSecond.toFixed(1)} img/s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{(analytics.avgConfidence * 100).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Job Status Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.statusBreakdown).map(([status, count]) => {
                    const percentage = jobs.length > 0 ? (count / jobs.length) * 100 : 0;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            status === 'completed' ? 'default' :
                            status === 'failed' ? 'destructive' :
                            status === 'running' ? 'secondary' : 'outline'
                          }>
                            {status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{count} jobs</span>
                        </div>
                        <span className="font-medium">{percentage.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Pipeline Usage</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.pipelineBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([pipeline, count]) => {
                      const percentage = jobs.length > 0 ? (count / jobs.length) * 100 : 0;
                      return (
                        <div key={pipeline} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate font-medium">{pipeline}</span>
                            <span className="text-muted-foreground">{count} jobs ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Activity by Hour</span>
                </CardTitle>
                <CardDescription>Job submission patterns throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const count = analytics.timeDistribution[hour] || 0;
                    const maxCount = Math.max(...Object.values(analytics.timeDistribution));
                    const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={hour} className="text-center">
                        <div 
                          className="w-full h-8 bg-blue-100 rounded mb-1 flex items-end justify-center"
                          style={{ 
                            backgroundColor: intensity > 0 ? `hsl(220, 100%, ${100 - intensity * 0.5}%)` : '#f3f4f6'
                          }}
                          title={`${hour}:00 - ${count} jobs`}
                        >
                          {count > 0 && (
                            <span className="text-xs font-medium text-blue-800">{count}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{hour}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
                <CardDescription>Processing speed and efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Images Processed</h4>
                    <p className="text-2xl font-bold">{analytics.totalImagesProcessed.toLocaleString()}</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Best Speed</h4>
                    <p className="text-2xl font-bold">
                      {Math.max(...jobs
                        .filter(j => j.performance_metrics?.images_per_second)
                        .map(j => j.performance_metrics!.images_per_second)
                      ).toFixed(1)} img/s
                    </p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Best Confidence</h4>
                    <p className="text-2xl font-bold">
                      {(Math.max(...jobs
                        .filter(j => j.result_summary?.avg_confidence)
                        .map(j => j.result_summary!.avg_confidence)
                      ) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>How job performance has changed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Trend analysis requires multiple completed jobs over time. 
                  Current data shows {analytics.performanceTrends.length} data points.
                </p>
                
                {analytics.performanceTrends.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Recent Trend</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on last {Math.min(7, analytics.performanceTrends.length)} jobs
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <div className="space-y-4">
            {insights.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="font-medium mb-2">Everything looks good!</h3>
                  <p className="text-sm text-muted-foreground">
                    No issues detected in your job performance.
                  </p>
                </CardContent>
              </Card>
            ) : (
              insights.map((insight, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {insight.type === 'warning' && (
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        )}
                        {insight.type === 'info' && (
                          <Activity className="h-5 w-5 text-blue-500" />
                        )}
                        {insight.type === 'success' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                        <p className="text-sm font-medium mt-2 text-blue-600">
                          💡 {insight.action}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 