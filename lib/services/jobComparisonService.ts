import { supabase } from '@/lib/supabase';
import { JobComparisonData, ABTestConfig } from '@/components/jobs/JobComparisonTools';

export interface ComparisonFilters {
  jobIds: string[];
  dateFrom?: Date;
  dateTo?: Date;
  pipelineIds?: string[];
  includeFailedJobs?: boolean;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  variants: Array<{
    name: string;
    promptId: string;
    trafficPercent: number;
    totalSamples: number;
    successRate: number;
    averageExecutionTime: number;
    cost: number;
  }>;
  successMetric: 'success_rate' | 'execution_time' | 'cost' | 'confidence';
  minimumSampleSize: number;
  currentSamples: number;
  results?: {
    winningVariant: string;
    improvement: number;
    confidenceLevel: number;
    significance: boolean;
  };
}

// Database result types
interface JobRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  completed_at?: string;
  pipeline_id: string;
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
      id: string;
      name: string;
      version: string;
    };
  };
}

interface ImageRow {
  id: string;
  job_id: string;
  image_url?: string;
  metadata?: any;
}

interface JobStageStats {
  jobId: string;
  totalExecutions: number;
  successCount: number;
  totalExecutionTime: number;
  errorCount: number;
}

export class JobComparisonService {
  /**
   * Get comprehensive comparison data for selected jobs
   */
  static async getComparisonData(filters: ComparisonFilters): Promise<JobComparisonData> {
    try {
      const [jobs, metrics, insights] = await Promise.all([
        this.getJobsData(filters),
        this.getComparisonMetrics(filters),
        this.generateComparisonInsights(filters)
      ]);

      return {
        jobs,
        metrics,
        insights
      };
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      throw error;
    }
  }

