import { NextRequest, NextResponse } from 'next/server';
import { getJobMonitoringService } from '@/lib/services/jobMonitoringService';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: jobId } = params;
    const { searchParams } = new URL(request.url);
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const jobMonitoringService = getJobMonitoringService();

    // Check if requesting specific stage progress
    const stageOrder = searchParams.get('stage');
    if (stageOrder) {
      const stageProgress = await jobMonitoringService.getStageProgress(
        jobId, 
        parseInt(stageOrder)
      );
      
      if (!stageProgress) {
        return NextResponse.json(
          { error: 'Stage progress not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(stageProgress);
    }

    // Return all job progress
    const progress = await jobMonitoringService.getJobProgress(jobId);

    return NextResponse.json({
      job_id: jobId,
      stages: progress,
      total_stages: progress.length,
      completed_stages: progress.filter(p => p.status === 'completed').length,
      processing_stages: progress.filter(p => p.status === 'processing').length,
      failed_stages: progress.filter(p => p.status === 'failed').length,
      overall_progress: progress.length > 0 
        ? Math.round(progress.reduce((sum, p) => sum + p.progress_percent, 0) / progress.length)
        : 0
    });
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
    const { id: jobId } = params;
    const body = await request.json();
    
    if (!jobId) {
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
      job_id: jobId,
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