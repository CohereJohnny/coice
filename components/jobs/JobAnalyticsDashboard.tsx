import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Target,
  Zap,
  Activity,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  Lightbulb
} from 'lucide-react';

export interface JobAnalyticsData {
  overview: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageExecutionTime: number;
    averageSuccessRate: number;
    totalImagesProcessed: number;
    totalResultsGenerated: number;
  };
  performance: {
    timeSeriesData: Array<{
      date: string;
      completedJobs: number;
      failedJobs: number;
      averageTime: number;
      successRate: number;
    }>;
    stagePerformance: Array<{
      stageName: string;
      stageOrder: number;
      averageTime: number;
      successRate: number;
      totalExecutions: number;
      errorRate: number;
    }>;
    pipelinePerformance: Array<{
      pipelineName: string;
      totalJobs: number;
      averageTime: number;
      successRate: number;
      efficiency: number;
    }>;
  };
  trends: {
    executionTimesByDay: Array<{
      date: string;
      averageTime: number;
      jobCount: number;
    }>;
    successRatesByStage: Array<{
      stage: string;
      successRate: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    errorDistribution: Array<{
      errorType: string;
      count: number;
      percentage: number;
    }>;
  };
  recommendations: Array<{
    type: 'performance' | 'efficiency' | 'reliability' | 'optimization';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    action: string;
  }>;
}

export interface JobAnalyticsDashboardProps {
  data?: JobAnalyticsData;
  dateRange?: {
    start: Date;
    end: Date;
  };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  secondary: '#6B7280',
  accent: '#8B5CF6'
};

const PIE_COLORS = [COLORS.success, COLORS.error, COLORS.warning, COLORS.secondary];

