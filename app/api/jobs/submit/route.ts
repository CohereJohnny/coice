import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase';
import { getQueueService } from '@/lib/services/queue';
import { z } from 'zod';

// Input validation schema
const JobSubmissionSchema = z.object({
  pipelineId: z.string().uuid('Pipeline ID must be a valid UUID'),
  imageIds: z.array(z.string().uuid('Image ID must be a valid UUID')).min(1, 'At least one image must be selected'),
  libraryId: z.number().int().positive('Library ID must be a positive integer'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { pipelineId, imageIds, libraryId } = JobSubmissionSchema.parse(body);

    // Get user from session
    const supabase = await createSupabaseServerClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Validate pipeline exists and user has access
    const serviceSupabase = createSupabaseServiceClient();
    const { data: pipeline, error: pipelineError } = await serviceSupabase
      .from('pipelines')
      .select('id, name, library_id')
      .eq('id', pipelineId)
      .single();

    if (pipelineError || !pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found or access denied' },
        { status: 404 }
      );
    }

    // Validate library exists and user has access
    const { data: library, error: libraryError } = await serviceSupabase
      .from('libraries')
      .select('id, name, catalog_id')
      .eq('id', libraryId)
      .single();

    if (libraryError || !library) {
      return NextResponse.json(
        { error: 'Library not found or access denied' },
        { status: 404 }
      );
    }

    // Validate all images exist and belong to the specified library
    const { data: images, error: imagesError } = await serviceSupabase
      .from('images')
      .select('id, library_id')
      .in('id', imageIds)
      .eq('library_id', libraryId);

    if (imagesError) {
      return NextResponse.json(
        { error: 'Error validating images' },
        { status: 500 }
      );
    }

    if (!images || images.length !== imageIds.length) {
      const foundImageIds = images?.map(img => img.id) || [];
      const missingImageIds = imageIds.filter((id: string) => !foundImageIds.includes(id));
      
      return NextResponse.json(
        { 
          error: 'Some images not found or do not belong to the specified library',
          missingImageIds
        },
        { status: 400 }
      );
    }

    // Create job record in database
    const jobId = crypto.randomUUID();
    const { error: jobError } = await serviceSupabase
      .from('jobs')
      .insert({
        id: jobId,
        pipeline_id: pipelineId,
        library_id: libraryId,
        image_ids: imageIds,
        total_images: imageIds.length,
        processed_images: 0,
        status: 'pending',
        created_by: userId,
      });

    if (jobError) {
      console.error('Error creating job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }

    // Add job to queue
    const queueService = getQueueService();
    try {
      const queueJob = await queueService.addJob({
        jobId,
        pipelineId,
        imageIds,
        userId,
        metadata: {
          libraryId,
          libraryName: library.name,
          pipelineName: pipeline.name,
        },
      });

      console.log(`Job ${jobId} queued successfully with Bull ID: ${queueJob.id}`);

      return NextResponse.json({
        success: true,
        jobId,
        message: 'Job submitted successfully',
        details: {
          pipelineName: pipeline.name,
          libraryName: library.name,
          imageCount: imageIds.length,
          estimatedDuration: Math.ceil(imageIds.length * 0.5), // Rough estimate: 30 seconds per image
        },
      });
    } catch (queueError) {
      console.error('Error adding job to queue:', queueError);
      
      // Clean up the database record if queue fails
      await serviceSupabase
        .from('jobs')
        .update({ status: 'failed', error_message: 'Failed to queue job' })
        .eq('id', jobId);

      return NextResponse.json(
        { error: 'Failed to queue job for processing' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Job submission error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 