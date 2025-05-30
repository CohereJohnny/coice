// Job Analytics API Route
// Sprint 11 Task 5.1: Enhance job management APIs

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jobErrorService } from '@/lib/services/jobErrorService';

interface JobAnalytics {
  performance: {
    totalExecutionTime: number;
    avgStageTime: number;
    slowestStage: { name: string; time: number };
    fastestStage: { name: string; time: number };
    throughput: number; // images per minute
  };
  quality: {
    totalResults: number;
    successRate: number;
    avgConfidence: number;
    confidenceDistribution: Array<{ range: string; count: number }>;
  };
  errors: {
    totalErrors: number;
    errorsByType: Array<{ type: string; count: number }>;
    criticalErrors: number;
    resolutionRate: number;
  };
  stages: Array<{
    name: string;
    order: number;
    results: number;
    successRate: number;
    avgConfidence: number;
    avgTime: number;
    errors: number;
  }>;
  timeline: Array<{
    timestamp: string;
    event: 'started' | 'stage_completed' | 'completed' | 'failed';
    stage?: string;
    details?: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Create admin Supabase client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get job details
    const { data: job, error: jobError } = await adminSupabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get job results with stage information
    const { data: results, error: resultsError } = await adminSupabase
      .from('job_results')
      .select(`
        *,
        pipeline_stages!inner(
          stage_order,
          prompt:prompts(name, type)
        )
      `)
      .eq('job_id', jobId)
      .order('created_at');

    if (resultsError) {
      console.error('Error fetching job results:', resultsError);
      return NextResponse.json(
        { error: 'Failed to fetch job analytics' },
        { status: 500 }
      );
    }

    // Get job errors
    const jobErrors = await jobErrorService.getJobErrors(jobId);

    // Calculate analytics
    const analytics = calculateJobAnalytics(job, results || [], jobErrors);

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching job analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateJobAnalytics(
  job: any,
  results: any[],
  errors: any[]
): JobAnalytics {
  const totalResults = results.length;
  const successfulResults = results.filter(r => r.success);
  const stages = getStageAnalytics(results);

  // Performance calculations
  const executionTime = job.completed_at && job.created_at
    ? (new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000
    : 0;

  const avgStageTime = stages.length > 0
    ? stages.reduce((sum, stage) => sum + stage.avgTime, 0) / stages.length
    : 0;

  const sortedStages = [...stages].sort((a, b) => b.avgTime - a.avgTime);
  const slowestStage = sortedStages[0] || { name: 'N/A', avgTime: 0 };
  const fastestStage = sortedStages[sortedStages.length - 1] || { name: 'N/A', avgTime: 0 };

  const throughput = executionTime > 0 ? (totalResults / executionTime) * 60 : 0;

  // Quality calculations
  const successRate = totalResults > 0 ? (successfulResults.length / totalResults) * 100 : 0;
  const avgConfidence = successfulResults.length > 0
    ? successfulResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / successfulResults.length
    : 0;

  const confidenceDistribution = calculateConfidenceDistribution(successfulResults);

  // Error calculations
  const errorsByType = errors.reduce((acc: Array<{ type: string; count: number }>, error) => {
    const existing = acc.find((item: { type: string; count: number }) => item.type === error.errorType);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ type: error.errorType, count: 1 });
    }
    return acc;
  }, [] as Array<{ type: string; count: number }>);

  const criticalErrors = errors.filter(e => 
    ['INVALID_PIPELINE', 'DATABASE_ERROR', 'STORAGE_ERROR'].includes(e.errorCode)
  ).length;

  const resolvedErrors = errors.filter(e => e.resolved).length;
  const resolutionRate = errors.length > 0 ? (resolvedErrors / errors.length) * 100 : 0;

  // Timeline
  const timeline = buildJobTimeline(job, results, errors);