export function JobAnalyticsDashboard({
  data,
  dateRange,
  onDateRangeChange,
  onRefresh,
  onExport,
  isLoading = false
}: JobAnalyticsDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'custom'>('7d');
  const [selectedMetric, setSelectedMetric] = useState<'executions' | 'success_rate' | 'avg_time'>('executions');

  // Format utilities
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  // Calculate insights
  const insights = useMemo(() => {
    if (!data) return null;

    const { overview, performance, trends } = data;
    
    return {
      efficiency: overview.totalJobs > 0 ? overview.completedJobs / overview.totalJobs : 0,
      processingSpeed: overview.totalImagesProcessed / (overview.totalJobs || 1),
      errorRate: overview.totalJobs > 0 ? overview.failedJobs / overview.totalJobs : 0,
      bottleneckStage: performance.stagePerformance.reduce((slowest, stage) => 
        stage.averageTime > (slowest?.averageTime || 0) ? stage : slowest, performance.stagePerformance[0]),
      fastestPipeline: performance.pipelinePerformance.reduce((fastest, pipeline) => 
        pipeline.efficiency > (fastest?.efficiency || 0) ? pipeline : fastest, performance.pipelinePerformance[0]),
      trendDirection: trends.executionTimesByDay.length > 1 ? 
        trends.executionTimesByDay[trends.executionTimesByDay.length - 1].averageTime > 
        trends.executionTimesByDay[0].averageTime ? 'up' : 'down' : 'stable'
    };
  }, [data]);

  // Loading state
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Analytics Dashboard</h1>
          <p className="text-gray-600">Performance insights and optimization recommendations</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          )}
          
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalJobs)}</p>
              <p className="text-sm text-green-600">
                {formatNumber(data.overview.completedJobs)} completed
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(data.overview.averageSuccessRate)}
              </p>
              <p className="text-sm text-gray-500">
                {insights && (
                  <span className={`flex items-center gap-1 ${
                    insights.efficiency > 0.8 ? 'text-green-600' : 
                    insights.efficiency > 0.6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {insights.efficiency > 0.8 ? <TrendingUp className="h-3 w-3" /> : 
                     insights.efficiency > 0.6 ? <TrendingDown className="h-3 w-3" /> : 
                     <AlertTriangle className="h-3 w-3" />}
                    {insights.efficiency > 0.8 ? 'Excellent' : 
                     insights.efficiency > 0.6 ? 'Good' : 'Needs attention'}
                  </span>
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Execution Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(data.overview.averageExecutionTime)}
              </p>
              <p className="text-sm text-gray-500">
                {insights && (
                  <span className={`flex items-center gap-1 ${
                    insights.trendDirection === 'down' ? 'text-green-600' : 
                    insights.trendDirection === 'up' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {insights.trendDirection === 'down' ? <TrendingDown className="h-3 w-3" /> : 
                     insights.trendDirection === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                     <Target className="h-3 w-3" />}
                    {insights.trendDirection === 'down' ? 'Improving' : 
                     insights.trendDirection === 'up' ? 'Slower' : 'Stable'}
                  </span>
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Images Processed</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.overview.totalImagesProcessed)}
              </p>
              <p className="text-sm text-gray-500">
                {insights && `${insights.processingSpeed.toFixed(1)} per job`}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Time Trends */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Execution Time Trends</h3>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="executions">Job Count</option>
              <option value="avg_time">Average Time</option>
              <option value="success_rate">Success Rate</option>
            </select>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.trends.executionTimesByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value: any) => new Date(value).toLocaleDateString()}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value: any) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  name === 'averageTime' ? formatDuration(value) :
                  name === 'jobCount' ? value :
                  formatPercentage(value),
                  name === 'averageTime' ? 'Avg Time' :
                  name === 'jobCount' ? 'Jobs' : 'Success Rate'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey={selectedMetric === 'avg_time' ? 'averageTime' : 
                         selectedMetric === 'success_rate' ? 'successRate' : 'jobCount'}
                stroke={COLORS.primary}
                fill={`${COLORS.primary}20`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Success/Failure Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Status Distribution</h3>
          
          <div className="flex items-center justify-between h-64">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: data.overview.completedJobs },
                    { name: 'Failed', value: data.overview.failedJobs }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill={COLORS.success} />
                  <Cell fill={COLORS.error} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="flex-1 pl-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-600">Completed</span>
                  </div>
                  <span className="text-sm font-medium">{data.overview.completedJobs}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-600">Failed</span>
                  </div>
                  <span className="text-sm font-medium">{data.overview.failedJobs}</span>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-sm font-medium">{data.overview.totalJobs}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Performance */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Performance Analysis</h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.performance.stagePerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="stageName" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'averageTime' ? formatDuration(value) :
                  name === 'successRate' ? formatPercentage(value) :
                  value,
                  name === 'averageTime' ? 'Avg Time' :
                  name === 'successRate' ? 'Success Rate' :
                  name === 'totalExecutions' ? 'Executions' : name
                ]}
              />
              <Legend />
              <Bar dataKey="averageTime" fill={COLORS.primary} name="Avg Time (ms)" />
              <Bar dataKey="successRate" fill={COLORS.success} name="Success Rate" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Efficiency */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Efficiency</h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.performance.pipelinePerformance} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="pipelineName" 
                tick={{ fontSize: 12 }}
                width={120}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'efficiency' ? formatPercentage(value) :
                  name === 'averageTime' ? formatDuration(value) :
                  value,
                  name === 'efficiency' ? 'Efficiency' :
                  name === 'averageTime' ? 'Avg Time' :
                  name === 'totalJobs' ? 'Total Jobs' : name
                ]}
              />
              <Legend />
              <Bar dataKey="efficiency" fill={COLORS.accent} name="Efficiency" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Optimization Recommendations</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.recommendations.map((recommendation, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  recommendation.priority === 'high' ? 'border-red-500 bg-red-50' :
                  recommendation.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        recommendation.priority === 'high' ? 'bg-red-100 text-red-700' :
                        recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {recommendation.priority}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">
                        <strong>Impact:</strong> {recommendation.impact}
                      </p>
                      <p className="text-xs text-gray-500">
                        <strong>Action:</strong> {recommendation.action}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Insights */}
      {insights && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {insights.bottleneckStage?.stageName || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Slowest Stage</div>
              <div className="text-xs text-gray-500">
                {insights.bottleneckStage ? formatDuration(insights.bottleneckStage.averageTime) : 'N/A'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {insights.fastestPipeline?.pipelineName || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Most Efficient Pipeline</div>
              <div className="text-xs text-gray-500">
                {insights.fastestPipeline ? formatPercentage(insights.fastestPipeline.efficiency) : 'N/A'} efficiency
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {formatPercentage(insights.errorRate)}
              </div>
              <div className="text-sm text-gray-600">Error Rate</div>
              <div className="text-xs text-gray-500">
                {insights.errorRate < 0.05 ? 'Excellent' : 
                 insights.errorRate < 0.15 ? 'Good' : 'Needs attention'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 