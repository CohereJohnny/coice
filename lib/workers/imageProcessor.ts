import { getCohereService } from '@/lib/services/cohere';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getJobMonitoringService } from '@/lib/services/jobMonitoringService';
import { JobData } from '@/lib/services/simpleQueue';

export interface StageResult {
  imageId: string;
  stageId: string;
  stageOrder: number;
  promptId: string;
  result: any;
  confidence?: number;
  success: boolean;
  error?: string;
  metadata?: any;
  executionTime?: number;
  processedAt: string;
}

export interface PipelineStage {
  id: string;
  stage_order: number;
  prompt_id: string;
  filter_condition?: any;
  prompts: {
    id: string;
    name: string;
    prompt: string;
    type: 'boolean' | 'descriptive' | 'keywords';
  };
}

export class ImageProcessor {
  private supabase = createSupabaseServiceClient();
  private jobMonitoringService = getJobMonitoringService();

  /**
   * Get the Cohere service instance (lazy-loaded to pick up current env vars)
   */
  private getCohereInstance() {
    return getCohereService();
  }

  /**
   * Process a complete job with multiple images through a pipeline
   */
  async processJob(jobData: JobData): Promise<void> {
    const { jobId, pipelineId, imageIds, userId } = jobData;
    
    console.log(`Processing job ${jobId} for user ${userId}`);
    console.log(`Pipeline: ${pipelineId}`);
    console.log(`Images: ${imageIds.length} images`);

    try {
      // Update job status to 'processing'
      await this.updateJobStatus(jobId, 'processing');

      // Get pipeline stages with enhanced metadata
      const stages = await this.getPipelineStages(pipelineId);
      
      if (!stages || stages.length === 0) {
        throw new Error('No stages found for pipeline');
      }

      console.log(`Found ${stages.length} stages for pipeline ${pipelineId}`);

      // Initialize job progress tracking using the new monitoring service
      await this.jobMonitoringService.initializeJobProgress(jobId, stages.length, imageIds.length);

      // Process images through the complete pipeline with stage dependency resolution
      const allResults = await this.processImagesThroughPipeline(
        imageIds, 
        stages, 
        jobId
      );

      // Calculate final metrics and update job completion
      const executionMetrics = this.calculateExecutionMetrics(allResults, stages);
      
      await this.updateJobStatus(jobId, 'completed', null, {
        processedImages: imageIds.length,
        totalImages: imageIds.length,
        stagesCompleted: stages.length,
        totalResults: allResults.length,
        completedAt: new Date().toISOString(),
        executionMetrics
      });

      // Final progress update to ensure 100% completion
      await this.supabase
        .from('jobs')
        .update({
          progress: 100,
          processed_images: imageIds.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.log(`Job ${jobId} completed successfully with ${allResults.length} results`);

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus(jobId, 'failed', errorMessage);
      
      throw error;
    }
  }

  /**
   * Get pipeline stages from database with enhanced metadata
   */
  private async getPipelineStages(pipelineId: string): Promise<PipelineStage[]> {
    const { data, error } = await this.supabase
      .from('pipeline_stages')
      .select(`
        id,
        stage_order,
        prompt_id,
        filter_condition,
        prompts (
          id,
          name,
          prompt,
          type
        )
      `)
      .eq('pipeline_id', pipelineId)
      .order('stage_order');

    if (error) {
      console.error('Error fetching pipeline stages:', error);
      throw new Error(`Failed to fetch pipeline stages: ${error.message}`);
    }

    // Transform the data to match our PipelineStage interface
    return (data || []).map(stage => ({
      id: stage.id,
      stage_order: stage.stage_order,
      prompt_id: stage.prompt_id,
      filter_condition: stage.filter_condition,
      prompts: Array.isArray(stage.prompts) ? stage.prompts[0] : stage.prompts
    })) as PipelineStage[];
  }

  /**
   * Process images through complete pipeline with stage dependency resolution
   */
  private async processImagesThroughPipeline(
    imageIds: string[], 
    stages: PipelineStage[], 
    jobId: string
  ): Promise<StageResult[]> {
    const allResults: StageResult[] = [];
    
    // Get multiple images data
    const currentImageSet = await this.getMultipleImageData(imageIds);
    
    if (!currentImageSet || currentImageSet.length === 0) {
      throw new Error('No images found for processing');
    }

    console.log(`Starting pipeline with ${currentImageSet.length} images`);

    // Process each stage sequentially
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
      const stage = stages[stageIndex];
      const stageStartTime = Date.now();
      
      console.log(`Processing Stage ${stage.stage_order}: ${stage.prompts.name} (${currentImageSet.length} images)`);
      
      // Update stage status to processing using monitoring service
      await this.jobMonitoringService.updateStageProgress({
        job_id: jobId,
        stage_order: stage.stage_order,
        status: 'processing'
      });

      // Process all images in current set through this stage
      const stageResults: StageResult[] = [];
      
      for (let imgIndex = 0; imgIndex < currentImageSet.length; imgIndex++) {
        const image = currentImageSet[imgIndex];
        const imageProcessingStartTime = Date.now();
        
        try {
          const result = await this.processImageWithPrompt(image, stage.prompts);
          const imageProcessingEndTime = Date.now();
          const executionTime = imageProcessingEndTime - imageProcessingStartTime;
          
          const stageResult: StageResult = {
            imageId: image.id,
            stageId: stage.id,
            stageOrder: stage.stage_order,
            promptId: stage.prompt_id,
            result: result.response,
            confidence: result.confidence,
            success: result.success,
            metadata: result.metadata,
            executionTime,
            processedAt: new Date().toISOString(),
            error: result.error
          };

          stageResults.push(stageResult);

          // Store result immediately for recovery
          await this.storeStageResult(jobId, stageResult);

          // Update progress using monitoring service
          const progressPercent = Math.round(((imgIndex + 1) / currentImageSet.length) * 100);
          await this.jobMonitoringService.updateStageProgress({
            job_id: jobId,
            stage_order: stage.stage_order,
            status: 'processing',
            images_processed: imgIndex + 1,
            progress_percent: progressPercent
          });

          // Update overall job progress
          await this.updateOverallJobProgress(jobId);

        } catch (error) {
          console.error(`Error processing image ${image.id} at stage ${stage.stage_order}:`, error);
          
          // Report error using monitoring service
          await this.jobMonitoringService.recordStageError(
            jobId,
            stage.stage_order,
            image.id,
            error instanceof Error ? error : new Error(String(error)),
            {
              promptId: stage.prompt_id,
              executionTime: Date.now() - imageProcessingStartTime,
              metadata: {
                stageIndex,
                totalStages: stages.length,
                imageIndex: imgIndex,
                totalImages: currentImageSet.length
              }
            }
          );
          
          const errorResult: StageResult = {
            imageId: image.id,
            stageId: stage.id,
            stageOrder: stage.stage_order,
            promptId: stage.prompt_id,
            result: null,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime: Date.now() - imageProcessingStartTime,
            processedAt: new Date().toISOString()
          };
          
          stageResults.push(errorResult);
          await this.storeStageResult(jobId, errorResult);
        }
      }

      allResults.push(...stageResults);

      // Apply stage filtering for next stage
      const filteredImageSet = this.applyStageFiltering(currentImageSet, stageResults, stage);
      
      const stageEndTime = Date.now();
      const stageExecutionTime = stageEndTime - stageStartTime;
      
      // Mark stage as completed using monitoring service
      await this.jobMonitoringService.updateStageProgress({
        job_id: jobId,
        stage_order: stage.stage_order,
        status: 'completed',
        images_processed: currentImageSet.length,
        progress_percent: 100,
        execution_time_ms: stageExecutionTime
      });

      // Update overall job progress after stage completion
      await this.updateOverallJobProgress(jobId);

      console.log(`Stage ${stage.stage_order} completed. Filtered from ${currentImageSet.length} to ${filteredImageSet.length} images`);
      
      // If no images remain and there are more stages, log but continue
      if (filteredImageSet.length === 0 && stageIndex < stages.length - 1) {
        console.log(`No images passed stage ${stage.stage_order} filtering. Remaining stages will be skipped.`);
        break;
      }
      
      // Update current image set for next iteration
      const updatedImageSet = filteredImageSet;
      currentImageSet.length = 0;
      currentImageSet.push(...updatedImageSet);
    }

    return allResults;
  }

  /**
   * Apply stage filtering based on results and conditions
   */
  private applyStageFiltering(
    images: any[], 
    stageResults: StageResult[], 
    stage: PipelineStage
  ): any[] {
    // For boolean prompts, filter based on response
      if (stage.prompts.type === 'boolean') {
      const passingResults = stageResults.filter(result => 
        result.success && this.parseBooleanResponse(result.result)
      );
      
      return images.filter(image => 
        passingResults.some(result => result.imageId === image.id)
      );
    }

    // For other prompt types, include all successful results
    // (filtering could be enhanced based on filter_condition in the future)
    const successfulResults = stageResults.filter(result => result.success);
    return images.filter(image => 
      successfulResults.some(result => result.imageId === image.id)
    );
  }

  /**
   * Store individual stage result with versioning and compression
   */
  private async storeStageResult(jobId: string, result: StageResult): Promise<void> {
    try {
      // Compress large result data if needed
      const compressedResult = await this.compressResultIfNeeded({
        response: result.result,
        success: result.success,
        confidence: result.confidence,
        promptId: result.promptId,
        stageOrder: result.stageOrder,
        metadata: result.metadata,
        error: result.error || null,
        executionTime: result.executionTime,
        processedAt: result.processedAt
      });

      const resultData = {
        job_id: jobId,
        image_id: result.imageId,
        stage_id: result.stageId,
        result: compressedResult,
        // Add versioning metadata
        version: await this.getNextResultVersion(jobId, result.imageId, result.stageId),
        is_compressed: compressedResult.compressed || false
      };

      const { error } = await this.supabase
        .from('job_results')
        .insert(resultData);

      if (error) {
        console.error('Error storing stage result:', error);
        throw error;
      }

      // Store in result history for versioning
      await this.storeResultHistory(resultData);

    } catch (error) {
      console.error('Error in storeStageResult:', error);
      throw error;
    }
  }

  /**
   * Compress result data if it exceeds size threshold
   */
  private async compressResultIfNeeded(resultData: any): Promise<any> {
    const resultString = JSON.stringify(resultData);
    const sizeInBytes = new Blob([resultString]).size;
    
    // Compress if result is larger than 50KB
    const COMPRESSION_THRESHOLD = 50 * 1024;
    
    if (sizeInBytes > COMPRESSION_THRESHOLD) {
      try {
        // Use simple compression by removing unnecessary whitespace and truncating very long responses
        const compressed = {
          ...resultData,
          compressed: true,
          original_size: sizeInBytes,
          response: this.truncateResponse(resultData.response),
          metadata: this.compressMetadata(resultData.metadata)
        };
        
        console.log(`Compressed result from ${sizeInBytes} to ${new Blob([JSON.stringify(compressed)]).size} bytes`);
        return compressed;
      } catch (error) {
        console.warn('Failed to compress result, storing uncompressed:', error);
        return resultData;
      }
    }
    
    return resultData;
  }

  /**
   * Truncate very long responses while preserving important information
   */
  private truncateResponse(response: string): string {
    if (!response || response.length <= 10000) {
      return response;
    }
    
    // Keep first 8000 chars and last 1000 chars with truncation indicator
    const start = response.substring(0, 8000);
    const end = response.substring(response.length - 1000);
    return `${start}\n\n[... truncated ${response.length - 9000} characters ...]\n\n${end}`;
  }

  /**
   * Compress metadata by removing large nested objects
   */
  private compressMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') {
      return metadata;
    }
    
