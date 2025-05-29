import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase';
import { getQueueService } from '@/lib/services/simpleQueue';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: jobId } = await params;

    // Get user from session
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get job details from database
    const serviceSupabase = createSupabaseServiceClient();
    const { data: job, error: jobError } = await serviceSupabase
      .from('jobs')
      .select(`
        *,
        pipeline:pipelines!jobs_pipeline_id_fkey(
          id,
          name,
          description
        ),
        library:libraries!jobs_library_id_fkey(
          id,
          name,
          catalog_id
        )
      `)
      .eq('id', jobId)
      .eq('created_by', userId) // Ensure user owns the job
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Get job results if completed
    let results = null;
    if (job.status === 'completed') {
      const { data: jobResults } = await serviceSupabase
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
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      // Flatten the results to include stage_order for easier UI display
      results = jobResults?.map(result => ({
        ...result,
        stage_order: result.stage?.stage_order,
        prompt_name: result.stage?.prompt?.name,
        prompt_type: result.stage?.prompt?.type,
      })) || [];
    }

    // Get job details from queue if available
    const queueService = getQueueService();
    const queueJob = await queueService.getJob(jobId);

    // Combine database and queue information
    const jobDetails = {
      id: job.id,
      status: job.status,
      progress: job.progress || 0,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      totalImages: job.total_images,
      processedImages: job.processed_images,
      imageIds: job.image_ids,
      errorMessage: job.error_message,
      resultsSummary: job.results_summary,
      pipeline: job.pipeline,
      library: job.library,
      // Add queue-specific information if available
      queueInfo: queueJob ? {
        id: queueJob.id,
        status: queueJob.status,
        progress: queueJob.progress,
        attempts: queueJob.attempts,
        maxAttempts: queueJob.maxAttempts,
        startedAt: queueJob.startedAt,
        error: queueJob.error,
      } : null,
    };

    return NextResponse.json({
      job: jobDetails,
      results: results,
    });

  } catch (error) {
    console.error('Job details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: jobId } = await params;

    // Get user from session
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Check if job exists and user owns it
    const serviceSupabase = createSupabaseServiceClient();
    const { data: job, error: jobError } = await serviceSupabase
      .from('jobs')
      .select('id, status, created_by')
      .eq('id', jobId)
      .eq('created_by', userId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Check if job can be cancelled
    if (job.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed job' },
        { status: 400 }
      );
    }

    // Cancel job in queue if it's pending or processing
    if (job.status === 'pending' || job.status === 'processing') {
      try {
        const queueService = getQueueService();
        await queueService.cancelJob(jobId);
      } catch (queueError) {
        console.warn('Failed to cancel job in queue:', queueError);
        // Continue with database update
      }
    }

    // Update job status to cancelled
    const { error: updateError } = await serviceSupabase
      .from('jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job status:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
    });

  } catch (error) {
    console.error('Job cancellation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 