import React, { useState, useMemo, useCallback } from 'react';
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
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell
} from 'recharts';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Equal,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  Plus,
  Minus,
  Download,
  RefreshCw,
  Filter,
  Lightbulb,
  TestTube
} from 'lucide-react';

export interface JobComparisonData {
  jobs: Array<{
    id: string;
    name: string;
    pipelineName: string;
    startTime: string;
    endTime: string;
    status: 'completed' | 'failed' | 'running';
    totalImages: number;
    processedImages: number;
    successRate: number;
    averageExecutionTime: number;
    totalCost?: number;
    errorCount: number;
    stages: Array<{
      stageName: string;
      stageOrder: number;
      executionTime: number;
      successRate: number;
      promptName: string;
      promptVersion: string;
    }>;
  }>;
  metrics: {
    performanceComparison: Array<{
      metric: string;
      jobs: Array<{
        jobId: string;
        value: number;
        trend: 'up' | 'down' | 'stable';
      }>;
    }>;
    promptEffectiveness: Array<{
      promptName: string;
      promptVersion: string;
      averageSuccessRate: number;
      averageExecutionTime: number;
      totalUsage: number;
      confidenceScore: number;
      cost: number;
    }>;
    stageComparison: Array<{
      stageName: string;
      jobs: Array<{
        jobId: string;
        executionTime: number;
        successRate: number;
        errorRate: number;
      }>;
    }>;
  };
  insights: {
    bestPerformingJob: string;
    worstPerformingJob: string;
    mostEfficientPrompt: string;
    recommendedOptimizations: Array<{
      type: 'performance' | 'cost' | 'quality' | 'reliability';
      priority: 'high' | 'medium' | 'low';
      suggestion: string;
      expectedImprovement: string;
      implementation: string;
    }>;
    abTestResults?: {
      variant: string;
      baseline: string;
      improvement: number;
      confidenceLevel: number;
      significance: boolean;
    };
  };
}

