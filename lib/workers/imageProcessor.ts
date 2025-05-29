import { getCohereService } from '@/lib/services/cohere';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { JobData } from '@/lib/services/simpleQueue';

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

      // Get pipeline stages
      const stages = await this.getPipelineStages(pipelineId);
      
      if (!stages || stages.length === 0) {
        throw new Error('No stages found for pipeline');
      }

      console.log(`Found ${stages.length} stages for pipeline ${pipelineId}`);

      // Process each image through the pipeline
      let processedCount = 0;
      const totalImages = imageIds.length;

      for (const imageId of imageIds) {
        console.log(`Processing image ${imageId} (${processedCount + 1}/${totalImages})`);
        
        try {
          // Get image data
          const image = await this.getImageData(imageId);
          if (!image) {
            console.warn(`Image ${imageId} not found, skipping`);
            continue;
          }

          // Process through each stage
          const imageResults = await this.processImageThroughStages(
            image, 
            stages, 
            jobId
          );

          // Store results
          await this.storeImageResults(jobId, imageId, imageResults);
          
          processedCount++;
          const progressPercent = Math.round((processedCount / totalImages) * 100);
          
          // Update progress
          await this.updateJobProgress(jobId, progressPercent, `Processed ${processedCount}/${totalImages} images`, processedCount);
          
        } catch (error) {
          console.error(`Error processing image ${imageId}:`, error);
          // Continue with other images instead of failing the entire job
        }
      }

      // Update final status
      await this.updateJobStatus(jobId, 'completed', null, {
        processedImages: processedCount,
        totalImages: totalImages,
        completedAt: new Date().toISOString()
      });

      console.log(`Job ${jobId} completed successfully`);

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus(jobId, 'failed', errorMessage);
      
      throw error;
    }
  }

  /**
   * Get pipeline stages from database
   */
  private async getPipelineStages(pipelineId: string) {
    const { data, error } = await this.supabase
      .from('pipeline_stages')
      .select(`
        id,
        stage_order,
        prompt_id,
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

    return data;
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
   * Process a single image through all pipeline stages
   */
  private async processImageThroughStages(image: any, stages: any[], jobId: string) {
    const results = [];
    let currentFiltered = [image]; // Start with the original image

    for (const stage of stages) {
      if (currentFiltered.length === 0) {
        console.log(`No images left to process at stage ${stage.stage_order}`);
        break;
      }

      console.log(`Processing stage ${stage.stage_order}: ${stage.prompts.name}`);

      const stageResults = [];
      
      for (const img of currentFiltered) {
        try {
          const result = await this.processImageWithPrompt(img, stage.prompts);
          stageResults.push({
            imageId: img.id,
            stageId: stage.id,
            promptId: stage.prompt_id,
            result: result.response,
            confidence: result.confidence,
            success: result.success,
            metadata: result.metadata
          });

          // For boolean prompts, filter based on response
          if (stage.prompts.type === 'boolean') {
            const booleanResult = this.parseBooleanResponse(result.response);
            if (!booleanResult) {
              console.log(`Image ${img.id} filtered out at stage ${stage.stage_order}`);
            }
          }
        } catch (error) {
          console.error(`Error processing image ${img.id} at stage ${stage.stage_order}:`, error);
          stageResults.push({
            imageId: img.id,
            stageId: stage.id,
            promptId: stage.prompt_id,
            result: null,
            confidence: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      results.push(...stageResults);

      // Filter for next stage if this is a boolean prompt
      if (stage.prompts.type === 'boolean') {
        const successfulResults = stageResults.filter(r => 
          r.success && r.result && this.parseBooleanResponse(r.result)
        );
        currentFiltered = currentFiltered.filter(img => 
          successfulResults.some(r => r.imageId === img.id)
        );
      }
    }

    return results;
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
   * Store image processing results in database
   */
  private async storeImageResults(jobId: string, imageId: string, results: any[]) {
    for (const result of results) {
      try {
        // Store all result data in the JSONB result field
        const resultData = {
          job_id: jobId,
          image_id: imageId,
          stage_id: result.stageId,
          result: {
            response: result.result,
            success: result.success,
            confidence: result.confidence,
            promptId: result.promptId,
            metadata: result.metadata,
            error: result.error || null,
            processedAt: new Date().toISOString()
          }
        };

        const { error } = await this.supabase
          .from('job_results')
          .insert(resultData);

        if (error) {
          console.error('Error storing job result:', error);
        } else {
          console.log(`Stored result for image ${imageId}, stage ${result.stageId}`);
        }
      } catch (error) {
        console.error('Error in storeImageResults:', error);
        // Continue with other results instead of failing
      }
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
   * Update job progress
   */
  private async updateJobProgress(jobId: string, percentage: number, message: string, processedCount?: number) {
    console.log(`Job ${jobId} progress: ${percentage}% - ${message}`);
    
    try {
      const updateData: any = {
        progress: percentage,
        updated_at: new Date().toISOString()
      };
      
      if (processedCount !== undefined) {
        updateData.processed_images = processedCount;
      }
      
      const { error } = await this.supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        console.error('Error updating job progress:', error);
      }
    } catch (error) {
      console.warn('Failed to update job progress in database:', error);
    }
  }
} 