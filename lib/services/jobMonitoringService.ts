import { createSupabaseServiceClient } from '@/lib/supabase';

export interface JobProgress {
  id: string;
  job_id: string;
  stage_order: number;
  images_total: number;
  images_processed: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  error_count: number;
  last_error?: string;
  failed_images: string[];
  execution_time_ms?: number;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface StageError {
  id: string;
  job_id: string;
  stage_order: number;
  image_id: string;
  error_message: string;
  error_stack?: string;
  error_type: string;
  prompt_id?: string;
  execution_time_ms?: number;
  metadata?: any;
  occurred_at: string;
}

export interface JobExecutionMetrics {
  job_id: string;
  total_stages: number;
  completed_stages: number;
  failed_stages: number;
  overall_progress: number;
  total_images_processed: number;
  total_errors: number;
  total_execution_time: number;
  average_stage_time: number;
  success_rate: number;
  stage_metrics: Array<{
    stage_order: number;
    stage_name?: string;
    status: string;
    progress_percent: number;
    execution_time_ms?: number;
    error_count: number;
    success_rate: number;
    images_processed: number;
    images_total: number;
  }>;
  error_summary: {
    most_common_errors: Array<{ error: string; count: number }>;
    errors_by_stage: Array<{ stage_order: number; error_count: number }>;
    failed_images: string[];
  };
}

export interface StageProgressUpdate {
  job_id: string;
  stage_order: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  images_processed?: number;
  progress_percent?: number;
  error_count?: number;
  last_error?: string;
  failed_images?: string[];
  execution_time_ms?: number;
  metadata?: any;
}

export class JobMonitoringService {
  private supabase = createSupabaseServiceClient();

  /**
   * Get real-time job progress for all stages
   */
  async getJobProgress(jobId: string): Promise<JobProgress[]> {
    try {
      const { data, error } = await this.supabase
        .from('job_progress')
        .select('*')
        .eq('job_id', jobId)
        .order('stage_order');

      if (error) {
        throw new Error(`Failed to fetch job progress: ${error.message}`);
      }

      return (data || []).map(this.transformJobProgress);
    } catch (error) {
      console.error('Error fetching job progress:', error);
      throw error;
    }
  }

  /**
   * Get progress for a specific stage
   */
  async getStageProgress(jobId: string, stageOrder: number): Promise<JobProgress | null> {
    try {
      const { data, error } = await this.supabase
        .from('job_progress')
        .select('*')
        .eq('job_id', jobId)
        .eq('stage_order', stageOrder)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch stage progress: ${error.message}`);
      }

      return this.transformJobProgress(data);
    } catch (error) {
      console.error('Error fetching stage progress:', error);
      throw error;
    }
  }

  /**
   * Update stage progress with detailed information
   */
  async updateStageProgress(update: StageProgressUpdate): Promise<JobProgress> {
    try {
      const updateData: any = {
        status: update.status,
        updated_at: new Date().toISOString()
      };

      if (update.images_processed !== undefined) {
        updateData.images_processed = update.images_processed;
      }

      if (update.progress_percent !== undefined) {
        updateData.progress_percent = Math.min(100, Math.max(0, update.progress_percent));
      }

      if (update.error_count !== undefined) {
        updateData.error_count = update.error_count;
      }

      if (update.last_error !== undefined) {
        updateData.last_error = update.last_error;
      }

      if (update.failed_images !== undefined) {
        updateData.failed_images = update.failed_images;
      }

      if (update.execution_time_ms !== undefined) {
        updateData.execution_time_ms = update.execution_time_ms;
      }

      // Set started_at when status changes to processing
      if (update.status === 'processing') {
        updateData.started_at = new Date().toISOString();
      }

      // Set completed_at when status changes to completed or failed
      if (update.status === 'completed' || update.status === 'failed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('job_progress')
        .update(updateData)
        .eq('job_id', update.job_id)
        .eq('stage_order', update.stage_order)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update stage progress: ${error.message}`);
      }

      // Store progress history for analytics
      await this.storeProgressHistory(update, updateData);

