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

    // Check what type of metrics are requested
    const metricsType = searchParams.get('type');
    const stageOrder = searchParams.get('stage');
    const hoursBack = parseInt(searchParams.get('hours') || '24');

    switch (metricsType) {
      case 'execution':
        // Get comprehensive execution metrics
        const executionMetrics = await jobMonitoringService.getJobExecutionMetrics(id);
        return NextResponse.json(executionMetrics);

      case 'errors':
        // Get error details
        const errors = await jobMonitoringService.getStageErrors(
          id, 
          stageOrder ? parseInt(stageOrder) : undefined
        );
        return NextResponse.json({
          job_id: id,
          stage_order: stageOrder ? parseInt(stageOrder) : null,
          errors,
          total_errors: errors.length,
          error_types: errors.reduce((acc, error) => {
            acc[error.error_type] = (acc[error.error_type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });

      case 'history':
        // Get progress history for analytics
        const history = await jobMonitoringService.getProgressHistory(
          id,
          stageOrder ? parseInt(stageOrder) : undefined,
          hoursBack
        );
        return NextResponse.json({
          job_id: id,
          stage_order: stageOrder ? parseInt(stageOrder) : null,
          hours_back: hoursBack,
          history,
          data_points: history.length
        });

      case 'summary':
      default:
        // Get basic metrics summary
        const [executionData, progressData, errorData] = await Promise.all([
          jobMonitoringService.getJobExecutionMetrics(id),
          jobMonitoringService.getJobProgress(id),
          jobMonitoringService.getStageErrors(id, undefined, 10) // Last 10 errors
        ]);

        const summary = {
          job_id: id,
          overview: {
            total_stages: executionData.total_stages,
            completed_stages: executionData.completed_stages,
            failed_stages: executionData.failed_stages,
            overall_progress: executionData.overall_progress,
            success_rate: executionData.success_rate,
            total_execution_time: executionData.total_execution_time,
            average_stage_time: executionData.average_stage_time
          },
          current_status: {
            active_stages: progressData.filter(p => p.status === 'processing').length,
            pending_stages: progressData.filter(p => p.status === 'pending').length,
            images_processed: executionData.total_images_processed,
            total_errors: executionData.total_errors
          },
          recent_errors: errorData.slice(0, 5).map(error => ({
            stage_order: error.stage_order,
            error_type: error.error_type,
            error_message: error.error_message,
            occurred_at: error.occurred_at
          })),
          stage_performance: executionData.stage_metrics.map(stage => ({
            stage_order: stage.stage_order,
            stage_name: stage.stage_name,
            status: stage.status,
            success_rate: stage.success_rate,
            execution_time: stage.execution_time_ms,
            error_count: stage.error_count
          }))
        };

        return NextResponse.json(summary);
    }
  } catch (error) {
    console.error('Error fetching job metrics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch job metrics' },
      { status: 500 }
    );
  }
} 