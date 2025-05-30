import { supabase } from '@/lib/supabase';
import { JobAnalyticsData } from '@/components/jobs/JobAnalyticsDashboard';

export interface AnalyticsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  pipelineIds?: string[];
  stageIds?: string[];
  imageIds?: string[];
  status?: 'all' | 'completed' | 'failed' | 'running';
}

export interface AnalyticsTimeframe {
  start: Date;
  end: Date;
  groupBy: 'hour' | 'day' | 'week' | 'month';
}

// Database result types
interface JobRow {
  id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  pipelines?: {
    name: string;
  };
}

interface JobResultRow {
  job_id: string;
  image_id: string;
  stage_id: string;
  result: any;
  executed_at: string;
  pipeline_stages?: {
    stage_order: number;
    prompts?: {
      name: string;
    };
  };
}

export class JobAnalyticsService {
  /**
   * Get comprehensive analytics data for the dashboard
   */
  static async getAnalytics(
    filters: AnalyticsFilters = {},
    timeframe: AnalyticsTimeframe = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: new Date(),
      groupBy: 'day'
    }
  ): Promise<JobAnalyticsData> {
    try {
      const [overview, performance, trends, recommendations] = await Promise.all([
        this.getOverviewMetrics(filters),
        this.getPerformanceMetrics(filters),
        this.getTrendAnalysis(filters, timeframe),
        this.generateRecommendations(filters)
      ]);

      return {
        overview,
        performance,
        trends,
        recommendations
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  /**
   * Get overview metrics (total jobs, success rate, etc.)
   */
  private static async getOverviewMetrics(filters: AnalyticsFilters) {
    const dateFilter = this.buildDateFilter(filters);
    
    // Get job overview statistics
    const { data: jobStats, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, created_at, completed_at')
      .gte('created_at', filters.dateFrom?.toISOString() || '2020-01-01')
      .lte('created_at', filters.dateTo?.toISOString() || new Date().toISOString());

    if (jobError) throw jobError;

    // Get image processing statistics
    const { data: imageStats, error: imageError } = await supabase
      .from('job_results')
      .select('job_id, image_id, result, executed_at')
      .gte('executed_at', filters.dateFrom?.toISOString() || '2020-01-01')
      .lte('executed_at', filters.dateTo?.toISOString() || new Date().toISOString());

    if (imageError) throw imageError;

    const totalJobs = jobStats?.length || 0;
    const completedJobs = jobStats?.filter((job: JobRow) => job.status === 'completed').length || 0;
    const failedJobs = jobStats?.filter((job: JobRow) => job.status === 'failed').length || 0;
    
    const successfulResults = imageStats?.filter((result: JobResultRow) => 
      result.result && typeof result.result === 'object' && 
      (result.result as any).success === true
    ).length || 0;
    
    const totalResults = imageStats?.length || 0;
    const totalImagesProcessed = new Set(imageStats?.map((r: JobResultRow) => r.image_id)).size;

    // Calculate average execution time
    const executionTimes = imageStats
      ?.map((result: JobResultRow) => {
        if (result.result && typeof result.result === 'object') {
          return (result.result as any).executionTime;
        }
        return null;
      })
      .filter((time): time is number => time !== null && typeof time === 'number');

    const averageExecutionTime = executionTimes && executionTimes.length > 0
      ? executionTimes.reduce((sum: number, time: number) => sum + time, 0) / executionTimes.length
      : 0;

    const averageSuccessRate = totalResults > 0 ? successfulResults / totalResults : 0;

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      averageExecutionTime,
      averageSuccessRate,
      totalImagesProcessed,
      totalResultsGenerated: totalResults
    };
  }

  /**
   * Get performance metrics by stage and pipeline
   */
  private static async getPerformanceMetrics(filters: AnalyticsFilters) {
    const dateFilter = this.buildDateFilter(filters);

    // Get stage performance data
    const { data: stageData, error: stageError } = await supabase
      .from('job_results')
      .select(`
        stage_id,
        result,
        executed_at,
        pipeline_stages (
          stage_order,
          prompts (
            name
          )
        )
      `)
      .gte('executed_at', filters.dateFrom?.toISOString() || '2020-01-01')
      .lte('executed_at', filters.dateTo?.toISOString() || new Date().toISOString());

    if (stageError) throw stageError;

    // Process stage performance
    const stagePerformance = this.aggregateStagePerformance(stageData || []);

    // Get pipeline performance data
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('jobs')
      .select(`
        id,
        status,
        created_at,
        completed_at,
        pipelines (
          name
        )
      `)
      .gte('created_at', filters.dateFrom?.toISOString() || '2020-01-01')
      .lte('created_at', filters.dateTo?.toISOString() || new Date().toISOString());

    if (pipelineError) throw pipelineError;

    // Process pipeline performance
    const pipelinePerformance = this.aggregatePipelinePerformance(pipelineData || []);

    return {
      timeSeriesData: [], // Placeholder for detailed time series
      stagePerformance,
      pipelinePerformance
    };
  }

  /**
   * Get trend analysis data
   */
  private static async getTrendAnalysis(filters: AnalyticsFilters, timeframe: AnalyticsTimeframe) {
    // Get execution times by day
    const { data: dailyData, error: dailyError } = await supabase
      .from('job_results')
      .select('executed_at, result')
      .gte('executed_at', timeframe.start.toISOString())
      .lte('executed_at', timeframe.end.toISOString())
      .order('executed_at');

    if (dailyError) throw dailyError;

    const executionTimesByDay = this.groupByTimeframe(dailyData || [], timeframe.groupBy);

    // Get success rates by stage
    const { data: stageSuccessData, error: stageSuccessError } = await supabase
      .from('job_results')
      .select(`
        result,
        pipeline_stages (
          prompts (
            name
          )
        )
      `)
      .gte('executed_at', timeframe.start.toISOString())
      .lte('executed_at', timeframe.end.toISOString());

    if (stageSuccessError) throw stageSuccessError;

    const successRatesByStage = this.calculateStageSuccessRates(stageSuccessData || []);

    // Get error distribution
    const { data: errorData, error: errorError } = await supabase
      .from('job_results')
      .select('result')
      .gte('executed_at', timeframe.start.toISOString())
      .lte('executed_at', timeframe.end.toISOString())
      .neq('result->success', true);

    if (errorError) throw errorError;

    const errorDistribution = this.analyzeErrorDistribution(errorData || []);

    return {
      executionTimesByDay,
      successRatesByStage,
      errorDistribution
    };
  }

  /**
   * Generate optimization recommendations
   */
  private static async generateRecommendations(filters: AnalyticsFilters) {
    const recommendations = [];

    // Analyze recent performance
    const recentData = await this.getOverviewMetrics({
      ...filters,
      dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    });

    // Low success rate recommendation
    if (recentData.averageSuccessRate < 0.8) {
      recommendations.push({
        type: 'reliability' as const,
        priority: recentData.averageSuccessRate < 0.6 ? 'high' as const : 'medium' as const,
        title: 'Low Success Rate Detected',
        description: `Current success rate is ${Math.round(recentData.averageSuccessRate * 100)}%, which is below optimal levels.`,
        impact: 'Reduced processing efficiency and increased resource waste',
        action: 'Review prompt configurations and error patterns. Consider adjusting prompt parameters or image preprocessing.'
      });
    }

    // High execution time recommendation
    if (recentData.averageExecutionTime > 5000) { // 5 seconds
      recommendations.push({
        type: 'performance' as const,
        priority: recentData.averageExecutionTime > 10000 ? 'high' as const : 'medium' as const,
        title: 'High Execution Times',
        description: `Average execution time is ${Math.round(recentData.averageExecutionTime / 1000)}s, which may impact user experience.`,
        impact: 'Slower job completion and potential timeout issues',
        action: 'Optimize prompt complexity, review image sizes, or consider upgrading processing resources.'
      });
    }

    // Low processing volume recommendation
    if (recentData.totalJobs < 10 && recentData.totalImagesProcessed < 50) {
      recommendations.push({
        type: 'efficiency' as const,
        priority: 'low' as const,
        title: 'Low Processing Volume',
        description: 'Processing volume is below capacity. Consider batching more images or increasing job frequency.',
        impact: 'Underutilized resources and potential cost inefficiency',
        action: 'Review batch sizes and job scheduling. Consider automated job creation for regular processing tasks.'
      });
    }

    // High failure rate recommendation
    const failureRate = recentData.totalJobs > 0 ? recentData.failedJobs / recentData.totalJobs : 0;
    if (failureRate > 0.1) { // 10% failure rate
      recommendations.push({
        type: 'reliability' as const,
        priority: failureRate > 0.2 ? 'high' as const : 'medium' as const,
        title: 'High Job Failure Rate',
        description: `${Math.round(failureRate * 100)}% of jobs are failing, indicating potential system issues.`,
        impact: 'Lost processing time and potential data quality issues',
        action: 'Review error logs, check pipeline configurations, and validate input data quality.'
      });
    }

    return recommendations;
  }

  /**
   * Helper method to build date filter
   */
  private static buildDateFilter(filters: AnalyticsFilters) {
    const conditions = [];
    
    if (filters.dateFrom) {
      conditions.push(`created_at >= '${filters.dateFrom.toISOString()}'`);
    }
    
    if (filters.dateTo) {
      conditions.push(`created_at <= '${filters.dateTo.toISOString()}'`);
    }
    
    return conditions.length > 0 ? conditions.join(' AND ') : null;
  }

  /**
   * Aggregate stage performance data
   */
  private static aggregateStagePerformance(stageData: any[]) {
    const stageMap = new Map();

    stageData.forEach(item => {
      const stageName = item.pipeline_stages?.prompts?.name || `Stage ${item.pipeline_stages?.stage_order || 'Unknown'}`;
      const stageOrder = item.pipeline_stages?.stage_order || 0;
      const isSuccess = item.result && typeof item.result === 'object' && (item.result as any).success === true;
      const executionTime = item.result && typeof item.result === 'object' ? (item.result as any).executionTime || 0 : 0;

      if (!stageMap.has(stageName)) {
        stageMap.set(stageName, {
          stageName,
          stageOrder,
          totalExecutions: 0,
          successCount: 0,
          totalTime: 0,
          errorCount: 0
        });
      }

      const stage = stageMap.get(stageName);
      stage.totalExecutions++;
      stage.totalTime += executionTime;
      
      if (isSuccess) {
        stage.successCount++;
      } else {
        stage.errorCount++;
      }
    });

    return Array.from(stageMap.values()).map(stage => ({
      stageName: stage.stageName,
      stageOrder: stage.stageOrder,
      averageTime: stage.totalExecutions > 0 ? stage.totalTime / stage.totalExecutions : 0,
      successRate: stage.totalExecutions > 0 ? stage.successCount / stage.totalExecutions : 0,
      totalExecutions: stage.totalExecutions,
      errorRate: stage.totalExecutions > 0 ? stage.errorCount / stage.totalExecutions : 0
    }));
  }

  /**
   * Aggregate pipeline performance data
   */
  private static aggregatePipelinePerformance(pipelineData: any[]) {
    const pipelineMap = new Map();

    pipelineData.forEach(job => {
      const pipelineName = job.pipelines?.name || 'Unknown Pipeline';
      const isCompleted = job.status === 'completed';
      const executionTime = job.completed_at && job.created_at 
        ? new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()
        : 0;

      if (!pipelineMap.has(pipelineName)) {
        pipelineMap.set(pipelineName, {
          pipelineName,
          totalJobs: 0,
          completedJobs: 0,
          totalTime: 0
        });
      }

      const pipeline = pipelineMap.get(pipelineName);
      pipeline.totalJobs++;
      pipeline.totalTime += executionTime;
      
      if (isCompleted) {
        pipeline.completedJobs++;
      }
    });

    return Array.from(pipelineMap.values()).map(pipeline => ({
      pipelineName: pipeline.pipelineName,
      totalJobs: pipeline.totalJobs,
      averageTime: pipeline.totalJobs > 0 ? pipeline.totalTime / pipeline.totalJobs : 0,
      successRate: pipeline.totalJobs > 0 ? pipeline.completedJobs / pipeline.totalJobs : 0,
      efficiency: pipeline.totalJobs > 0 ? pipeline.completedJobs / pipeline.totalJobs : 0
    }));
  }

  /**
   * Group data by timeframe
   */
  private static groupByTimeframe(data: any[], groupBy: 'hour' | 'day' | 'week' | 'month') {
    const grouped = new Map();

    data.forEach(item => {
      const date = new Date(item.executed_at);
      let key: string;

      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          jobCount: 0,
          totalTime: 0,
          successCount: 0
        });
      }

      const group = grouped.get(key);
      group.jobCount++;
      
      if (item.result && typeof item.result === 'object') {
        const executionTime = (item.result as any).executionTime || 0;
        group.totalTime += executionTime;
        
        if ((item.result as any).success === true) {
          group.successCount++;
        }
      }
    });

    return Array.from(grouped.values())
      .map(group => ({
        date: group.date,
        averageTime: group.jobCount > 0 ? group.totalTime / group.jobCount : 0,
        jobCount: group.jobCount
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate success rates by stage
   */
  private static calculateStageSuccessRates(stageData: any[]) {
    const stageMap = new Map();

    stageData.forEach(item => {
      const stageName = item.pipeline_stages?.prompts?.name || 'Unknown Stage';
      const isSuccess = item.result && typeof item.result === 'object' && (item.result as any).success === true;

      if (!stageMap.has(stageName)) {
        stageMap.set(stageName, {
          stage: stageName,
          total: 0,
          successful: 0
        });
      }

      const stage = stageMap.get(stageName);
      stage.total++;
      if (isSuccess) {
        stage.successful++;
      }
    });

    return Array.from(stageMap.values()).map(stage => ({
      stage: stage.stage,
      successRate: stage.total > 0 ? stage.successful / stage.total : 0,
      trend: 'stable' as const // Would need historical data to determine trend
    }));
  }

  /**
   * Analyze error distribution
   */
  private static analyzeErrorDistribution(errorData: any[]) {
    const errorMap = new Map();
    const totalErrors = errorData.length;

    errorData.forEach(item => {
      let errorType = 'Unknown Error';
      
      if (item.result && typeof item.result === 'object') {
        const error = (item.result as any).error;
        if (typeof error === 'string') {
          // Categorize errors based on common patterns
          if (error.includes('timeout') || error.includes('time')) {
            errorType = 'Timeout Error';
          } else if (error.includes('api') || error.includes('API')) {
            errorType = 'API Error';
          } else if (error.includes('image') || error.includes('format')) {
            errorType = 'Image Format Error';
          } else if (error.includes('prompt') || error.includes('invalid')) {
            errorType = 'Prompt Error';
          } else {
            errorType = 'Processing Error';
          }
        }
      }

      errorMap.set(errorType, (errorMap.get(errorType) || 0) + 1);
    });

    return Array.from(errorMap.entries()).map(([errorType, count]) => ({
      errorType,
      count,
      percentage: totalErrors > 0 ? count / totalErrors : 0
    }));
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(
    filters: AnalyticsFilters = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<Blob> {
    const data = await this.getAnalytics(filters);
    
    if (format === 'json') {
      return new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
    } else {
      // CSV format - simplified overview metrics
      const csvData = [
        ['Metric', 'Value'],
        ['Total Jobs', data.overview.totalJobs.toString()],
        ['Completed Jobs', data.overview.completedJobs.toString()],
        ['Failed Jobs', data.overview.failedJobs.toString()],
        ['Success Rate', `${(data.overview.averageSuccessRate * 100).toFixed(1)}%`],
        ['Average Execution Time (ms)', data.overview.averageExecutionTime.toString()],
        ['Total Images Processed', data.overview.totalImagesProcessed.toString()],
        ['Total Results Generated', data.overview.totalResultsGenerated.toString()]
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      
      return new Blob([csvContent], {
        type: 'text/csv'
      });
    }
  }
} 