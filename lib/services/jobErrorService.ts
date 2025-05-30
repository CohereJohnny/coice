// Job Error Service
// Sprint 11 Task 5.3: Add comprehensive error handling

import { createClient } from '@supabase/supabase-js';

export interface JobError {
  id: string;
  jobId: string;
  stageId?: string;
  errorType: string;
  errorCode: string;
  errorMessage: string;
  stackTrace?: string;
  metadata: Record<string, any>;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorsByType: Array<{ type: string; count: number; percentage: number }>;
  errorsByStage: Array<{ stageName: string; count: number; percentage: number }>;
  commonErrors: Array<{ code: string; message: string; count: number }>;
  errorTrends: Array<{ date: string; count: number }>;
  resolutionRate: number;
  avgResolutionTime: number;
}

export interface ErrorRecoveryAction {
  action: 'retry' | 'skip' | 'restart' | 'manual_review';
  description: string;
  automated: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  // API and Rate Limiting Errors
  'RATE_LIMIT_EXCEEDED': 'AI service is busy. Your job will retry automatically in a few minutes.',
  'API_QUOTA_EXCEEDED': 'Daily AI processing limit reached. Job will resume tomorrow.',
  'API_TIMEOUT': 'AI service took too long to respond. Job will retry automatically.',
  'API_UNAVAILABLE': 'AI service is temporarily unavailable. Job will retry when service is restored.',
  
  // Image Processing Errors
  'IMAGE_TOO_LARGE': 'Image file is too large (max 10MB). Please use smaller images.',
  'IMAGE_CORRUPTED': 'Image file appears to be corrupted and cannot be processed.',
  'IMAGE_FORMAT_UNSUPPORTED': 'Image format not supported. Please use JPG, PNG, or WebP.',
  'IMAGE_DOWNLOAD_FAILED': 'Could not download image from storage. Please try again.',
  
  // Pipeline and Configuration Errors
  'INVALID_PIPELINE': 'Pipeline configuration has errors. Please contact support.',
  'MISSING_PROMPT': 'Pipeline stage is missing required prompt configuration.',
  'INVALID_PROMPT_TYPE': 'Prompt type configuration is invalid for this stage.',
  'STAGE_DEPENDENCY_ERROR': 'Pipeline stage dependencies are incorrectly configured.',
  
  // Authentication and Authorization Errors
  'UNAUTHORIZED': 'You do not have permission to perform this action.',
  'SESSION_EXPIRED': 'Your session has expired. Please log in again.',
  'INSUFFICIENT_PERMISSIONS': 'Your account does not have permission for this pipeline.',
  
  // Database and Storage Errors
  'DATABASE_ERROR': 'Database connection error. Please try again.',
  'STORAGE_ERROR': 'File storage error. Please contact support.',
  'STORAGE_QUOTA_EXCEEDED': 'Storage quota exceeded. Please free up space or contact support.',
  
  // Generic Errors
  'UNKNOWN_ERROR': 'An unexpected error occurred. Please contact support if this continues.',
  'VALIDATION_ERROR': 'Input validation failed. Please check your data and try again.',
  'TIMEOUT_ERROR': 'Operation timed out. Please try again.',
  'NETWORK_ERROR': 'Network connection error. Please check your internet connection.'
};

// Error recovery actions
const RECOVERY_ACTIONS: Record<string, ErrorRecoveryAction> = {
  'RATE_LIMIT_EXCEEDED': {
    action: 'retry',
    description: 'Automatically retry after rate limit resets',
    automated: true,
    priority: 'medium'
  },
  'API_TIMEOUT': {
    action: 'retry',
    description: 'Retry with exponential backoff',
    automated: true,
    priority: 'medium'
  },
  'IMAGE_TOO_LARGE': {
    action: 'skip',
    description: 'Skip this image and continue with others',
    automated: false,
    priority: 'low'
  },
  'IMAGE_CORRUPTED': {
    action: 'skip',
    description: 'Skip corrupted image and continue processing',
    automated: true,
    priority: 'low'
  },
  'INVALID_PIPELINE': {
    action: 'manual_review',
    description: 'Requires pipeline configuration review',
    automated: false,
    priority: 'critical'
  },
  'DATABASE_ERROR': {
    action: 'retry',
    description: 'Retry database operation',
    automated: true,
    priority: 'high'
  }
};

