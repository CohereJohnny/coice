import { NextRequest, NextResponse } from 'next/server';
import { getJobMonitoringService } from '@/lib/services/jobMonitoringService';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const jobMonitoringService = getJobMonitoringService();

    // Check what type of progress data is requested
    const progressType = searchParams.get('type');
    const stageOrder = searchParams.get('stage');
    const includeHistory = searchParams.get('history') === 'true';

    switch (progressType) {
      case 'detailed':
        // Get detailed progress for all stages
        const detailedProgress = await jobMonitoringService.getJobProgress(id);
        return NextResponse.json({
          job_id: id,
          stages: detailedProgress,
          total_stages: detailedProgress.length,
          active_stages: detailedProgress.filter(s => s.status === 'processing').length,
          completed_stages: detailedProgress.filter(s => s.status === 'completed').length
        });

      case 'stage':
        // Get progress for a specific stage
        if (!stageOrder) {
          return NextResponse.json(
            { error: 'Stage order is required for stage-specific progress' },
            { status: 400 }
          );
        }
        
        const stageProgress = await jobMonitoringService.getStageProgress(
          id, 
          parseInt(stageOrder)
        );
        
        const stageHistory = includeHistory 
          ? await jobMonitoringService.getProgressHistory(id, parseInt(stageOrder))
          : null;

        return NextResponse.json({
          job_id: id,
          stage_order: parseInt(stageOrder),
          progress: stageProgress,
          history: stageHistory
        });

      case 'summary':
      default:
        // Get basic progress summary
        const summary = await jobMonitoringService.getJobProgress(id);
        
        const progressSummary = {
          job_id: id,
          overall_progress: summary.reduce((acc, stage) => {
            return acc + (stage.progress_percent || 0);
          }, 0) / Math.max(summary.length, 1),
          total_stages: summary.length,
          stages_completed: summary.filter(s => s.status === 'completed').length,
          stages_processing: summary.filter(s => s.status === 'processing').length,
          stages_pending: summary.filter(s => s.status === 'pending').length,
          stages_failed: summary.filter(s => s.status === 'failed').length,
          total_images: summary.reduce((acc, stage) => acc + (stage.images_total || 0), 0),
          images_processed: summary.reduce((acc, stage) => acc + (stage.images_processed || 0), 0),
          total_errors: summary.reduce((acc, stage) => acc + (stage.error_count || 0), 0),
          estimated_completion: null, // TODO: Calculate based on current progress
          last_update: new Date().toISOString()
        };

        return NextResponse.json(progressSummary);
    }
  } catch (error) {
    console.error('Error fetching job progress:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch job progress' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const { 
      stage_order, 
      status, 
      images_processed, 
      progress_percent, 
      error_count, 
      last_error, 
      failed_images, 
      execution_time_ms, 
      metadata 
    } = body;

    if (!stage_order || !status) {
      return NextResponse.json(
        { error: 'stage_order and status are required' },
        { status: 400 }
      );
    }

    const jobMonitoringService = getJobMonitoringService();

    const updatedProgress = await jobMonitoringService.updateStageProgress({
      job_id: id,
      stage_order,
      status,
      images_processed,
      progress_percent,
      error_count,
      last_error,
      failed_images,
      execution_time_ms,
      metadata
    });

    return NextResponse.json(updatedProgress);
  } catch (error) {
    console.error('Error updating job progress:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update job progress' },
      { status: 500 }
    );
  }
} 