import { createSupabaseServiceClient } from '@/lib/supabase';

export interface JobResult {
  id: string;
  job_id: string;
  image_id: string;
  stage_id: string;
  result: {
    response: string;
    success: boolean;
    confidence?: number;
    promptId: string;
    stageOrder: number;
    metadata?: any;
    error?: string;
    executionTime?: number;
    processedAt: string;
  };
  executed_at: string;
  search_vector?: string;
  // Expanded relations
  image?: {
    id: string;
    gcs_path: string;
    metadata?: any;
  };
  stage?: {
    id: string;
    stage_order: number;
    prompt?: {
      id: string;
      name: string;
      prompt: string;
      type: string;
    };
  };
  job?: {
    id: string;
    pipeline_id: string;
    status: string;
    created_at: string;
  };
}

export interface JobResultFilters {
  jobId?: string;
  imageId?: string;
  stageId?: string;
  stageOrder?: number;
  success?: boolean;
  confidenceMin?: number;
  confidenceMax?: number;
  promptType?: 'boolean' | 'descriptive' | 'keywords';
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  hasError?: boolean;
  executionTimeMin?: number;
  executionTimeMax?: number;
}

export interface JobResultsPagination {
  page: number;
  limit: number;
  offset: number;
}

export interface JobResultsResponse {
  results: JobResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  aggregations?: {
    totalSuccessful: number;
    totalFailed: number;
    averageConfidence: number;
    averageExecutionTime: number;
    stageBreakdown: Array<{
      stageOrder: number;
      stageName: string;
      count: number;
      successRate: number;
    }>;
  };
}

export interface JobResultsExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeMetadata: boolean;
  includeImageData: boolean;
  filters?: JobResultFilters;
}

export class JobResultService {
  private supabase = createSupabaseServiceClient();

  /**
   * Get job results with advanced filtering and pagination
   */
  async getJobResults(
    filters?: JobResultFilters,
    pagination?: Partial<JobResultsPagination>,
    includeAggregations = false
  ): Promise<JobResultsResponse> {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 50, 1000); // Cap at 1000 for performance
    const offset = (page - 1) * limit;

