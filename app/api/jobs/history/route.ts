import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 items per page
    const status = searchParams.get('status'); // Optional status filter
    const libraryId = searchParams.get('libraryId'); // Optional library filter
    const pipelineId = searchParams.get('pipelineId'); // Optional pipeline filter

    const offset = (page - 1) * limit;

    // Build query
    const serviceSupabase = createSupabaseServiceClient();
    let query = serviceSupabase
      .from('jobs')
      .select(`
        id,
        status,
        created_at,
        completed_at,
        total_images,
        processed_images,
        error_message,
        results_summary,
        pipeline:pipelines!jobs_pipeline_id_fkey(
          id,
          name,
          description
        ),
        library:libraries!jobs_library_id_fkey(
          id,
          name,
          description,
          catalog:catalogs!libraries_catalog_id_fkey(
            id,
            name
          )
        )
      `)
      .eq('created_by', userId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (libraryId) {
      query = query.eq('library_id', parseInt(libraryId));
    }

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    // Get total count for pagination
    const { count, error: countError } = await serviceSupabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (countError) {
      console.error('Error getting job count:', countError);
      return NextResponse.json(
        { error: 'Failed to get job count' },
        { status: 500 }
      );
    }

    // Get paginated results
    const { data: jobs, error: jobsError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Enhance jobs with calculated fields
    const enhancedJobs = jobs?.map(job => ({
      ...job,
      duration: job.completed_at && job.created_at 
        ? Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000)
        : null,
      progress: job.total_images > 0 
        ? Math.round((job.processed_images / job.total_images) * 100)
        : 0,
      isComplete: job.status === 'completed',
      isFailed: job.status === 'failed',
      isActive: job.status === 'processing',
      isPending: job.status === 'pending',
    }));

    return NextResponse.json({
      jobs: enhancedJobs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      filters: {
        status,
        libraryId: libraryId ? parseInt(libraryId) : undefined,
        pipelineId,
      },
    });

  } catch (error) {
    console.error('Job history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 