  /**
   * Get detailed job data for comparison
   */
  private static async getJobsData(filters: ComparisonFilters) {
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        name,
        status,
        created_at,
        completed_at,
        pipeline_id,
        pipelines (
          name
        )
      `)
      .in('id', filters.jobIds)
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    // Get job results for each job
    const jobsWithDetails = await Promise.all(
      (jobsData || []).map(async (job: any) => {
        // Get job results
        const { data: resultsData, error: resultsError } = await supabase
          .from('job_results')
          .select(`
            image_id,
            stage_id,
            result,
            executed_at,
            pipeline_stages (
              stage_order,
              prompts (
                id,
                name,
                version
              )
            )
          `)
          .eq('job_id', job.id);

        if (resultsError) throw resultsError;

        // Get image count
        const { data: imagesData, error: imagesError } = await supabase
          .from('images')
          .select('id')
          .eq('job_id', job.id);

        if (imagesError) throw imagesError;

        // Calculate job metrics
        const totalImages = imagesData?.length || 0;
        const processedImages = new Set(resultsData?.map((r: any) => r.image_id) || []).size;
        
        const successfulResults = resultsData?.filter((r: any) => 
          r.result && typeof r.result === 'object' && (r.result as any).success === true
        ) || [];
        
        const successRate = resultsData && resultsData.length > 0 
          ? successfulResults.length / resultsData.length 
          : 0;

        const executionTimes = resultsData
          ?.map((r: any) => r.result && typeof r.result === 'object' ? (r.result as any).executionTime : null)
          .filter((time: any): time is number => time !== null && typeof time === 'number') || [];
        
        const averageExecutionTime = executionTimes.length > 0
          ? executionTimes.reduce((sum: number, time: number) => sum + time, 0) / executionTimes.length
          : 0;

        const errorCount = resultsData?.filter((r: any) => 
          !r.result || typeof r.result !== 'object' || (r.result as any).success !== true
        ).length || 0;

        // Calculate stage metrics
        const stageMap = new Map();
        resultsData?.forEach((result: any) => {
          const stageName = result.pipeline_stages?.prompts?.name || `Stage ${result.pipeline_stages?.stage_order || 'Unknown'}`;
          const stageOrder = result.pipeline_stages?.stage_order || 0;
          const promptName = result.pipeline_stages?.prompts?.name || 'Unknown';
          const promptVersion = result.pipeline_stages?.prompts?.version || '1.0';
          
          if (!stageMap.has(stageName)) {
            stageMap.set(stageName, {
              stageName,
              stageOrder,
              promptName,
              promptVersion,
              totalExecutions: 0,
              successCount: 0,
              totalTime: 0
            });
          }

          const stage = stageMap.get(stageName);
          stage.totalExecutions++;
          stage.totalTime += result.result && typeof result.result === 'object' ? (result.result as any).executionTime || 0 : 0;
          
          if (result.result && typeof result.result === 'object' && (result.result as any).success === true) {
            stage.successCount++;
          }
        });

        const stages = Array.from(stageMap.values()).map(stage => ({
          stageName: stage.stageName,
          stageOrder: stage.stageOrder,
          executionTime: stage.totalExecutions > 0 ? stage.totalTime / stage.totalExecutions : 0,
          successRate: stage.totalExecutions > 0 ? stage.successCount / stage.totalExecutions : 0,
          promptName: stage.promptName,
          promptVersion: stage.promptVersion
        }));

        return {
          id: job.id,
          name: job.name || `Job ${job.id}`,
          pipelineName: job.pipelines?.name || 'Unknown Pipeline',
          startTime: job.created_at,
          endTime: job.completed_at || new Date().toISOString(),
          status: job.status as 'completed' | 'failed' | 'running',
          totalImages,
          processedImages,
          successRate,
          averageExecutionTime,
          totalCost: 0, // Would be calculated based on actual cost metrics
          errorCount,
          stages
        };
      })
    );

    return jobsWithDetails;
  }

  /**
   * Get comparison metrics (performance, prompts, stages)
   */
  private static async getComparisonMetrics(filters: ComparisonFilters) {
    // Get performance comparison data
    const performanceComparison = await this.getPerformanceComparison(filters);
    
    // Get prompt effectiveness data
    const promptEffectiveness = await this.getPromptEffectiveness(filters);
    
    // Get stage comparison data
    const stageComparison = await this.getStageComparison(filters);

    return {
      performanceComparison,
      promptEffectiveness,
      stageComparison
    };
  }

  /**
   * Get performance comparison metrics
   */
  private static async getPerformanceComparison(filters: ComparisonFilters) {
    const { data: resultsData, error } = await supabase
      .from('job_results')
      .select(`
        job_id,
        result,
        executed_at
      `)
      .in('job_id', filters.jobIds);

    if (error) throw error;

    const jobMetrics = new Map();
    
    resultsData?.forEach((result: any) => {
      const jobId = result.job_id;
      if (!jobMetrics.has(jobId)) {
        jobMetrics.set(jobId, {
          successRate: { total: 0, successful: 0 },
          executionTime: { total: 0, count: 0 },
          throughput: { images: new Set() }
        });
      }

      const metrics = jobMetrics.get(jobId);
      metrics.successRate.total++;
      metrics.throughput.images.add(result.image_id);
      
      if (result.result && typeof result.result === 'object') {
        if ((result.result as any).success === true) {
          metrics.successRate.successful++;
        }
        
        const execTime = (result.result as any).executionTime;
        if (typeof execTime === 'number') {
          metrics.executionTime.total += execTime;
          metrics.executionTime.count++;
        }
      }
    });

    const comparisonMetrics = ['success_rate', 'execution_time', 'throughput'];
    
    return comparisonMetrics.map(metric => ({
      metric,
      jobs: Array.from(jobMetrics.entries()).map(([jobId, metrics]) => {
        let value = 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        
        switch (metric) {
          case 'success_rate':
            value = metrics.successRate.total > 0 
              ? metrics.successRate.successful / metrics.successRate.total 
              : 0;
            break;
          case 'execution_time':
            value = metrics.executionTime.count > 0 
              ? metrics.executionTime.total / metrics.executionTime.count 
              : 0;
            break;
          case 'throughput':
            value = metrics.throughput.images.size;
            break;
        }
        
        return { jobId, value, trend };
      })
    }));
  }

  /**
   * Get prompt effectiveness analysis
   */
  private static async getPromptEffectiveness(filters: ComparisonFilters) {
    const { data: promptData, error } = await supabase
      .from('job_results')
      .select(`
        result,
        executed_at,
        pipeline_stages (
          prompts (
            id,
            name,
            version
          )
        )
      `)
      .in('job_id', filters.jobIds);

    if (error) throw error;

    const promptMap = new Map();

    promptData?.forEach((result: any) => {
      const promptId = result.pipeline_stages?.prompts?.id;
      const promptName = result.pipeline_stages?.prompts?.name || 'Unknown';
      const promptVersion = result.pipeline_stages?.prompts?.version || '1.0';
      
      if (!promptId) return;

      const key = `${promptId}-${promptVersion}`;
      
      if (!promptMap.has(key)) {
        promptMap.set(key, {
          promptName,
          promptVersion,
          totalUsage: 0,
          successCount: 0,
          totalExecutionTime: 0,
          totalConfidence: 0,
          cost: 0
        });
      }

      const prompt = promptMap.get(key);
      prompt.totalUsage++;
      
      if (result.result && typeof result.result === 'object') {
        const res = result.result as any;
        
        if (res.success === true) {
          prompt.successCount++;
        }
        
        if (typeof res.executionTime === 'number') {
          prompt.totalExecutionTime += res.executionTime;
        }
        
        if (typeof res.confidence === 'number') {
          prompt.totalConfidence += res.confidence;
        }
        
        // Estimate cost based on execution time (placeholder calculation)
        prompt.cost += (res.executionTime || 0) * 0.001; // $0.001 per second
      }
    });

    return Array.from(promptMap.values()).map(prompt => ({
      promptName: prompt.promptName,
      promptVersion: prompt.promptVersion,
      averageSuccessRate: prompt.totalUsage > 0 ? prompt.successCount / prompt.totalUsage : 0,
      averageExecutionTime: prompt.totalUsage > 0 ? prompt.totalExecutionTime / prompt.totalUsage : 0,
      totalUsage: prompt.totalUsage,
      confidenceScore: prompt.totalUsage > 0 ? prompt.totalConfidence / prompt.totalUsage : 0,
      cost: prompt.cost
    }));
  }

  /**
   * Get stage comparison data
   */
  private static async getStageComparison(filters: ComparisonFilters) {
    const { data: stageData, error } = await supabase
      .from('job_results')
      .select(`
        job_id,
        result,
        pipeline_stages (
          stage_order,
          prompts (
            name
          )
        )
      `)
      .in('job_id', filters.jobIds);

    if (error) throw error;

    const stageMap = new Map<string, { stageName: string; jobs: Map<string, JobStageStats> }>();

    stageData?.forEach((result: any) => {
      const stageName = result.pipeline_stages?.prompts?.name || `Stage ${result.pipeline_stages?.stage_order || 'Unknown'}`;
      const jobId = result.job_id;
      
      if (!stageMap.has(stageName)) {
        stageMap.set(stageName, {
          stageName,
          jobs: new Map<string, JobStageStats>()
        });
      }

      const stage = stageMap.get(stageName)!;
      if (!stage.jobs.has(jobId)) {
        stage.jobs.set(jobId, {
          jobId,
          totalExecutions: 0,
          successCount: 0,
          totalExecutionTime: 0,
          errorCount: 0
        });
      }

      const jobStats = stage.jobs.get(jobId)!;
      jobStats.totalExecutions++;
      
      if (result.result && typeof result.result === 'object') {
        const res = result.result as any;
        
        if (res.success === true) {
          jobStats.successCount++;
        } else {
          jobStats.errorCount++;
        }
        
        if (typeof res.executionTime === 'number') {
          jobStats.totalExecutionTime += res.executionTime;
        }
      }
    });

    return Array.from(stageMap.values()).map(stage => ({
      stageName: stage.stageName,
      jobs: Array.from(stage.jobs.values()).map(jobStats => ({
        jobId: jobStats.jobId,
        executionTime: jobStats.totalExecutions > 0 ? jobStats.totalExecutionTime / jobStats.totalExecutions : 0,
        successRate: jobStats.totalExecutions > 0 ? jobStats.successCount / jobStats.totalExecutions : 0,
        errorRate: jobStats.totalExecutions > 0 ? jobStats.errorCount / jobStats.totalExecutions : 0
      }))
    }));
  }

  /**
   * Generate comparison insights and recommendations
   */
  private static async generateComparisonInsights(filters: ComparisonFilters) {
    const jobs = await this.getJobsData(filters);
    
    if (jobs.length === 0) {
      return {
        bestPerformingJob: '',
        worstPerformingJob: '',
        mostEfficientPrompt: '',
        recommendedOptimizations: []
      };
    }

    // Find best and worst performing jobs
    const bestJob = jobs.reduce((best, job) => 
      job.successRate > best.successRate ? job : best, jobs[0]);
    
    const worstJob = jobs.reduce((worst, job) => 
      job.successRate < worst.successRate ? job : worst, jobs[0]);

    // Find most efficient prompt (placeholder)
    const mostEfficientPrompt = 'Classification Prompt v2';

    // Generate optimization recommendations
    const recommendations = [];

    // Performance optimization
    const avgSuccessRate = jobs.reduce((sum, job) => sum + job.successRate, 0) / jobs.length;
    if (avgSuccessRate < 0.8) {
      recommendations.push({
        type: 'performance' as const,
        priority: avgSuccessRate < 0.6 ? 'high' as const : 'medium' as const,
        suggestion: 'Optimize prompts for better success rates',
        expectedImprovement: `Potential ${Math.round((0.85 - avgSuccessRate) * 100)}% success rate improvement`,
        implementation: 'Review and refine prompt configurations, add more specific instructions'
      });
    }

    // Execution time optimization
    const avgExecutionTime = jobs.reduce((sum, job) => sum + job.averageExecutionTime, 0) / jobs.length;
    if (avgExecutionTime > 5000) { // 5 seconds
      recommendations.push({
        type: 'performance' as const,
        priority: avgExecutionTime > 10000 ? 'high' as const : 'medium' as const,
        suggestion: 'Reduce execution time through prompt optimization',
        expectedImprovement: `Potential ${Math.round((avgExecutionTime - 3000) / avgExecutionTime * 100)}% time reduction`,
        implementation: 'Simplify prompts, optimize image preprocessing, consider parallel processing'
      });
    }

    // Cost optimization
    const totalCost = jobs.reduce((sum, job) => sum + (job.totalCost || 0), 0);
    if (totalCost > 100) {
      recommendations.push({
        type: 'cost' as const,
        priority: 'medium' as const,
        suggestion: 'Optimize cost efficiency through batch processing',
        expectedImprovement: 'Potential 20-30% cost reduction',
        implementation: 'Implement batch processing, optimize prompt complexity, use caching'
      });
    }

    return {
      bestPerformingJob: bestJob.id,
      worstPerformingJob: worstJob.id,
      mostEfficientPrompt,
      recommendedOptimizations: recommendations
    };
  }

  /**
   * Start a new A/B test
   */
  static async startABTest(config: ABTestConfig): Promise<string> {
    try {
      // Create A/B test record
      const { data: testData, error: testError } = await supabase
        .from('ab_tests')
        .insert({
          name: config.name,
          description: config.description,
          status: 'active',
          success_metric: config.successMetric,
          minimum_sample_size: config.minimumSampleSize,
          duration_hours: config.duration,
          config: {
            variants: config.variants
          }
        })
        .select()
        .single();

      if (testError) throw testError;

      // Create variant records
      await Promise.all(
        config.variants.map(variant =>
          supabase
            .from('ab_test_variants')
            .insert({
              test_id: testData.id,
              name: variant.name,
              prompt_id: variant.promptId,
              traffic_percent: variant.trafficPercent
            })
        )
      );

      return testData.id;
    } catch (error) {
      console.error('Error starting A/B test:', error);
      throw error;
    }
  }

  /**
   * Get A/B test results
   */
  static async getABTestResults(testId: string): Promise<ABTest | null> {
    try {
      const { data: testData, error: testError } = await supabase
        .from('ab_tests')
        .select(`
          *,
          ab_test_variants (*)
        `)
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      if (!testData) return null;

      // Get test results data
      const { data: resultsData, error: resultsError } = await supabase
        .from('ab_test_results')
        .select('*')
        .eq('test_id', testId);

      if (resultsError) throw resultsError;

      // Calculate variant performance
      const variants = testData.ab_test_variants.map((variant: any) => {
        const variantResults = resultsData?.filter((r: any) => r.variant_id === variant.id) || [];
        const totalSamples = variantResults.length;
        const successfulResults = variantResults.filter((r: any) => r.success === true);
        const successRate = totalSamples > 0 ? successfulResults.length / totalSamples : 0;
        
        const executionTimes = variantResults
          .map((r: any) => r.execution_time)
          .filter((time: any): time is number => typeof time === 'number');
        const averageExecutionTime = executionTimes.length > 0
          ? executionTimes.reduce((sum: number, time: number) => sum + time, 0) / executionTimes.length
          : 0;

        return {
          name: variant.name,
          promptId: variant.prompt_id,
          trafficPercent: variant.traffic_percent,
          totalSamples,
          successRate,
          averageExecutionTime,
          cost: totalSamples * 0.01 // Placeholder cost calculation
        };
      });

      // Calculate statistical significance (simplified)
      let results;
      if (variants.length >= 2 && variants[0].totalSamples >= testData.minimum_sample_size) {
        const control = variants[0];
        const variant = variants[1];
        
        const improvement = ((variant.successRate - control.successRate) / control.successRate) * 100;
        const confidenceLevel = Math.min(0.95, Math.max(0.5, 0.7 + (Math.abs(improvement) / 100)));
        const significance = Math.abs(improvement) > 5 && confidenceLevel > 0.9;

        results = {
          winningVariant: improvement > 0 ? variant.name : control.name,
          improvement: Math.abs(improvement),
          confidenceLevel,
          significance
        };
      }

      return {
        id: testData.id,
        name: testData.name,
        description: testData.description,
        status: testData.status,
        startDate: new Date(testData.created_at),
        endDate: testData.completed_at ? new Date(testData.completed_at) : undefined,
        variants,
        successMetric: testData.success_metric,
        minimumSampleSize: testData.minimum_sample_size,
        currentSamples: resultsData?.length || 0,
        results
      };
    } catch (error) {
      console.error('Error getting A/B test results:', error);
      throw error;
    }
  }

  /**
   * Export comparison data
   */
  static async exportComparison(
    filters: ComparisonFilters,
    format: 'json' | 'csv' = 'json'
  ): Promise<Blob> {
    const data = await this.getComparisonData(filters);
    
    if (format === 'json') {
      return new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
    } else {
      // CSV format - simplified job comparison
      const csvData = [
        ['Job Name', 'Pipeline', 'Status', 'Success Rate', 'Avg Execution Time (ms)', 'Images Processed', 'Error Count'],
        ...data.jobs.map(job => [
          job.name,
          job.pipelineName,
          job.status,
          `${(job.successRate * 100).toFixed(1)}%`,
          job.averageExecutionTime.toString(),
          job.processedImages.toString(),
          job.errorCount.toString()
        ])
      ];

      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      return new Blob([csvContent], {
        type: 'text/csv'
      });
    }
  }
} 