      return this.transformJobProgress(data);
    } catch (error) {
      console.error('Error updating stage progress:', error);
      throw error;
    }
  }

  /**
   * Initialize job progress tracking for all stages
   */
  async initializeJobProgress(
    jobId: string, 
    stageCount: number, 
    totalImages: number
  ): Promise<JobProgress[]> {
    try {
      const progressEntries = [];
      for (let stageOrder = 1; stageOrder <= stageCount; stageOrder++) {
        progressEntries.push({
          job_id: jobId,
          stage_order: stageOrder,
          images_total: totalImages,
          images_processed: 0,
          status: 'pending',
          progress_percent: 0,
          error_count: 0,
          failed_images: [],
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }

      const { data, error } = await this.supabase
        .from('job_progress')
        .insert(progressEntries)
        .select();

      if (error) {
        throw new Error(`Failed to initialize job progress: ${error.message}`);
      }

      return (data || []).map(this.transformJobProgress);
    } catch (error) {
      console.error('Error initializing job progress:', error);
      throw error;
    }
  }

  /**
   * Record a stage error with detailed information
   */
  async recordStageError(
    jobId: string,
    stageOrder: number,
    imageId: string,
    error: Error | string,
    context?: {
      promptId?: string;
      executionTime?: number;
      metadata?: any;
    }
  ): Promise<StageError> {
    try {
      const errorData = {
        job_id: jobId,
        stage_order: stageOrder,
        image_id: imageId,
        error_message: error instanceof Error ? error.message : error,
        error_stack: error instanceof Error ? error.stack : null,
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        prompt_id: context?.promptId,
        execution_time_ms: context?.executionTime,
        metadata: context?.metadata,
        occurred_at: new Date().toISOString()
      };

      const { data, error: insertError } = await this.supabase
        .from('stage_errors')
        .insert(errorData)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to record stage error: ${insertError.message}`);
      }

      // Update stage progress with error information
      await this.incrementStageErrorCount(jobId, stageOrder, imageId, errorData.error_message);

      return this.transformStageError(data);
    } catch (error) {
      console.error('Error recording stage error:', error);
      throw error;
    }
  }

  /**
   * Get errors for a specific job or stage
   */
  async getStageErrors(
    jobId: string, 
    stageOrder?: number, 
    limit = 100
  ): Promise<StageError[]> {
    try {
      let query = this.supabase
        .from('stage_errors')
        .select('*')
        .eq('job_id', jobId)
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (stageOrder !== undefined) {
        query = query.eq('stage_order', stageOrder);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch stage errors: ${error.message}`);
      }

      return (data || []).map(this.transformStageError);
    } catch (error) {
      console.error('Error fetching stage errors:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive job execution metrics
   */
  async getJobExecutionMetrics(jobId: string): Promise<JobExecutionMetrics> {
    try {
      // Get job progress data
      const progressData = await this.getJobProgress(jobId);
      
      // Get error data
      const errorData = await this.getStageErrors(jobId);

      // Get stage names from pipeline_stages
      const stageNames = await this.getStageNames(jobId);

      // Calculate metrics
      const totalStages = progressData.length;
      const completedStages = progressData.filter(p => p.status === 'completed').length;
      const failedStages = progressData.filter(p => p.status === 'failed').length;
      
      const totalImagesProcessed = progressData.reduce((sum, p) => sum + p.images_processed, 0);
      const totalErrors = progressData.reduce((sum, p) => sum + p.error_count, 0);
      const totalExecutionTime = progressData.reduce((sum, p) => sum + (p.execution_time_ms || 0), 0);
      
      const overallProgress = totalStages > 0 
        ? Math.round((completedStages / totalStages) * 100)
        : 0;
      
      const averageStageTime = completedStages > 0 
        ? totalExecutionTime / completedStages 
        : 0;
      
      const successRate = totalImagesProcessed > 0 
        ? ((totalImagesProcessed - totalErrors) / totalImagesProcessed) * 100
        : 100;

      // Build stage metrics
      const stageMetrics = progressData.map(progress => {
        const stageErrors = errorData.filter(e => e.stage_order === progress.stage_order);
        const stageSuccessRate = progress.images_processed > 0 
          ? ((progress.images_processed - progress.error_count) / progress.images_processed) * 100
          : 100;

        return {
          stage_order: progress.stage_order,
          stage_name: stageNames.get(progress.stage_order) || `Stage ${progress.stage_order}`,
          status: progress.status,
          progress_percent: progress.progress_percent,
          execution_time_ms: progress.execution_time_ms,
          error_count: progress.error_count,
          success_rate: stageSuccessRate,
          images_processed: progress.images_processed,
          images_total: progress.images_total
        };
      });

      // Build error summary
      const errorCounts = new Map<string, number>();
      const errorsByStage = new Map<number, number>();
      const failedImages = new Set<string>();

      errorData.forEach(error => {
        // Count error types
        errorCounts.set(error.error_message, (errorCounts.get(error.error_message) || 0) + 1);
        
        // Count errors by stage
        errorsByStage.set(error.stage_order, (errorsByStage.get(error.stage_order) || 0) + 1);
        
        // Track failed images
        failedImages.add(error.image_id);
      });

      const mostCommonErrors = Array.from(errorCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }));

      const errorsByStageArray = Array.from(errorsByStage.entries())
        .map(([stage_order, error_count]) => ({ stage_order, error_count }))
        .sort((a, b) => a.stage_order - b.stage_order);

      return {
        job_id: jobId,
        total_stages: totalStages,
        completed_stages: completedStages,
        failed_stages: failedStages,
        overall_progress: overallProgress,
        total_images_processed: totalImagesProcessed,
        total_errors: totalErrors,
        total_execution_time: totalExecutionTime,
        average_stage_time: averageStageTime,
        success_rate: successRate,
        stage_metrics: stageMetrics,
        error_summary: {
          most_common_errors: mostCommonErrors,
          errors_by_stage: errorsByStageArray,
          failed_images: Array.from(failedImages)
        }
      };
    } catch (error) {
      console.error('Error calculating job execution metrics:', error);
      throw error;
    }
  }

  /**
   * Get progress history for analytics
   */
  async getProgressHistory(
    jobId: string, 
    stageOrder?: number, 
    hoursBack = 24
  ): Promise<any[]> {
    try {
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
      
      let query = this.supabase
        .from('stage_progress_history')
        .select('*')
        .eq('job_id', jobId)
        .gte('timestamp', cutoffTime)
        .order('timestamp');

      if (stageOrder !== undefined) {
        query = query.eq('stage_order', stageOrder);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch progress history: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching progress history:', error);
      throw error;
    }
  }

  /**
   * Clean up old progress data
   */
  async cleanupOldProgressData(daysToKeep = 30): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('cleanup_old_progress_history');

      if (error) {
        console.warn('Could not run cleanup function:', error);
        // Fallback to manual cleanup
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
        
        await this.supabase
          .from('stage_progress_history')
          .delete()
          .lt('created_at', cutoffDate);

        await this.supabase
          .from('stage_errors')
          .delete()
          .lt('created_at', cutoffDate);
      }
    } catch (error) {
      console.error('Error cleaning up old progress data:', error);
    }
  }

  /**
   * Subscribe to real-time progress updates
   */
  subscribeToJobProgress(
    jobId: string, 
    onUpdate: (progress: JobProgress[]) => void,
    onError?: (error: Error) => void
  ) {
    const subscription = this.supabase
      .channel(`job_progress_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_progress',
          filter: `job_id=eq.${jobId}`
        },
        async () => {
          try {
            const progress = await this.getJobProgress(jobId);
            onUpdate(progress);
          } catch (error) {
            if (onError) {
              onError(error instanceof Error ? error : new Error(String(error)));
            }
          }
        }
      )
      .subscribe();

    return subscription;
  }

  // Private helper methods

  /**
   * Store progress history for analytics
   */
  private async storeProgressHistory(
    update: StageProgressUpdate, 
    updateData: any
  ): Promise<void> {
    try {
      const historyData = {
        job_id: update.job_id,
        stage_order: update.stage_order,
        status: update.status,
        images_processed: update.images_processed || 0,
        progress_percent: update.progress_percent || 0,
        execution_time_ms: update.execution_time_ms,
        error_count: update.error_count || 0,
        last_error: update.last_error,
        timestamp: new Date().toISOString(),
        metadata: update.metadata
      };

      await this.supabase
        .from('stage_progress_history')
        .insert(historyData);
    } catch (error) {
      console.warn('Failed to store progress history:', error);
    }
  }

  /**
   * Increment error count for a stage
   */
  private async incrementStageErrorCount(
    jobId: string,
    stageOrder: number,
    imageId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const currentProgress = await this.getStageProgress(jobId, stageOrder);
      
      if (currentProgress) {
        const newErrorCount = currentProgress.error_count + 1;
        const newFailedImages = [...currentProgress.failed_images, imageId];
        
        await this.updateStageProgress({
          job_id: jobId,
          stage_order: stageOrder,
          status: currentProgress.status,
          error_count: newErrorCount,
          last_error: errorMessage,
          failed_images: newFailedImages
        });
      }
    } catch (error) {
      console.warn('Failed to increment stage error count:', error);
    }
  }

  /**
   * Get stage names from pipeline_stages
   */
  private async getStageNames(jobId: string): Promise<Map<number, string>> {
    try {
      // First get the pipeline_id from the job
      const { data: jobData, error: jobError } = await this.supabase
        .from('jobs')
        .select('pipeline_id')
        .eq('id', jobId)
        .single();

      if (jobError || !jobData) {
        console.warn('Could not fetch job pipeline_id:', jobError);
        return new Map();
      }

      // Then get the stage information
      const { data: stageData, error: stageError } = await this.supabase
        .from('pipeline_stages')
        .select(`
          stage_order,
          prompts (name)
        `)
        .eq('pipeline_id', jobData.pipeline_id)
        .order('stage_order');

      if (stageError || !stageData) {
        console.warn('Could not fetch stage names:', stageError);
        return new Map();
      }

      const stageNames = new Map<number, string>();
      stageData.forEach((stage: any) => {
        // Handle the prompts field which can be an array or object depending on Supabase join
        let promptName: string | undefined;
        if (stage.prompts) {
          if (Array.isArray(stage.prompts)) {
            promptName = stage.prompts[0]?.name;
          } else {
            promptName = stage.prompts.name;
          }
        }
        stageNames.set(stage.stage_order, promptName || `Stage ${stage.stage_order}`);
      });

      return stageNames;
    } catch (error) {
      console.warn('Error fetching stage names:', error);
      return new Map();
    }
  }

  /**
   * Transform database job progress to interface
   */
  private transformJobProgress(dbProgress: any): JobProgress {
    return {
      id: dbProgress.id,
      job_id: dbProgress.job_id,
      stage_order: dbProgress.stage_order,
      images_total: dbProgress.images_total || 0,
      images_processed: dbProgress.images_processed || 0,
      status: dbProgress.status || 'pending',
      progress_percent: dbProgress.progress_percent || 0,
      error_count: dbProgress.error_count || 0,
      last_error: dbProgress.last_error,
      failed_images: dbProgress.failed_images || [],
      execution_time_ms: dbProgress.execution_time_ms,
      started_at: dbProgress.started_at,
      completed_at: dbProgress.completed_at,
      updated_at: dbProgress.updated_at
    };
  }

  /**
   * Transform database stage error to interface
   */
  private transformStageError(dbError: any): StageError {
    return {
      id: dbError.id,
      job_id: dbError.job_id,
      stage_order: dbError.stage_order,
      image_id: dbError.image_id,
      error_message: dbError.error_message,
      error_stack: dbError.error_stack,
      error_type: dbError.error_type,
      prompt_id: dbError.prompt_id,
      execution_time_ms: dbError.execution_time_ms,
      metadata: dbError.metadata,
      occurred_at: dbError.occurred_at
    };
  }
}

// Export singleton instance
let jobMonitoringServiceInstance: JobMonitoringService | null = null;

export function getJobMonitoringService(): JobMonitoringService {
  if (!jobMonitoringServiceInstance) {
    jobMonitoringServiceInstance = new JobMonitoringService();
  }
  return jobMonitoringServiceInstance;
}

export default getJobMonitoringService; 