import { getCohereService } from '@/lib/services/cohere';
import { createSupabaseServiceClient } from '@/lib/supabase';
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

      // Start job progress tracking
      await this.initializeJobProgress(jobId, stages.length, imageIds.length);

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
   * Initialize job progress tracking for multi-stage processing
   */
  private async initializeJobProgress(jobId: string, stageCount: number, imageCount: number): Promise<void> {
    // Create job_progress entries for each stage
    const progressEntries = [];
    for (let i = 1; i <= stageCount; i++) {
      progressEntries.push({
        job_id: jobId,
        stage_order: i,
        images_total: imageCount,
        images_processed: 0,
        status: 'pending',
        started_at: null,
        completed_at: null
      });
    }

    // Check if job_progress table exists, if not, create the entries in a different way
    try {
      const { error } = await this.supabase
        .from('job_progress')
        .insert(progressEntries);
      
      if (error) {
        console.warn('Could not initialize job_progress (table may not exist):', error);
        // Fallback to updating the main jobs table with progress info
        await this.supabase
          .from('jobs')
          .update({ 
            progress: 0,
            updated_at: new Date().toISOString() 
          })
          .eq('id', jobId);
      }
    } catch (err) {
      console.warn('Job progress initialization failed, continuing without stage tracking');
    }
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
      
      // Update stage status to processing
      await this.updateStageProgress(jobId, stage.stage_order, 'processing', stageStartTime);

      // Process all images in current set through this stage
      const stageResults: StageResult[] = [];
      
      for (let imgIndex = 0; imgIndex < currentImageSet.length; imgIndex++) {
        const image = currentImageSet[imgIndex];
        
        try {
          const imageProcessingStartTime = Date.now();
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

          // Update progress
          const progressPercent = Math.round(((imgIndex + 1) / currentImageSet.length) * 100);
          await this.updateStageProgress(
            jobId, 
            stage.stage_order, 
            'processing', 
            stageStartTime,
            imgIndex + 1,
            progressPercent
          );

        } catch (error) {
          console.error(`Error processing image ${image.id} at stage ${stage.stage_order}:`, error);
          
          const errorResult: StageResult = {
            imageId: image.id,
            stageId: stage.id,
            stageOrder: stage.stage_order,
            promptId: stage.prompt_id,
            result: null,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
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
      
      // Mark stage as completed
      await this.updateStageProgress(
        jobId, 
        stage.stage_order, 
        'completed', 
        stageStartTime,
        currentImageSet.length,
        100,
        stageEndTime,
        stageExecutionTime
      );

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
   * Store individual stage result
   */
  private async storeStageResult(jobId: string, result: StageResult): Promise<void> {
    try {
      const resultData = {
        job_id: jobId,
        image_id: result.imageId,
        stage_id: result.stageId,
        result: {
          response: result.result,
          success: result.success,
          confidence: result.confidence,
          promptId: result.promptId,
          stageOrder: result.stageOrder,
          metadata: result.metadata,
          error: result.error || null,
          executionTime: result.executionTime,
          processedAt: result.processedAt
        }
      };

      const { error } = await this.supabase
        .from('job_results')
        .insert(resultData);

      if (error) {
        console.error('Error storing stage result:', error);
      }
    } catch (error) {
      console.error('Error in storeStageResult:', error);
    }
  }

  /**
   * Update stage progress tracking
   */
  private async updateStageProgress(
    jobId: string,
    stageOrder: number,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    startTime?: number,
    imagesProcessed?: number,
    progressPercent?: number,
    endTime?: number,
    executionTime?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (startTime && status === 'processing') {
        updateData.started_at = new Date(startTime).toISOString();
      }
      
      if (imagesProcessed !== undefined) {
        updateData.images_processed = imagesProcessed;
      }

      if (endTime && status === 'completed') {
        updateData.completed_at = new Date(endTime).toISOString();
        updateData.execution_time_ms = executionTime;
      }

      // Try to update job_progress table first
      const { error: progressError } = await this.supabase
        .from('job_progress')
        .update(updateData)
        .eq('job_id', jobId)
        .eq('stage_order', stageOrder);

      if (progressError) {
        console.warn('Could not update job_progress:', progressError);
      }

      // Also update main job progress
      if (progressPercent !== undefined) {
        await this.supabase
          .from('jobs')
          .update({ 
            progress: progressPercent,
            updated_at: new Date().toISOString() 
          })
          .eq('id', jobId);
      }

    } catch (error) {
      console.warn('Stage progress update failed:', error);
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
} 