    const compressed: any = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string' && value.length > 1000) {
        compressed[key] = value.substring(0, 1000) + '... [truncated]';
      } else if (Array.isArray(value) && value.length > 100) {
        compressed[key] = value.slice(0, 100).concat(['... [truncated]']);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively compress nested objects
        compressed[key] = this.compressMetadata(value);
      } else {
        compressed[key] = value;
      }
    }
    
    return compressed;
  }

  /**
   * Get the next version number for a result
   */
  private async getNextResultVersion(jobId: string, imageId: string, stageId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('job_results')
        .select('version')
        .eq('job_id', jobId)
        .eq('image_id', imageId)
        .eq('stage_id', stageId)
        .order('version', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('Error getting result version:', error);
        return 1;
      }

      const latestVersion = data?.[0]?.version || 0;
      return latestVersion + 1;
    } catch (error) {
      console.warn('Error in getNextResultVersion:', error);
      return 1;
    }
  }

  /**
   * Store result in history table for versioning
   */
  private async storeResultHistory(resultData: any): Promise<void> {
    try {
      const historyData = {
        ...resultData,
        archived_at: new Date().toISOString(),
        // Store original result ID if this is an update
        original_result_id: resultData.id
      };

      // Try to insert into result_history table (create if doesn't exist)
      const { error } = await this.supabase
        .from('job_result_history')
        .insert(historyData);

      if (error && error.code === '42P01') {
        // Table doesn't exist, create it
        await this.createResultHistoryTable();
        // Retry the insert
        await this.supabase
          .from('job_result_history')
          .insert(historyData);
      } else if (error) {
        console.warn('Error storing result history:', error);
      }
    } catch (error) {
      console.warn('Error in storeResultHistory:', error);
    }
  }

  /**
   * Create result history table if it doesn't exist
   */
  private async createResultHistoryTable(): Promise<void> {
    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS job_result_history (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          job_id UUID NOT NULL,
          image_id UUID NOT NULL,
          stage_id UUID NOT NULL,
          result JSONB NOT NULL,
          version INTEGER DEFAULT 1,
          is_compressed BOOLEAN DEFAULT FALSE,
          archived_at TIMESTAMPTZ DEFAULT NOW(),
          original_result_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_job_result_history_job_id ON job_result_history(job_id);
        CREATE INDEX IF NOT EXISTS idx_job_result_history_image_stage ON job_result_history(image_id, stage_id);
        CREATE INDEX IF NOT EXISTS idx_job_result_history_version ON job_result_history(version);
      `;

      const { error } = await this.supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (error) {
        console.warn('Could not create result history table:', error);
      }
    } catch (error) {
      console.warn('Error creating result history table:', error);
    }
  }

  /**
   * Get result history for a specific job/image/stage combination
   */
  async getResultHistory(jobId: string, imageId?: string, stageId?: string): Promise<any[]> {
    try {
      let query = this.supabase
        .from('job_result_history')
        .select('*')
        .eq('job_id', jobId)
        .order('version', { ascending: false });

      if (imageId) {
        query = query.eq('image_id', imageId);
      }

      if (stageId) {
        query = query.eq('stage_id', stageId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching result history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getResultHistory:', error);
      return [];
    }
  }

  /**
   * Decompress result data if it was compressed
   */
  private decompressResult(result: any): any {
    if (!result?.compressed) {
      return result;
    }

    // For now, we just return the compressed version since we used simple truncation
    // In a production system, you might use actual compression algorithms like gzip
    return {
      ...result,
      decompressed: true,
      note: 'This result was compressed to save storage space. Some data may have been truncated.'
    };
  }

  /**
   * Bulk store multiple stage results with optimized batch processing
   */
  private async bulkStoreStageResults(jobId: string, results: StageResult[]): Promise<void> {
    try {
      // Process results in batches to avoid memory issues
      const BATCH_SIZE = 100;
      const batches = [];
      
      for (let i = 0; i < results.length; i += BATCH_SIZE) {
        batches.push(results.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        const resultDataBatch = await Promise.all(
          batch.map(async (result) => {
            const compressedResult = await this.compressResultIfNeeded({
              response: result.result,
              success: result.success,
              confidence: result.confidence,
              promptId: result.promptId,
              stageOrder: result.stageOrder,
              metadata: result.metadata,
              error: result.error || null,
              executionTime: result.executionTime,
              processedAt: result.processedAt
            });

            return {
              job_id: jobId,
              image_id: result.imageId,
              stage_id: result.stageId,
              result: compressedResult,
              version: await this.getNextResultVersion(jobId, result.imageId, result.stageId),
              is_compressed: compressedResult.compressed || false
            };
          })
        );

        const { error } = await this.supabase
          .from('job_results')
          .insert(resultDataBatch);

        if (error) {
          console.error('Error in bulk store batch:', error);
          // Fall back to individual inserts for this batch
          for (const resultData of resultDataBatch) {
            try {
              await this.supabase
                .from('job_results')
                .insert(resultData);
            } catch (individualError) {
              console.error('Error storing individual result:', individualError);
            }
          }
        }

        // Store history for the batch
        for (const resultData of resultDataBatch) {
          await this.storeResultHistory(resultData);
        }
      }

      console.log(`Bulk stored ${results.length} results in ${batches.length} batches`);
    } catch (error) {
      console.error('Error in bulkStoreStageResults:', error);
      throw error;
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string, 
    status: string, 
    errorMessage?: string | null,
    resultsData?: any
  ) {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (errorMessage !== undefined) {
        updateData.error_message = errorMessage;
      }

      if (resultsData) {
        updateData.results_summary = resultsData;
      }

      const { error } = await this.supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        throw new Error(`Failed to update job status: ${error.message}`);
      }
      
      console.log(`Job ${jobId} status updated to ${status}`);
    } catch (error) {
      console.error('Error in updateJobStatus:', error);
      throw error;
    }
  }

  /**
   * Calculate execution metrics for completed job
   */
  private calculateExecutionMetrics(results: StageResult[], stages: PipelineStage[]): any {
    const totalExecutionTime = results.reduce((sum, result) => 
      sum + (result.executionTime || 0), 0
    );
    
    const successfulResults = results.filter(r => r.success);
    const averageConfidence = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / successfulResults.length
      : 0;

    const stageMetrics = stages.map(stage => {
      const stageResults = results.filter(r => r.stageOrder === stage.stage_order);
      const stageSuccessful = stageResults.filter(r => r.success);
      
      return {
        stageOrder: stage.stage_order,
        stageName: stage.prompts.name,
        totalProcessed: stageResults.length,
        successful: stageSuccessful.length,
        successRate: stageResults.length > 0 ? stageSuccessful.length / stageResults.length : 0,
        averageExecutionTime: stageResults.length > 0 
          ? stageResults.reduce((sum, r) => sum + (r.executionTime || 0), 0) / stageResults.length
          : 0
      };
    });

    return {
      totalExecutionTime,
      averageConfidence,
      successRate: results.length > 0 ? successfulResults.length / results.length : 0,
      totalResults: results.length,
      successfulResults: successfulResults.length,
      stageMetrics
    };
  }

  /**
   * Get multiple images data from database
   */
  private async getMultipleImageData(imageIds: string[]) {
    const { data, error } = await this.supabase
      .from('images')
      .select('*')
      .in('id', imageIds);

    if (error) {
      console.error('Error fetching images:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get image data from database
   */
  private async getImageData(imageId: string) {
    const { data, error } = await this.supabase
      .from('images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (error) {
      console.error(`Error fetching image ${imageId}:`, error);
      return null;
    }

    return data;
  }

  /**
   * Process a single image with a specific prompt using Cohere
   */
  private async processImageWithPrompt(image: any, prompt: any) {
    // Generate the image URL (assuming we have a function to get signed URL)
    const imageUrl = await this.getImageUrl(image.gcs_path);
    
    const request = {
      imageUrl,
      prompt: prompt.prompt,
      promptType: prompt.type as 'boolean' | 'descriptive' | 'keywords'
    };

    return await this.getCohereInstance().analyzeImage(request);
  }

  /**
   * Get a public URL for the image from GCS
   */
  private async getImageUrl(gcsPath: string): Promise<string> {
    // Handle GCS path format - convert gs:// to https:// for direct public access
    if (gcsPath.startsWith('gs://')) {
      const fileName = gcsPath.replace('gs://coice-bucket/', '');
      const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;
      console.log(`Using direct public URL: ${publicUrl}`);
      return publicUrl;
    }
    
    // If already in https format, use as-is
    if (gcsPath.startsWith('https://storage.googleapis.com/')) {
      console.log(`Using existing public URL: ${gcsPath}`);
      return gcsPath;
    }
    
    // Fallback: assume it's a relative path and construct the URL
    const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcsPath}`;
    console.log(`Constructed public URL: ${publicUrl}`);
    return publicUrl;
  }

  /**
   * Parse boolean response from AI
   */
  private parseBooleanResponse(response: string): boolean {
    if (!response) return false;
    
    const normalizedResponse = response.toLowerCase().trim();
    return normalizedResponse.includes('yes') || 
           normalizedResponse.includes('true') || 
           normalizedResponse === '1';
  }

  /**
   * Update overall job progress
   */
  private async updateOverallJobProgress(jobId: string): Promise<void> {
    try {
      // Get all stage progress for this job
      const stageProgress = await this.jobMonitoringService.getJobProgress(jobId);
      
      if (!stageProgress || stageProgress.length === 0) {
        return;
      }

      // Sort stages by order to ensure correct calculation
      const sortedStages = stageProgress.sort((a, b) => a.stage_order - b.stage_order);
      const totalStages = sortedStages.length;
      
      // Calculate overall progress based on stage completion
      let overallProgress = 0;
      let fullyProcessedImages = 0;
      
      // Each completed stage contributes (100 / totalStages)% to overall progress
      const stageWeight = 100 / totalStages;
      
      for (let i = 0; i < sortedStages.length; i++) {
        const stage = sortedStages[i];
        
        if (stage.status === 'completed') {
          // Completed stage contributes full weight
          overallProgress += stageWeight;
          
          // If this is the last stage, these images are fully processed
          if (i === sortedStages.length - 1) {
            fullyProcessedImages = stage.images_processed;
          }
        } else if (stage.status === 'processing') {
          // Processing stage contributes partial weight based on its progress
          const stageContribution = (stage.progress_percent / 100) * stageWeight;
          overallProgress += stageContribution;
          break; // Stop at first processing stage (stages are sequential)
        }
        // 'pending' or 'failed' stages contribute 0
      }
      
      // For processed_images during active processing:
      // If we're not at the final stage, show weighted progress of total images
      if (fullyProcessedImages === 0 && sortedStages.length > 0) {
        const firstStage = sortedStages[0];
        const totalImagesInJob = firstStage.images_total || 0;
        fullyProcessedImages = Math.floor((overallProgress / 100) * totalImagesInJob);
      }
      
      // Round overall progress and ensure it doesn't exceed 100%
      overallProgress = Math.min(Math.round(overallProgress), 100);
      
      // Update the main jobs table with calculated progress
      const { error } = await this.supabase
        .from('jobs')
        .update({
          progress: overallProgress,
          processed_images: fullyProcessedImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) {
        console.error('Error updating overall job progress:', error);
      } else {
        console.log(`Job ${jobId} overall progress updated to ${overallProgress}% (${fullyProcessedImages} images processed)`);
      }
    } catch (error) {
      console.error('Error in updateOverallJobProgress:', error);
    }
  }
} 