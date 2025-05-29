import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase';
import { getQueueService } from '@/lib/services/queue';

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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

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

    // Get progress from Bull queue if job is active
    let progress = null;
    if (job.status === 'pending' || job.status === 'processing') {
      try {
        const queueService = getQueueService();
        const queueJob = await queueService.getJob(jobId);
        
        if (queueJob && queueJob.progress) {
          progress = queueJob.progress();
        } else {
          // Fallback to basic progress calculation from database
          progress = {
            percentage: job.total_images > 0 ? Math.round((job.processed_images / job.total_images) * 100) : 0,
            stage: 'Processing...',
            processedImages: job.processed_images,
            totalImages: job.total_images,
          };
        }
      } catch (queueError) {
        console.warn('Failed to get queue progress:', queueError);
        // Fallback to basic progress
        progress = {
          percentage: job.total_images > 0 ? Math.round((job.processed_images / job.total_images) * 100) : 0,
          stage: 'Processing...',
          processedImages: job.processed_images,
          totalImages: job.total_images,
        };
      }
    } else {
      // For completed/failed jobs, show final progress
      progress = {
        percentage: job.status === 'completed' ? 100 : (job.total_images > 0 ? Math.round((job.processed_images / job.total_images) * 100) : 0),
        stage: job.status === 'completed' ? 'Completed' : (job.status === 'failed' ? 'Failed' : job.status),
        processedImages: job.processed_images,
        totalImages: job.total_images,
      };
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
        .order('executed_at', { ascending: true });

      results = jobResults;
    }

    // Get queue status if job is in queue
    let queueStatus = null;
    if (job.status === 'pending' || job.status === 'processing') {
      try {
        const queueService = getQueueService();
        const queueJob = await queueService.getJob(jobId);
        
        if (queueJob) {
          queueStatus = {
            id: queueJob.id,
            state: await queueJob.getState(),
            progress: queueJob.progress(),
            attempts: queueJob.attemptsMade,
            failedReason: queueJob.failedReason,
            processedOn: queueJob.processedOn,
            finishedOn: queueJob.finishedOn,
          };
        }
      } catch (queueError) {
        console.warn('Failed to get queue status:', queueError);
        // Continue without queue status
      }
    }

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        totalImages: job.total_images,
        processedImages: job.processed_images,
        imageIds: job.image_ids,
        errorMessage: job.error_message,
        resultsSummary: job.results_summary,
        pipeline: job.pipeline,
        library: job.library,
      },
      progress,
      results,
      queueStatus,
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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

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