    try {
      // Build the base query with relations
      let query = this.supabase
        .from('job_results')
        .select(`
          *,
          image:images!job_results_image_id_fkey(
            id,
            gcs_path,
            metadata
          ),
          stage:pipeline_stages!job_results_stage_id_fkey(
            id,
            stage_order,
            prompt:prompts!pipeline_stages_prompt_id_fkey(
              id,
              name,
              prompt,
              type
            )
          ),
          job:jobs!job_results_job_id_fkey(
            id,
            pipeline_id,
            status,
            created_at
          )
        `, { count: 'exact' });

      // Apply filters
      query = this.applyFilters(query, filters);

      // Apply pagination and ordering
      const { data: results, error, count } = await query
        .order('executed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch job results: ${error.message}`);
      }

      // Transform results to match our interface
      const transformedResults: JobResult[] = (results || []).map(this.transformJobResult);

      // Calculate pagination info
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      const response: JobResultsResponse = {
        results: transformedResults,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };

      // Add aggregations if requested
      if (includeAggregations) {
        response.aggregations = await this.calculateAggregations(filters);
      }

      return response;
    } catch (error) {
      console.error('Error fetching job results:', error);
      throw error;
    }
  }

  /**
   * Get results for a specific job
   */
  async getJobResultsByJobId(
    jobId: string,
    filters?: Omit<JobResultFilters, 'jobId'>,
    pagination?: Partial<JobResultsPagination>
  ): Promise<JobResultsResponse> {
    return this.getJobResults(
      { ...filters, jobId },
      pagination,
      true // Include aggregations for job-specific views
    );
  }

  /**
   * Get results for a specific image across all jobs
   */
  async getResultsByImageId(
    imageId: string,
    filters?: Omit<JobResultFilters, 'imageId'>,
    pagination?: Partial<JobResultsPagination>
  ): Promise<JobResultsResponse> {
    return this.getJobResults(
      { ...filters, imageId },
      pagination
    );
  }

  /**
   * Get results for a specific pipeline stage across all jobs
   */
  async getResultsByStageId(
    stageId: string,
    filters?: Omit<JobResultFilters, 'stageId'>,
    pagination?: Partial<JobResultsPagination>
  ): Promise<JobResultsResponse> {
    return this.getJobResults(
      { ...filters, stageId },
      pagination
    );
  }

  /**
   * Get a single job result by ID
   */
  async getJobResultById(id: string): Promise<JobResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('job_results')
        .select(`
          *,
          image:images!job_results_image_id_fkey(
            id,
            gcs_path,
            metadata
          ),
          stage:pipeline_stages!job_results_stage_id_fkey(
            id,
            stage_order,
            prompt:prompts!pipeline_stages_prompt_id_fkey(
              id,
              name,
              prompt,
              type
            )
          ),
          job:jobs!job_results_job_id_fkey(
            id,
            pipeline_id,
            status,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch job result: ${error.message}`);
      }

      return this.transformJobResult(data);
    } catch (error) {
      console.error('Error fetching job result by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new job result
   */
  async createJobResult(resultData: {
    job_id: string;
    image_id: string;
    stage_id: string;
    result: any;
  }): Promise<JobResult> {
    try {
      const { data, error } = await this.supabase
        .from('job_results')
        .insert(resultData)
        .select(`
          *,
          image:images!job_results_image_id_fkey(
            id,
            gcs_path,
            metadata
          ),
          stage:pipeline_stages!job_results_stage_id_fkey(
            id,
            stage_order,
            prompt:prompts!pipeline_stages_prompt_id_fkey(
              id,
              name,
              prompt,
              type
            )
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create job result: ${error.message}`);
      }

      return this.transformJobResult(data);
    } catch (error) {
      console.error('Error creating job result:', error);
      throw error;
    }
  }

  /**
   * Update a job result
   */
  async updateJobResult(id: string, updates: Partial<JobResult>): Promise<JobResult> {
    try {
      const { data, error } = await this.supabase
        .from('job_results')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          image:images!job_results_image_id_fkey(
            id,
            gcs_path,
            metadata
          ),
          stage:pipeline_stages!job_results_stage_id_fkey(
            id,
            stage_order,
            prompt:prompts!pipeline_stages_prompt_id_fkey(
              id,
              name,
              prompt,
              type
            )
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update job result: ${error.message}`);
      }

      return this.transformJobResult(data);
    } catch (error) {
      console.error('Error updating job result:', error);
      throw error;
    }
  }

  /**
   * Delete a job result
   */
  async deleteJobResult(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('job_results')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete job result: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting job result:', error);
      throw error;
    }
  }

  /**
   * Search job results using full-text search
   */
  async searchJobResults(
    searchTerm: string,
    filters?: JobResultFilters,
    pagination?: Partial<JobResultsPagination>
  ): Promise<JobResultsResponse> {
    // Combine search term with other filters
    const searchFilters = {
      ...filters,
      searchTerm,
    };

    return this.getJobResults(searchFilters, pagination);
  }

  /**
   * Get job results statistics
   */
  async getJobResultsStats(filters?: JobResultFilters) {
    try {
      // Get basic counts
      let baseQuery = this.supabase
        .from('job_results')
        .select('result', { count: 'exact', head: true });

      baseQuery = this.applyFilters(baseQuery, filters);

      const { count: totalResults, error: countError } = await baseQuery;

      if (countError) {
        throw new Error(`Failed to get total count: ${countError.message}`);
      }

      // Get detailed results for calculations
      let detailQuery = this.supabase
        .from('job_results')
        .select(`
          result,
          stage:pipeline_stages!job_results_stage_id_fkey(
            stage_order,
            prompt:prompts!pipeline_stages_prompt_id_fkey(name, type)
          )
        `);

      detailQuery = this.applyFilters(detailQuery, filters);

      const { data: detailResults, error: detailError } = await detailQuery;

      if (detailError) {
        throw new Error(`Failed to get detailed results: ${detailError.message}`);
      }

      // Calculate statistics
      const successful = (detailResults || []).filter(r => r.result?.success).length;
      const failed = (totalResults || 0) - successful;
      const successRate = totalResults ? (successful / totalResults) * 100 : 0;

      const confidences = (detailResults || [])
        .map(r => r.result?.confidence)
        .filter(c => c !== undefined && c !== null);
      const averageConfidence = confidences.length > 0 
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
        : 0;

      const executionTimes = (detailResults || [])
        .map(r => r.result?.executionTime)
        .filter(t => t !== undefined && t !== null);
      const averageExecutionTime = executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : 0;

      // Group by stage
      const stageGroups = new Map<number, { name: string; results: any[] }>();
      (detailResults || []).forEach(result => {
        // Handle the case where stage might be an array (from Supabase joins)
        const stage = Array.isArray(result.stage) ? result.stage[0] : result.stage;
        const stageOrder = stage?.stage_order || 0;
        
        // Handle prompt data which might also be an array
        let stageName = `Stage ${stageOrder}`;
        if (stage?.prompt) {
          const prompt = Array.isArray(stage.prompt) ? stage.prompt[0] : stage.prompt;
          stageName = prompt?.name || stageName;
        }
        
        if (!stageGroups.has(stageOrder)) {
          stageGroups.set(stageOrder, { name: stageName, results: [] });
        }
        stageGroups.get(stageOrder)!.results.push(result);
      });

      const stageBreakdown = Array.from(stageGroups.entries()).map(([stageOrder, data]) => {
        const stageSuccessful = data.results.filter(r => r.result?.success).length;
        return {
          stageOrder,
          stageName: data.name,
          count: data.results.length,
          successRate: data.results.length > 0 ? (stageSuccessful / data.results.length) * 100 : 0,
        };
      }).sort((a, b) => a.stageOrder - b.stageOrder);

      return {
        totalResults: totalResults || 0,
        successful,
        failed,
        successRate,
        averageConfidence,
        averageExecutionTime,
        stageBreakdown,
      };
    } catch (error) {
      console.error('Error getting job results stats:', error);
      throw error;
    }
  }

  /**
   * Export job results to various formats
   */
  async exportJobResults(options: JobResultsExportOptions): Promise<string | Buffer> {
    try {
      // Get all results (no pagination for export)
      const results = await this.getJobResults(
        options.filters,
        { limit: 10000 }, // Large limit for export
        false
      );

      switch (options.format) {
        case 'csv':
          return this.exportToCSV(results.results, options);
        case 'json':
          return this.exportToJSON(results.results, options);
        case 'excel':
          return this.exportToExcel(results.results, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Error exporting job results:', error);
      throw error;
    }
  }

  /**
   * Apply filters to a Supabase query
   */
  private applyFilters(query: any, filters?: JobResultFilters) {
    if (!filters) return query;

    if (filters.jobId) {
      query = query.eq('job_id', filters.jobId);
    }

    if (filters.imageId) {
      query = query.eq('image_id', filters.imageId);
    }

    if (filters.stageId) {
      query = query.eq('stage_id', filters.stageId);
    }

    if (filters.success !== undefined) {
      query = query.eq('result->>success', filters.success.toString());
    }

    if (filters.hasError !== undefined) {
      if (filters.hasError) {
        query = query.not('result->>error', 'is', null);
      } else {
        query = query.is('result->>error', null);
      }
    }

    if (filters.confidenceMin !== undefined) {
      query = query.gte('result->>confidence', filters.confidenceMin);
    }

    if (filters.confidenceMax !== undefined) {
      query = query.lte('result->>confidence', filters.confidenceMax);
    }

    if (filters.executionTimeMin !== undefined) {
      query = query.gte('result->>executionTime', filters.executionTimeMin);
    }

    if (filters.executionTimeMax !== undefined) {
      query = query.lte('result->>executionTime', filters.executionTimeMax);
    }

    if (filters.dateFrom) {
      query = query.gte('executed_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('executed_at', filters.dateTo);
    }

    if (filters.searchTerm) {
      // Use text search on the response field within the JSONB result
      query = query.textSearch('search_vector', filters.searchTerm);
    }

    return query;
  }

  /**
   * Transform raw database result to JobResult interface
   */
  private transformJobResult(dbResult: any): JobResult {
    return {
      id: dbResult.id,
      job_id: dbResult.job_id,
      image_id: dbResult.image_id,
      stage_id: dbResult.stage_id,
      result: dbResult.result || {},
      executed_at: dbResult.executed_at,
      search_vector: dbResult.search_vector,
      image: dbResult.image,
      stage: dbResult.stage,
      job: dbResult.job,
    };
  }

  /**
   * Calculate aggregations for job results
   */
  private async calculateAggregations(filters?: JobResultFilters) {
    const stats = await this.getJobResultsStats(filters);
    // Transform the stats to match the expected aggregations interface
    return {
      totalSuccessful: stats.successful,
      totalFailed: stats.failed,
      averageConfidence: stats.averageConfidence,
      averageExecutionTime: stats.averageExecutionTime,
      stageBreakdown: stats.stageBreakdown,
    };
  }

  /**
   * Export results to CSV format
   */
  private exportToCSV(results: JobResult[], options: JobResultsExportOptions): string {
    const headers = [
      'ID',
      'Job ID',
      'Image ID',
      'Stage Order',
      'Stage Name',
      'Prompt Type',
      'Result',
      'Success',
      'Confidence',
      'Execution Time (ms)',
      'Executed At',
    ];

    if (options.includeMetadata) {
      headers.push('Metadata');
    }

    if (options.includeImageData) {
      headers.push('Image Path', 'Image Metadata');
    }

    const rows = results.map(result => {
      const row = [
        result.id,
        result.job_id,
        result.image_id,
        result.stage?.stage_order || '',
        result.stage?.prompt?.name || '',
        result.stage?.prompt?.type || '',
        result.result.response || '',
        result.result.success ? 'Yes' : 'No',
        result.result.confidence || '',
        result.result.executionTime || '',
        result.executed_at,
      ];

      if (options.includeMetadata) {
        row.push(JSON.stringify(result.result.metadata || {}));
      }

      if (options.includeImageData) {
        row.push(result.image?.gcs_path || '');
        row.push(JSON.stringify(result.image?.metadata || {}));
      }

      return row;
    });

    return [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * Export results to JSON format
   */
  private exportToJSON(results: JobResult[], options: JobResultsExportOptions): string {
    const exportData = results.map(result => {
      const exported: any = {
        id: result.id,
        jobId: result.job_id,
        imageId: result.image_id,
        stageId: result.stage_id,
        stageOrder: result.stage?.stage_order,
        stageName: result.stage?.prompt?.name,
        promptType: result.stage?.prompt?.type,
        result: result.result.response,
        success: result.result.success,
        confidence: result.result.confidence,
        executionTime: result.result.executionTime,
        executedAt: result.executed_at,
      };

      if (options.includeMetadata) {
        exported.metadata = result.result.metadata;
      }

      if (options.includeImageData) {
        exported.image = {
          path: result.image?.gcs_path,
          metadata: result.image?.metadata,
        };
      }

      return exported;
    });

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export results to Excel format (placeholder - would need xlsx library)
   */
  private exportToExcel(results: JobResult[], options: JobResultsExportOptions): Buffer {
    // This would require the xlsx library to be installed
    // For now, return CSV as buffer
    const csvData = this.exportToCSV(results, options);
    return Buffer.from(csvData, 'utf-8');
  }
}

// Export singleton instance
let jobResultServiceInstance: JobResultService | null = null;

export function getJobResultService(): JobResultService {
  if (!jobResultServiceInstance) {
    jobResultServiceInstance = new JobResultService();
  }
  return jobResultServiceInstance;
}

export default getJobResultService; 