  return {
    performance: {
      totalExecutionTime: Math.round(executionTime),
      avgStageTime: Math.round(avgStageTime * 100) / 100,
      slowestStage: {
        name: slowestStage.name,
        time: Math.round(slowestStage.avgTime * 100) / 100
      },
      fastestStage: {
        name: fastestStage.name,
        time: Math.round(fastestStage.avgTime * 100) / 100
      },
      throughput: Math.round(throughput * 100) / 100
    },
    quality: {
      totalResults,
      successRate: Math.round(successRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      confidenceDistribution
    },
    errors: {
      totalErrors: errors.length,
      errorsByType,
      criticalErrors,
      resolutionRate: Math.round(resolutionRate * 100) / 100
    },
    stages,
    timeline
  };
}

function getStageAnalytics(results: any[]): Array<{
  name: string;
  order: number;
  results: number;
  successRate: number;
  avgConfidence: number;
  avgTime: number;
  errors: number;
}> {
  const stageMap = new Map();

  results.forEach(result => {
    const stageName = result.pipeline_stages?.prompt?.name || 'Unknown';
    const stageOrder = result.pipeline_stages?.stage_order || 0;
    
    if (!stageMap.has(stageName)) {
      stageMap.set(stageName, {
        name: stageName,
        order: stageOrder,
        results: 0,
        successful: 0,
        confidenceSum: 0,
        confidenceCount: 0,
        timeSum: 0,
        errors: 0
      });
    }

    const stage = stageMap.get(stageName);
    stage.results++;
    
    if (result.success) {
      stage.successful++;
      if (result.confidence) {
        stage.confidenceSum += result.confidence;
        stage.confidenceCount++;
      }
    } else {
      stage.errors++;
    }

    // Calculate processing time (rough estimate)
    if (result.executed_at && result.created_at) {
      const processingTime = (new Date(result.executed_at).getTime() - new Date(result.created_at).getTime()) / 1000;
      stage.timeSum += processingTime;
    }
  });

  return Array.from(stageMap.values()).map(stage => ({
    name: stage.name,
    order: stage.order,
    results: stage.results,
    successRate: stage.results > 0 ? Math.round((stage.successful / stage.results) * 10000) / 100 : 0,
    avgConfidence: stage.confidenceCount > 0 ? Math.round((stage.confidenceSum / stage.confidenceCount) * 100) / 100 : 0,
    avgTime: stage.results > 0 ? Math.round((stage.timeSum / stage.results) * 100) / 100 : 0,
    errors: stage.errors
  })).sort((a, b) => a.order - b.order);
}

function calculateConfidenceDistribution(results: any[]): Array<{ range: string; count: number }> {
  const ranges = [
    { range: '0-20%', min: 0, max: 0.2 },
    { range: '21-40%', min: 0.2, max: 0.4 },
    { range: '41-60%', min: 0.4, max: 0.6 },
    { range: '61-80%', min: 0.6, max: 0.8 },
    { range: '81-100%', min: 0.8, max: 1.0 }
  ];

  return ranges.map(range => ({
    range: range.range,
    count: results.filter(r => 
      r.confidence >= range.min && r.confidence <= range.max
    ).length
  }));
}

function buildJobTimeline(job: any, results: any[], errors: any[]): Array<{
  timestamp: string;
  event: 'started' | 'stage_completed' | 'completed' | 'failed';
  stage?: string;
  details?: string;
}> {
  const timeline = [];

  // Job started
  timeline.push({
    timestamp: job.created_at,
    event: 'started' as const,
    details: `Job started with ${job.total_images} images`
  });

  // Stage completions (group by stage)
  const stageCompletions = new Map();
  results.forEach(result => {
    const stageName = result.pipeline_stages?.prompt?.name || 'Unknown';
    if (!stageCompletions.has(stageName)) {
      stageCompletions.set(stageName, []);
    }
    stageCompletions.get(stageName).push(result);
  });

  stageCompletions.forEach((stageResults, stageName) => {
    const latestResult = stageResults.sort((a: any, b: any) => 
      new Date(b.executed_at || b.created_at).getTime() - new Date(a.executed_at || a.created_at).getTime()
    )[0];

    timeline.push({
      timestamp: latestResult.executed_at || latestResult.created_at,
      event: 'stage_completed' as const,
      stage: stageName,
      details: `Completed ${stageResults.length} results`
    });
  });

  // Major errors
  errors.forEach(error => {
    if (['INVALID_PIPELINE', 'DATABASE_ERROR', 'STORAGE_ERROR'].includes(error.errorCode)) {
      timeline.push({
        timestamp: error.createdAt,
        event: 'failed' as const,
        details: `Critical error: ${error.errorMessage.substring(0, 50)}...`
      });
    }
  });

  // Job completion
  if (job.completed_at) {
    timeline.push({
      timestamp: job.completed_at,
      event: job.status === 'completed' ? 'completed' as const : 'failed' as const,
      details: job.status === 'completed' 
        ? `Job completed successfully`
        : `Job failed: ${job.error_message || 'Unknown error'}`
    });
  }

  return timeline.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
} 