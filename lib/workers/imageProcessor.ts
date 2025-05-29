import Bull from 'bull';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getCohereService } from '@/lib/services/cohere';
import { JobData, JobProgress } from '@/lib/services/queue';

export interface ProcessingResult {
  imageId: string;
  stageId: string;
  response: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export class ImageProcessor {
  private supabase = createSupabaseServiceClient();
  private cohere = getCohereService();

  /**
   * Main job processing function
   */
  async processJob(job: Bull.Job<JobData>): Promise<void> {
    const { jobId, pipelineId, imageIds, userId } = job.data;
    
    try {
      console.log(`Starting job ${jobId} for user ${userId}`);
      
      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing');
      
      // Get pipeline and stages information
      const pipeline = await this.getPipelineWithStages(pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      // Get image information
      const images = await this.getImages(imageIds);
      if (images.length === 0) {
        throw new Error('No valid images found');
      }

      // Process images through pipeline stages
      const results = await this.processPipelineStages(job, pipeline, images);
      
      // Update job as completed
      await this.updateJobStatus(jobId, 'completed');
      await this.updateJobResults(jobId, results);
      
      console.log(`Job ${jobId} completed successfully`);
      
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      
      // Update job as failed
      await this.updateJobStatus(jobId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      
      throw error; // Re-throw to mark job as failed in Bull
    }
  }

  /**
   * Process images through all pipeline stages
   */
  private async processPipelineStages(
    job: Bull.Job<JobData>,
    pipeline: any,
    images: any[]
  ): Promise<ProcessingResult[]> {
    const { jobId } = job.data;
    const stages = pipeline.stages || [];
    const allResults: ProcessingResult[] = [];
    
    let currentImages = images;
    
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
      const stage = stages[stageIndex];
      const stageName = `Stage ${stageIndex + 1}: ${stage.prompt?.prompt_text || stage.prompt?.prompt || 'Unknown'}`;
      
      console.log(`Processing ${stageName} for job ${jobId}`);
      
      // Update progress
      const baseProgress = (stageIndex / stages.length) * 100;
      await this.updateProgress(job, baseProgress, stageName, 0, currentImages.length);
      
      // Process all images in this stage
      const stageResults = await this.processStage(job, stage, currentImages, stageIndex, stages.length);
      allResults.push(...stageResults);
      
      // Apply stage filtering if configured
      if (stage.filter_condition && stage.filter_condition !== 'none') {
        currentImages = this.applyStageFiltering(currentImages, stageResults, stage.filter_condition);
        console.log(`After filtering: ${currentImages.length} images remaining`);
      }
      
      // Complete stage progress
      const stageProgress = ((stageIndex + 1) / stages.length) * 100;
      await this.updateProgress(job, stageProgress, `${stageName} - Complete`, currentImages.length, currentImages.length);
    }
    
    return allResults;
  }

  /**
   * Process a single stage for all images
   */
  private async processStage(
    job: Bull.Job<JobData>,
    stage: any,
    images: any[],
    stageIndex: number,
    totalStages: number
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      const image = images[imageIndex];
      
      try {
        // Update progress for current image
        const stageProgress = (stageIndex / totalStages) * 100;
        const imageProgress = (imageIndex / images.length) * (100 / totalStages);
        const totalProgress = stageProgress + imageProgress;
        
        await this.updateProgress(
          job, 
          totalProgress, 
          `Stage ${stageIndex + 1}`, 
          imageIndex, 
          images.length,
          image.metadata?.file_name || `Image ${image.id}`
        );
        
        // Process image with Cohere
        const result = await this.processImageWithCohere(image, stage);
        results.push(result);
        
        // Store result in database
        await this.storeImageResult(job.data.jobId, result);
        
        // Update processed count in jobs table
        await this.updateProcessedCount(job.data.jobId, imageIndex + 1);
        
      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error);
        
        const errorResult: ProcessingResult = {
          imageId: image.id,
          stageId: stage.id,
          response: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        
        results.push(errorResult);
        await this.storeImageResult(job.data.jobId, errorResult);
      }
    }
    
    return results;
  }

  /**
   * Process a single image with Cohere
   */
  private async processImageWithCohere(image: any, stage: any): Promise<ProcessingResult> {
    const prompt = stage.prompt;
    if (!prompt) {
      throw new Error('Stage has no prompt configured');
    }

    // Build image URL from GCS path
    const imageUrl = this.buildImageUrl(image.gcs_path);
    
    // Call Cohere API
    const response = await this.cohere.analyzeImage({
      imageUrl,
      prompt: prompt.prompt_text || prompt.prompt,
      promptType: prompt.prompt_type || prompt.type,
    });

    return {
      imageId: image.id,
      stageId: stage.id,
      response: response.response,
      success: response.success,
      error: response.error,
      metadata: {
        promptType: prompt.prompt_type || prompt.type,
        promptText: prompt.prompt_text || prompt.prompt,
        cohereMetadata: response.metadata,
      },
    };
  }

  /**
   * Apply filtering based on stage results
   */
  private applyStageFiltering(images: any[], results: ProcessingResult[], condition: string): any[] {
    switch (condition) {
      case 'true_only':
        // Only keep images where the boolean result was true
        const trueImageIds = results
          .filter(r => r.success && r.response.toLowerCase() === 'true')
          .map(r => r.imageId);
        return images.filter(img => trueImageIds.includes(img.id));
      
      case 'false_only':
        // Only keep images where the boolean result was false
        const falseImageIds = results
          .filter(r => r.success && r.response.toLowerCase() === 'false')
          .map(r => r.imageId);
        return images.filter(img => falseImageIds.includes(img.id));
      
      case 'success_only':
        // Only keep images that were successfully processed
        const successImageIds = results
          .filter(r => r.success)
          .map(r => r.imageId);
        return images.filter(img => successImageIds.includes(img.id));
      
      default:
        // No filtering
        return images;
    }
  }

  /**
   * Build full image URL from GCS path
   */
  private buildImageUrl(gcsPath: string): string {
    // For now, return a placeholder URL since we're using simulated responses
    // TODO: Implement proper GCS URL generation when we have real image analysis
    return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcsPath}`;
  }

  /**
   * Update job progress in Bull only (no database table for now)
   */
  private async updateProgress(
    job: Bull.Job<JobData>,
    percentage: number,
    stage: string,
    processedImages: number,
    totalImages: number,
    currentImage?: string
  ): Promise<void> {
    const progress: JobProgress = {
      percentage: Math.round(percentage),
      stage,
      processedImages,
      totalImages,
      currentImage,
    };

    // Update Bull job progress
    await job.progress(progress);
    
    // Also update the processed count in the jobs table
    await this.updateProcessedCount(job.data.jobId, processedImages);
  }

  /**
   * Update processed images count in jobs table
   */
  private async updateProcessedCount(jobId: string, processedCount: number): Promise<void> {
    await this.supabase
      .from('jobs')
      .update({ 
        processed_images: processedCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await this.supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job status:', error);
    }
  }

  /**
   * Update job results summary
   */
  private async updateJobResults(jobId: string, results: ProcessingResult[]): Promise<void> {
    const summary = {
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      stages: [...new Set(results.map(r => r.stageId))].length,
    };

    await this.supabase
      .from('jobs')
      .update({
        results_summary: summary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Store individual image result using the actual database schema
   */
  private async storeImageResult(jobId: string, result: ProcessingResult): Promise<void> {
    // Convert our result format to match the database schema
    const resultData = {
      response: result.response,
      success: result.success,
      error: result.error,
      metadata: result.metadata,
    };

    const { error } = await this.supabase
      .from('job_results')
      .insert({
        job_id: jobId,
        image_id: result.imageId,
        stage_id: result.stageId,
        result: resultData, // Store as JSON in the 'result' field
        executed_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error storing job result:', error);
    }
  }

  /**
   * Get pipeline with stages and prompts
   */
  private async getPipelineWithStages(pipelineId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('pipelines')
      .select(`
        *,
        stages:pipeline_stages(
          *,
          prompt:prompts(*)
        )
      `)
      .eq('id', pipelineId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch pipeline: ${error.message}`);
    }

    return data;
  }

  /**
   * Get images by IDs
   */
  private async getImages(imageIds: string[]): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('images')
      .select('*')
      .in('id', imageIds);

    if (error) {
      throw new Error(`Failed to fetch images: ${error.message}`);
    }

    return data || [];
  }
}

export default ImageProcessor; 