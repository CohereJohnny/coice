'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  Zap, 
  Eye, 
  MousePointer, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useWebVitals, type WebVitalsMetrics } from '@/lib/hooks/useWebVitals';

interface WebVitalsDashboardProps {
  showRecommendations?: boolean;
  reportToAnalytics?: boolean;
  debugMode?: boolean;
  className?: string;
}

export function WebVitalsDashboard({
  showRecommendations = true,
  reportToAnalytics = false,
  debugMode = false,
  className
}: WebVitalsDashboardProps) {
  const {
    metrics,
    isLoading,
    history,
    getRecommendations,
    isGoodPerformance,
    needsImprovement
  } = useWebVitals({ reportToAnalytics, debugMode, trackCustomMetrics: true });

  const recommendations = getRecommendations();

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Core Web Vitals</h3>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Core Web Vitals</h3>
          <PerformanceBadge grade={metrics.performanceGrade} />
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Core Web Vitals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <WebVitalCard
          title="Largest Contentful Paint"
          subtitle="LCP"
          value={metrics.LCP}
          unit="ms"
          icon={<Eye className="h-4 w-4" />}
          thresholds={{ good: 2500, poor: 4000 }}
          description="Time for largest element to load"
        />
        
        <WebVitalCard
          title="Interaction to Next Paint"
          subtitle="INP (replaces FID)"
          value={metrics.INP}
          unit="ms"
          icon={<MousePointer className="h-4 w-4" />}
          thresholds={{ good: 200, poor: 500 }}
          description="Responsiveness to user interactions"
        />
        
        <WebVitalCard
          title="Cumulative Layout Shift"
          subtitle="CLS"
          value={metrics.CLS}
          unit=""
          icon={<Activity className="h-4 w-4" />}
          thresholds={{ good: 0.1, poor: 0.25 }}
          description="Visual stability of page elements"
          formatValue={(val) => val?.toFixed(3)}
        />
        
        <WebVitalCard
          title="First Contentful Paint"
          subtitle="FCP"
          value={metrics.FCP}
          unit="ms"
          icon={<Zap className="h-4 w-4" />}
          thresholds={{ good: 1800, poor: 3000 }}
          description="Time for first content to appear"
        />
        
        <WebVitalCard
          title="Time to First Byte"
          subtitle="TTFB"
          value={metrics.TTFB}
          unit="ms"
          icon={<Clock className="h-4 w-4" />}
          thresholds={{ good: 800, poor: 1800 }}
          description="Server response time"
        />
        
        <WebVitalCard
          title="Custom: Image Load Time"
          subtitle="Avg Image Loading"
          value={metrics.imageLoadTime}
          unit="ms"
          icon={<TrendingUp className="h-4 w-4" />}
          thresholds={{ good: 500, poor: 1500 }}
          description="Average image loading performance"
        />
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Performance</span>
              <div className="flex items-center gap-2">
                {isGoodPerformance ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm capitalize">{metrics.performanceGrade}</span>
              </div>
            </div>
            
            {metrics.apiResponseTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API Response Time</span>
                <span className="text-sm font-mono">{metrics.apiResponseTime.toFixed(0)}ms</span>
              </div>
            )}
            
            {metrics.carouselLoadTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Carousel Load Time</span>
                <span className="text-sm font-mono">{metrics.carouselLoadTime.toFixed(0)}ms</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm">{new Date(metrics.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Performance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-orange-800 dark:text-orange-200">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance History */}
      {history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Tracking {history.length} measurements over time
              {/* Could add a mini chart here in the future */}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface WebVitalCardProps {
  title: string;
  subtitle: string;
  value: number | null;
  unit: string;
  icon: React.ReactNode;
  thresholds: { good: number; poor: number };
  description: string;
  formatValue?: (value: number) => string;
}

function WebVitalCard({
  title,
  subtitle,
  value,
  unit,
  icon,
  thresholds,
  description,
  formatValue
}: WebVitalCardProps) {
  const getStatus = (val: number | null): 'excellent' | 'good' | 'needs-improvement' | 'poor' => {
    if (val === null) return 'good';
    
    // For CLS, smaller is better
    if (unit === '') {
      if (val <= thresholds.good / 2) return 'excellent';
      if (val <= thresholds.good) return 'good';
      if (val <= thresholds.poor) return 'needs-improvement';
      return 'poor';
    }
    
    // For other metrics, smaller is better
    if (val <= thresholds.good * 0.6) return 'excellent';
    if (val <= thresholds.good) return 'good';
    if (val <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  };

  const status = getStatus(value);
  const displayValue = value !== null 
    ? formatValue ? formatValue(value) : Math.round(value).toString()
    : 'N/A';

  const statusColors = {
    excellent: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-green-600 bg-green-50 border-green-200',
    'needs-improvement': 'text-orange-600 bg-orange-50 border-orange-200',
    poor: 'text-red-600 bg-red-50 border-red-200'
  };

  const progressValue = value !== null 
    ? Math.min(100, (value / thresholds.poor) * 100)
    : 0;

  return (
    <Card className={`transition-all duration-200 ${statusColors[status]}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{subtitle}</span>
          </div>
          <Badge 
            variant={status === 'excellent' || status === 'good' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {status === 'excellent' ? 'Excellent' : 
             status === 'good' ? 'Good' : 
             status === 'needs-improvement' ? 'Needs Improvement' : 'Poor'}
          </Badge>
        </div>
        
        <div className="mb-1">
          <div className="text-2xl font-bold">
            {displayValue}
            {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </div>
        </div>
        
        <div className="mb-3">
          <Progress 
            value={progressValue} 
            className="h-2"
            // Color based on status
          />
        </div>
        
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function PerformanceBadge({ grade }: { grade: string }) {
  const badges = {
    excellent: { variant: 'default' as const, className: 'bg-green-100 text-green-800 border-green-200' },
    good: { variant: 'default' as const, className: 'bg-green-100 text-green-800 border-green-200' },
    'needs-improvement': { variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800 border-orange-200' },
    poor: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800 border-red-200' }
  };

  const config = badges[grade as keyof typeof badges] || badges.good;

  return (
    <Badge variant={config.variant} className={config.className}>
      {grade.charAt(0).toUpperCase() + grade.slice(1)}
    </Badge>
  );
} 