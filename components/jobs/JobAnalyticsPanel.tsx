// Job Analytics Panel Component
// Sprint 11 Task 6.3: Add data visualization components

'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  AlertTriangle,
  Activity
} from 'lucide-react';

interface JobAnalytics {
  performance: {
    totalExecutionTime: number;
    avgStageTime: number;
    slowestStage: { name: string; time: number };
    fastestStage: { name: string; time: number };
    throughput: number;
  };
  quality: {
    totalResults: number;
    successRate: number;
    avgConfidence: number;
    confidenceDistribution: Array<{ range: string; count: number }>;
  };
  errors: {
    totalErrors: number;
    errorsByType: Array<{ type: string; count: number }>;
    criticalErrors: number;
    resolutionRate: number;
  };
  stages: Array<{
    name: string;
    order: number;
    results: number;
    successRate: number;
    avgConfidence: number;
    avgTime: number;
    errors: number;
  }>;
  timeline: Array<{
    timestamp: string;
    event: 'started' | 'stage_completed' | 'completed' | 'failed';
    stage?: string;
    details?: string;
  }>;
}

interface JobAnalyticsPanelProps {
  jobId: string;
  analytics: JobAnalytics | null;
  loading: boolean;
  onRefresh: () => void;
}

export function JobAnalyticsPanel({ 
  jobId, 
  analytics, 
  loading, 
  onRefresh 
}: JobAnalyticsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Job Analytics</h3>
          <Button variant="outline" size="sm" disabled>
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Analytics Available</h3>
        <p className="text-gray-500 mb-4">Analytics data is not available for this job.</p>
        <Button onClick={onRefresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Job Analytics</h3>
        <Button onClick={onRefresh} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Execution Time"
          value={`${analytics.performance.totalExecutionTime}s`}
          icon={<Clock className="h-4 w-4" />}
          trend={analytics.performance.throughput > 0 ? `${analytics.performance.throughput.toFixed(1)}/min` : undefined}
        />
        
        <MetricCard
          title="Success Rate"
          value={`${analytics.quality.successRate}%`}
          icon={<CheckCircle className="h-4 w-4" />}
          trend={`${analytics.quality.totalResults} results`}
          variant={analytics.quality.successRate >= 90 ? 'success' : analytics.quality.successRate >= 70 ? 'warning' : 'error'}
        />
        
        <MetricCard
          title="Avg Confidence"
          value={`${analytics.quality.avgConfidence}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          variant={analytics.quality.avgConfidence >= 80 ? 'success' : analytics.quality.avgConfidence >= 60 ? 'warning' : 'error'}
        />
        
        <MetricCard
          title="Total Errors"
          value={analytics.errors.totalErrors.toString()}
          icon={<XCircle className="h-4 w-4" />}
          trend={analytics.errors.criticalErrors > 0 ? `${analytics.errors.criticalErrors} critical` : undefined}
          variant={analytics.errors.totalErrors === 0 ? 'success' : analytics.errors.criticalErrors > 0 ? 'error' : 'warning'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confidence Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.quality.confidenceDistribution.map((range, index) => (
                <div key={range.range} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{range.range}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${analytics.quality.totalResults > 0 ? (range.count / analytics.quality.totalResults) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{range.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stage Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.stages.map((stage, index) => (
                <div key={stage.name} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{stage.name}</span>
                    <Badge variant={stage.successRate >= 90 ? "default" : stage.successRate >= 70 ? "secondary" : "destructive"}>
                      {stage.successRate}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div>Results: {stage.results}</div>
                    <div>Time: {stage.avgTime.toFixed(1)}s</div>
                    <div>Errors: {stage.errors}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Analysis */}
      {analytics.errors.totalErrors > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>Error Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-3">Errors by Type</h4>
                <div className="space-y-2">
                  {analytics.errors.errorsByType.map((error, index) => (
                    <div key={error.type} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{error.type.replace('_', ' ')}</span>
                      <Badge variant="secondary">{error.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-3">Resolution Status</h4>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.errors.resolutionRate}%</div>
                  <div className="text-sm text-gray-600">Resolution Rate</div>
                  {analytics.errors.criticalErrors > 0 && (
                    <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                      <div className="text-sm text-red-700">
                        {analytics.errors.criticalErrors} critical error{analytics.errors.criticalErrors !== 1 ? 's' : ''} require attention
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.timeline.map((event, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  event.event === 'completed' ? 'bg-green-500' :
                  event.event === 'failed' ? 'bg-red-500' :
                  event.event === 'stage_completed' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium capitalize">
                      {event.event.replace('_', ' ')}
                      {event.stage && <span className="text-gray-500"> - {event.stage}</span>}
                    </p>
                    <time className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </time>
                  </div>
                  {event.details && (
                    <p className="text-xs text-gray-600 mt-1">{event.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

function MetricCard({ title, value, icon, trend, variant = 'default' }: MetricCardProps) {
  const variants = {
    default: 'border-gray-200',
    success: 'border-green-200 bg-green-50',
    warning: 'border-orange-200 bg-orange-50',
    error: 'border-red-200 bg-red-50'
  };

  return (
    <Card className={variants[variant]}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium text-gray-600">{title}</span>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">{trend}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 