export interface JobComparisonToolsProps {
  data?: JobComparisonData;
  selectedJobIds: string[];
  onJobSelection: (jobIds: string[]) => void;
  onStartABTest?: (testConfig: ABTestConfig) => void;
  onExportComparison?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface ABTestConfig {
  name: string;
  description: string;
  variants: Array<{
    name: string;
    promptId: string;
    trafficPercent: number;
  }>;
  duration: number; // hours
  successMetric: 'success_rate' | 'execution_time' | 'cost' | 'confidence';
  minimumSampleSize: number;
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  neutral: '#6B7280'
};

export function JobComparisonTools({
  data,
  selectedJobIds,
  onJobSelection,
  onStartABTest,
  onExportComparison,
  isLoading = false,
  className = ''
}: JobComparisonToolsProps) {
  const [activeTab, setActiveTab] = useState<'performance' | 'prompts' | 'stages' | 'abtest'>('performance');
  const [showABTestModal, setShowABTestModal] = useState(false);
  const [abTestConfig, setABTestConfig] = useState<ABTestConfig>({
    name: '',
    description: '',
    variants: [
      { name: 'Control', promptId: '', trafficPercent: 50 },
      { name: 'Variant A', promptId: '', trafficPercent: 50 }
    ],
    duration: 24,
    successMetric: 'success_rate',
    minimumSampleSize: 100
  });

  // Format utilities
  const formatDuration = useCallback((ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    return `${(minutes / 60).toFixed(1)}h`;
  }, []);

  const formatPercentage = useCallback((value: number) => `${(value * 100).toFixed(1)}%`, []);

  const formatCurrency = useCallback((value: number) => `$${value.toFixed(2)}`, []);

  // Get comparison insights
  const comparisonInsights = useMemo(() => {
    if (!data || selectedJobIds.length < 2) return null;

    const selectedJobs = data.jobs.filter(job => selectedJobIds.includes(job.id));
    
    const avgSuccessRate = selectedJobs.reduce((sum, job) => sum + job.successRate, 0) / selectedJobs.length;
    const avgExecutionTime = selectedJobs.reduce((sum, job) => sum + job.averageExecutionTime, 0) / selectedJobs.length;
    const totalImages = selectedJobs.reduce((sum, job) => sum + job.totalImages, 0);
    
    const differences = [];
    
    // Success rate variance
    const successRates = selectedJobs.map(job => job.successRate);
    const successRateVariance = Math.sqrt(successRates.reduce((sum, rate) => sum + Math.pow(rate - avgSuccessRate, 2), 0) / successRates.length);
    
    if (successRateVariance > 0.1) {
      differences.push({
        type: 'success_rate',
        variance: successRateVariance,
        impact: 'high',
        description: 'Significant variance in success rates between jobs'
      });
    }
    
    // Execution time variance
    const executionTimes = selectedJobs.map(job => job.averageExecutionTime);
    const timeVariance = Math.sqrt(executionTimes.reduce((sum, time) => sum + Math.pow(time - avgExecutionTime, 2), 0) / executionTimes.length);
    
    if (timeVariance > 1000) { // 1 second variance
      differences.push({
        type: 'execution_time',
        variance: timeVariance,
        impact: 'medium',
        description: 'Notable differences in execution times'
      });
    }

    return {
      avgSuccessRate,
      avgExecutionTime,
      totalImages,
      differences,
      bestJob: selectedJobs.reduce((best, job) => 
        job.successRate > best.successRate ? job : best, selectedJobs[0]),
      worstJob: selectedJobs.reduce((worst, job) => 
        job.successRate < worst.successRate ? job : worst, selectedJobs[0])
    };
  }, [data, selectedJobIds]);

  // Performance comparison chart data
  const performanceChartData = useMemo(() => {
    if (!data || selectedJobIds.length === 0) return [];

    return data.jobs
      .filter(job => selectedJobIds.includes(job.id))
      .map(job => ({
        name: job.name,
        successRate: job.successRate * 100,
        executionTime: job.averageExecutionTime / 1000, // Convert to seconds
        processedImages: job.processedImages,
        errorRate: (job.errorCount / job.totalImages) * 100
      }));
  }, [data, selectedJobIds]);

  // Stage comparison data
  const stageComparisonData = useMemo(() => {
    if (!data || selectedJobIds.length === 0) return [];

    const stageMap = new Map();
    
    data.jobs
      .filter(job => selectedJobIds.includes(job.id))
      .forEach(job => {
        job.stages.forEach(stage => {
          const key = stage.stageName;
          if (!stageMap.has(key)) {
            stageMap.set(key, {
              stageName: stage.stageName,
              jobs: []
            });
          }
          stageMap.get(key).jobs.push({
            jobName: job.name,
            executionTime: stage.executionTime,
            successRate: stage.successRate * 100
          });
        });
      });

    return Array.from(stageMap.values());
  }, [data, selectedJobIds]);

  // Handle A/B test configuration
  const handleStartABTest = useCallback(() => {
    if (onStartABTest && abTestConfig.name && abTestConfig.variants.every(v => v.promptId)) {
      onStartABTest(abTestConfig);
      setShowABTestModal(false);
      // Reset config
      setABTestConfig({
        name: '',
        description: '',
        variants: [
          { name: 'Control', promptId: '', trafficPercent: 50 },
          { name: 'Variant A', promptId: '', trafficPercent: 50 }
        ],
        duration: 24,
        successMetric: 'success_rate',
        minimumSampleSize: 100
      });
    }
  }, [onStartABTest, abTestConfig]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitCompare className="h-6 w-6" />
            Job Comparison Tools
          </h2>
          <p className="text-gray-600">
            Compare job performance, analyze prompt effectiveness, and run A/B tests
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowABTestModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <TestTube className="h-4 w-4" />
            Start A/B Test
          </button>

          {onExportComparison && (
            <button
              onClick={onExportComparison}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedJobIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">
                Comparing {selectedJobIds.length} Job{selectedJobIds.length !== 1 ? 's' : ''}
              </h3>
              {comparisonInsights && (
                <p className="text-sm text-blue-700 mt-1">
                  Avg Success Rate: {formatPercentage(comparisonInsights.avgSuccessRate)} • 
                  Avg Execution Time: {formatDuration(comparisonInsights.avgExecutionTime)} • 
                  Total Images: {comparisonInsights.totalImages.toLocaleString()}
                </p>
              )}
            </div>
            
            <button
              onClick={() => onJobSelection([])}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'performance', label: 'Performance', icon: BarChart3 },
            { id: 'prompts', label: 'Prompt Analysis', icon: Target },
            { id: 'stages', label: 'Stage Comparison', icon: Activity },
            { id: 'abtest', label: 'A/B Testing', icon: TestTube }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Performance Comparison Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {selectedJobIds.length < 2 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <GitCompare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select Jobs to Compare
                </h3>
                <p className="text-gray-600">
                  Choose 2 or more jobs to see performance comparisons and insights
                </p>
              </div>
            )}

            {selectedJobIds.length >= 2 && performanceChartData.length > 0 && (
              <>
                {/* Key Differences */}
                {comparisonInsights?.differences && comparisonInsights.differences.length > 0 && (
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Differences</h3>
                    <div className="space-y-3">
                      {comparisonInsights.differences.map((diff, index) => (
                        <div
                          key={index}
                          className={`flex items-start gap-3 p-3 rounded-lg ${
                            diff.impact === 'high' ? 'bg-red-50 border border-red-200' :
                            diff.impact === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                            'bg-blue-50 border border-blue-200'
                          }`}
                        >
                          <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                            diff.impact === 'high' ? 'text-red-500' :
                            diff.impact === 'medium' ? 'text-yellow-500' :
                            'text-blue-500'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">{diff.description}</p>
                            <p className="text-sm text-gray-600">
                              Variance: {diff.variance.toFixed(3)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Metrics Chart */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                  
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={performanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'successRate' || name === 'errorRate' ? `${value.toFixed(1)}%` :
                          name === 'executionTime' ? `${value.toFixed(1)}s` :
                          value.toLocaleString(),
                          name === 'successRate' ? 'Success Rate' :
                          name === 'errorRate' ? 'Error Rate' :
                          name === 'executionTime' ? 'Execution Time' :
                          name === 'processedImages' ? 'Processed Images' : name
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="successRate" fill={COLORS.success} name="Success Rate %" />
                      <Bar yAxisId="left" dataKey="errorRate" fill={COLORS.error} name="Error Rate %" />
                      <Bar yAxisId="right" dataKey="executionTime" fill={COLORS.primary} name="Execution Time (s)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Job Performance Radar Chart */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Profile</h3>
                  
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={performanceChartData.map(job => ({
                      ...job,
                      successRate: job.successRate,
                      speed: 100 - (job.executionTime / Math.max(...performanceChartData.map(j => j.executionTime)) * 100),
                      reliability: 100 - job.errorRate,
                      throughput: (job.processedImages / Math.max(...performanceChartData.map(j => j.processedImages)) * 100)
                    }))}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="Success Rate" dataKey="successRate" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.1} />
                      <Radar name="Speed" dataKey="speed" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.1} />
                      <Radar name="Reliability" dataKey="reliability" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.1} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* Prompt Analysis Tab */}
        {activeTab === 'prompts' && (
          <div className="space-y-6">
            {data?.metrics.promptEffectiveness && data.metrics.promptEffectiveness.length > 0 ? (
              <>
                {/* Prompt Effectiveness Overview */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Prompt Effectiveness Analysis</h3>
                  
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={data.metrics.promptEffectiveness}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="averageExecutionTime" 
                        name="Execution Time (ms)"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        dataKey="averageSuccessRate" 
                        name="Success Rate"
                        domain={[0, 1]}
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatPercentage}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'averageSuccessRate' ? formatPercentage(value) :
                          name === 'averageExecutionTime' ? formatDuration(value) :
                          value,
                          name === 'averageSuccessRate' ? 'Success Rate' :
                          name === 'averageExecutionTime' ? 'Execution Time' :
                          name
                        ]}
                        labelFormatter={(label, payload) => 
                          payload && payload[0] ? payload[0].payload.promptName : label
                        }
                      />
                      <Scatter name="Prompts" dataKey="averageSuccessRate" fill={COLORS.primary} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Prompt Performance Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Prompt Performance Details</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prompt
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Success Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usage
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Confidence
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.metrics.promptEffectiveness.map((prompt, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{prompt.promptName}</div>
                                <div className="text-sm text-gray-500">v{prompt.promptVersion}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                prompt.averageSuccessRate > 0.8 ? 'bg-green-100 text-green-800' :
                                prompt.averageSuccessRate > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {formatPercentage(prompt.averageSuccessRate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDuration(prompt.averageExecutionTime)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {prompt.totalUsage.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${prompt.confidenceScore * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-900">
                                  {formatPercentage(prompt.confidenceScore)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(prompt.cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Prompt Analysis Data
                </h3>
                <p className="text-gray-600">
                  Run some jobs to see prompt effectiveness analysis
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stage Comparison Tab */}
        {activeTab === 'stages' && (
          <div className="space-y-6">
            {selectedJobIds.length >= 2 && stageComparisonData.length > 0 ? (
              stageComparisonData.map((stage, index) => (
                <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {stage.stageName} Performance
                  </h3>
                  
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stage.jobs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="jobName" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'successRate' ? `${value.toFixed(1)}%` :
                          name === 'executionTime' ? formatDuration(value) :
                          value,
                          name === 'successRate' ? 'Success Rate' :
                          name === 'executionTime' ? 'Execution Time' : name
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="successRate" fill={COLORS.success} name="Success Rate %" />
                      <Bar yAxisId="right" dataKey="executionTime" fill={COLORS.primary} name="Execution Time" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select Jobs for Stage Comparison
                </h3>
                <p className="text-gray-600">
                  Choose 2 or more jobs to compare performance across pipeline stages
                </p>
              </div>
            )}
          </div>
        )}

        {/* A/B Testing Tab */}
        {activeTab === 'abtest' && (
          <div className="space-y-6">
            {/* Active A/B Tests */}
            {data?.insights.abTestResults && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Active A/B Test Results</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {data.insights.abTestResults.improvement > 0 ? '+' : ''}{data.insights.abTestResults.improvement.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Improvement</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {formatPercentage(data.insights.abTestResults.confidenceLevel)}
                    </div>
                    <div className="text-sm text-gray-600">Confidence Level</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${
                      data.insights.abTestResults.significance ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {data.insights.abTestResults.significance ? 'Significant' : 'Pending'}
                    </div>
                    <div className="text-sm text-gray-600">Statistical Significance</div>
                  </div>
                </div>
              </div>
            )}

            {/* A/B Test History */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">A/B Test History</h3>
                <button
                  onClick={() => setShowABTestModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Test
                </button>
              </div>

              <div className="text-center py-12 text-gray-500">
                <TestTube className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p>No A/B tests have been run yet.</p>
                <p className="text-sm mt-1">Start your first test to compare prompt performance.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* A/B Test Configuration Modal */}
      {showABTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Configure A/B Test</h2>
              <button
                onClick={() => setShowABTestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-5 w-5 transform rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Name
                  </label>
                  <input
                    type="text"
                    value={abTestConfig.name}
                    onChange={(e) => setABTestConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Image Classification Prompt Test"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={abTestConfig.description}
                    onChange={(e) => setABTestConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe what you're testing..."
                  />
                </div>
              </div>

              {/* Variants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Test Variants
                </label>
                <div className="space-y-3">
                  {abTestConfig.variants.map((variant, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => setABTestConfig(prev => ({
                          ...prev,
                          variants: prev.variants.map((v, i) => 
                            i === index ? { ...v, name: e.target.value } : v
                          )
                        }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Variant name"
                      />
                      
                      <select
                        value={variant.promptId}
                        onChange={(e) => setABTestConfig(prev => ({
                          ...prev,
                          variants: prev.variants.map((v, i) => 
                            i === index ? { ...v, promptId: e.target.value } : v
                          )
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select Prompt</option>
                        {/* Placeholder options - would be populated with real prompts */}
                        <option value="prompt-1">Classification Prompt v1</option>
                        <option value="prompt-2">Classification Prompt v2</option>
                      </select>
                      
                      <input
                        type="number"
                        value={variant.trafficPercent}
                        onChange={(e) => setABTestConfig(prev => ({
                          ...prev,
                          variants: prev.variants.map((v, i) => 
                            i === index ? { ...v, trafficPercent: parseInt(e.target.value) } : v
                          )
                        }))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={abTestConfig.duration}
                    onChange={(e) => setABTestConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Success Metric
                  </label>
                  <select
                    value={abTestConfig.successMetric}
                    onChange={(e) => setABTestConfig(prev => ({ ...prev, successMetric: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="success_rate">Success Rate</option>
                    <option value="execution_time">Execution Time</option>
                    <option value="cost">Cost Efficiency</option>
                    <option value="confidence">Confidence Score</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Sample Size
                </label>
                <input
                  type="number"
                  value={abTestConfig.minimumSampleSize}
                  onChange={(e) => setABTestConfig(prev => ({ ...prev, minimumSampleSize: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min="10"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Minimum number of samples needed before statistical analysis
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowABTestModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartABTest}
                disabled={!abTestConfig.name || !abTestConfig.variants.every(v => v.promptId)}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 