import { NextRequest, NextResponse } from 'next/server';
import { getJobResultService, JobResultFilters } from '@/lib/services/jobResultService';
import { createSupabaseServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeAggregations = searchParams.get('aggregations') === 'true';
    
    // Parse filter parameters
    const filters: JobResultFilters = {};
    
    if (searchParams.get('jobId')) {
      filters.jobId = searchParams.get('jobId')!;
    }
    
    if (searchParams.get('imageId')) {
      filters.imageId = searchParams.get('imageId')!;
    }
    
    if (searchParams.get('stageId')) {
      filters.stageId = searchParams.get('stageId')!;
    }
    
    if (searchParams.get('stageOrder')) {
      filters.stageOrder = parseInt(searchParams.get('stageOrder')!);
    }
    
    if (searchParams.get('success')) {
      filters.success = searchParams.get('success') === 'true';
    }
    
    if (searchParams.get('confidenceMin')) {
      filters.confidenceMin = parseFloat(searchParams.get('confidenceMin')!);
    }
    
    if (searchParams.get('confidenceMax')) {
      filters.confidenceMax = parseFloat(searchParams.get('confidenceMax')!);
    }
    
    if (searchParams.get('promptType')) {
      filters.promptType = searchParams.get('promptType') as 'boolean' | 'descriptive' | 'keywords';
    }
    
    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom')!;
    }
    
    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo')!;
    }
    
    if (searchParams.get('searchTerm')) {
      filters.searchTerm = searchParams.get('searchTerm')!;
    }
    
    if (searchParams.get('hasError')) {
      filters.hasError = searchParams.get('hasError') === 'true';
    }
    
    if (searchParams.get('executionTimeMin')) {
      filters.executionTimeMin = parseInt(searchParams.get('executionTimeMin')!);
    }
    
    if (searchParams.get('executionTimeMax')) {
      filters.executionTimeMax = parseInt(searchParams.get('executionTimeMax')!);
    }

    const jobResultService = getJobResultService();
    
    const results = await jobResultService.getJobResults(
      filters,
      { page, limit },
      includeAggregations
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching job results:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch job results' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { job_id, image_id, stage_id, result } = body;

    if (!job_id || !image_id || !stage_id || !result) {
      return NextResponse.json(
        { error: 'Missing required fields: job_id, image_id, stage_id, result' },
        { status: 400 }
      );
    }

    const jobResultService = getJobResultService();
    
    const newResult = await jobResultService.createJobResult({
      job_id,
      image_id,
      stage_id,
      result,
    });

    return NextResponse.json(newResult, { status: 201 });
  } catch (error) {
    console.error('Error creating job result:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job result' },
      { status: 500 }
    );
  }
} 