export class JobErrorService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Log an error for a job
   */
  async logError(
    jobId: string, 
    error: Error | string, 
    context: {
      stageId?: string;
      imageId?: string;
      errorType?: string;
      errorCode?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const stackTrace = typeof error === 'object' ? error.stack : undefined;
      
      // Determine error type and code
      const errorType = context.errorType || this.categorizeError(errorMessage);
      const errorCode = context.errorCode || this.extractErrorCode(errorMessage);
      
      const errorData = {
        job_id: jobId,
        stage_id: context.stageId,
        image_id: context.imageId,
        error_type: errorType,
        error_code: errorCode,
        error_message: errorMessage,
        stack_trace: stackTrace,
        metadata: {
          ...context.metadata,
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
        },
        resolved: false
      };

      const { data, error: insertError } = await this.supabase
        .from('job_errors')
        .insert(errorData)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to log job error:', insertError);
        return '';
      }

      // Log performance metric
      await this.logPerformanceMetric('error_logged', {
        errorType,
        errorCode,
        jobId
      });

      // Check if this error requires immediate attention
      if (this.isCriticalError(errorCode)) {
        await this.sendCriticalErrorAlert(jobId, errorCode, errorMessage);
      }

      return data.id;
    } catch (err) {
      console.error('Error logging job error:', err);
      return '';
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(errorCode: string, fallback?: string): string {
    return ERROR_MESSAGES[errorCode] || fallback || ERROR_MESSAGES['UNKNOWN_ERROR'];
  }

  /**
   * Get recovery action for error
   */
  getRecoveryAction(errorCode: string): ErrorRecoveryAction | null {
    return RECOVERY_ACTIONS[errorCode] || null;
  }

  /**
   * Get error analytics for timeframe
   */
  async getErrorAnalytics(
    timeframe: string = '7d',
    pipelineId?: string,
    libraryId?: number
  ): Promise<ErrorAnalytics> {
    try {
      const { startDate, endDate } = this.parseTimeframe(timeframe);
      
      let query = this.supabase
        .from('job_errors')
        .select(`
          *,
          jobs!inner(
            id,
            pipeline_id,
            library_id,
            created_at
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (pipelineId) {
        query = query.eq('jobs.pipeline_id', pipelineId);
      }

      if (libraryId) {
        query = query.eq('jobs.library_id', libraryId);
      }

      const { data: errors, error } = await query;

      if (error) {
        throw error;
      }

      return this.calculateErrorAnalytics(errors || []);
    } catch (err) {
      console.error('Error getting error analytics:', err);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string, resolution?: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('job_errors')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution
        })
        .eq('id', errorId);

      return !error;
    } catch (err) {
      console.error('Error resolving job error:', err);
      return false;
    }
  }

  /**
   * Get errors for a specific job
   */
  async getJobErrors(jobId: string): Promise<JobError[]> {
    try {
      const { data, error } = await this.supabase
        .from('job_errors')
        .select(`
          *,
          pipeline_stages(stage_order, prompt:prompts(name))
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapErrorData);
    } catch (err) {
      console.error('Error getting job errors:', err);
      return [];
    }
  }

  // Private helper methods
  private categorizeError(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
      return 'rate_limit';
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'timeout';
    }
    if (lowerMessage.includes('image') && lowerMessage.includes('large')) {
      return 'image_size';
    }
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('403')) {
      return 'authorization';
    }
    if (lowerMessage.includes('database') || lowerMessage.includes('sql')) {
      return 'database';
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'network';
    }
    
    return 'unknown';
  }

  private extractErrorCode(message: string): string {
    // Extract error codes from common patterns
    const codePatterns = [
      /ERROR_(\w+)/,
      /([A-Z_]+_ERROR)/,
      /(\w+_LIMIT_EXCEEDED)/,
      /([A-Z_]+_FAILED)/
    ];

    for (const pattern of codePatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Map common HTTP status codes
    if (message.includes('429')) return 'RATE_LIMIT_EXCEEDED';
    if (message.includes('401')) return 'UNAUTHORIZED';
    if (message.includes('403')) return 'INSUFFICIENT_PERMISSIONS';
    if (message.includes('404')) return 'RESOURCE_NOT_FOUND';
    if (message.includes('500')) return 'SERVER_ERROR';
    if (message.includes('timeout')) return 'TIMEOUT_ERROR';

    return 'UNKNOWN_ERROR';
  }

  private isCriticalError(errorCode: string): boolean {
    const criticalErrors = [
      'INVALID_PIPELINE',
      'DATABASE_ERROR',
      'STORAGE_ERROR',
      'API_QUOTA_EXCEEDED'
    ];
    return criticalErrors.includes(errorCode);
  }

  private async sendCriticalErrorAlert(jobId: string, errorCode: string, message: string): Promise<void> {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.error(`CRITICAL ERROR ALERT: Job ${jobId} - ${errorCode}: ${message}`);
    
    // Log as high-priority performance metric
    await this.logPerformanceMetric('critical_error', {
      jobId,
      errorCode,
      message: message.substring(0, 100)
    });
  }

  private async logPerformanceMetric(metricName: string, metadata: Record<string, any>): Promise<void> {
    try {
      await this.supabase
        .from('performance_metrics')
        .insert({
          metric_type: 'error_tracking',
          metric_name: metricName,
          metric_value: 1,
          metadata
        });
    } catch (err) {
      // Don't let metric logging errors break the main flow
      console.warn('Failed to log performance metric:', err);
    }
  }

  private parseTimeframe(timeframe: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return { startDate, endDate };
  }

  private calculateErrorAnalytics(errors: any[]): ErrorAnalytics {
    const totalErrors = errors.length;
    
    // Group by error type
    const errorsByType = this.groupAndCount(errors, 'error_type');
    
    // Group by stage (if available) - map to correct interface
    const stageGroups = this.groupAndCount(
      errors.filter(e => e.pipeline_stages),
      e => e.pipeline_stages?.prompt?.name || 'Unknown Stage'
    );
    const errorsByStage = stageGroups.map(item => ({
      stageName: item.type,
      count: item.count,
      percentage: item.percentage
    }));
    
    // Common error codes
    const commonErrors = this.groupAndCount(errors, 'error_code')
      .map(item => ({
        code: item.type,
        message: ERROR_MESSAGES[item.type] || 'Unknown error',
        count: item.count
      }));

    // Error trends (by day)
    const errorTrends = this.calculateTrends(errors);

    // Resolution metrics
    const resolvedErrors = errors.filter(e => e.resolved);
    const resolutionRate = totalErrors > 0 ? (resolvedErrors.length / totalErrors) * 100 : 0;
    
    const avgResolutionTime = resolvedErrors.length > 0 
      ? resolvedErrors.reduce((sum, error) => {
          const created = new Date(error.created_at);
          const resolved = new Date(error.resolved_at);
          return sum + (resolved.getTime() - created.getTime());
        }, 0) / resolvedErrors.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      totalErrors,
      errorsByType,
      errorsByStage,
      commonErrors,
      errorTrends,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      avgResolutionTime: Math.round(avgResolutionTime * 100) / 100
    };
  }

  private groupAndCount(items: any[], key: string | ((item: any) => string)): Array<{ type: string; count: number; percentage: number }> {
    const groups: Record<string, number> = {};
    const total = items.length;

    items.forEach(item => {
      const value = typeof key === 'function' ? key(item) : item[key];
      groups[value] = (groups[value] || 0) + 1;
    });

    return Object.entries(groups)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateTrends(errors: any[]): Array<{ date: string; count: number }> {
    const trends: Record<string, number> = {};
    
    errors.forEach(error => {
      const date = new Date(error.created_at).toISOString().split('T')[0];
      trends[date] = (trends[date] || 0) + 1;
    });

    return Object.entries(trends)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private mapErrorData(error: any): JobError {
    return {
      id: error.id,
      jobId: error.job_id,
      stageId: error.stage_id,
      errorType: error.error_type,
      errorCode: error.error_code,
      errorMessage: error.error_message,
      stackTrace: error.stack_trace,
      metadata: error.metadata || {},
      createdAt: error.created_at,
      resolved: error.resolved,
      resolvedAt: error.resolved_at
    };
  }

  private getEmptyAnalytics(): ErrorAnalytics {
    return {
      totalErrors: 0,
      errorsByType: [],
      errorsByStage: [],
      commonErrors: [],
      errorTrends: [],
      resolutionRate: 0,
      avgResolutionTime: 0
    };
  }
}

// Create singleton instance
export const jobErrorService = new JobErrorService(); 