import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// GET /api/pipelines - List pipelines accessible to the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for all data fetching to ensure access to related tables
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const libraryId = searchParams.get('library_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query with filters - fetch pipelines without relationships first
    let query = adminSupabase
      .from('pipelines')
      .select(`
        id,
        name,
        description,
        library_id,
        created_at,
        created_by
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (libraryId) {
      const libraryIdNum = parseInt(libraryId);
      if (!isNaN(libraryIdNum)) {
        query = query.eq('library_id', libraryIdNum);
      }
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: pipelines, error } = await query;

    if (error) {
      console.error('Error fetching pipelines:', error);
      return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 });
    }

    // If no pipelines found, return empty array
    if (!pipelines || pipelines.length === 0) {
      return NextResponse.json({
        pipelines: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      });
    }

    // Fetch related data separately
    const libraryIds = [...new Set(pipelines.map(p => p.library_id).filter(Boolean))];
    const creatorIds = [...new Set(pipelines.map(p => p.created_by))];

    // Fetch libraries
    const { data: libraries } = libraryIds.length > 0 ? await adminSupabase
      .from('libraries')
      .select('id, name')
      .in('id', libraryIds) : { data: [] };

    // Fetch creators (profiles)
    const { data: creators } = await adminSupabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', creatorIds);

    // Fetch pipeline stages separately for all pipelines
    const pipelineIds = pipelines.map(p => p.id);
    const { data: allStages } = await adminSupabase
      .from('pipeline_stages')
      .select(`
        id,
        pipeline_id,
        stage_order,
        filter_condition,
        prompt_id,
        prompt:prompt_id (
          id,
          name,
          prompt,
          type
        )
      `)
      .in('pipeline_id', pipelineIds)
      .order('stage_order');

    // Group stages by pipeline_id
    const stagesByPipeline = new Map();
    allStages?.forEach(stage => {
      if (!stagesByPipeline.has(stage.pipeline_id)) {
        stagesByPipeline.set(stage.pipeline_id, []);
      }
      stagesByPipeline.get(stage.pipeline_id).push(stage);
    });

    // Transform data to match frontend expectations
    const transformedPipelines = (pipelines || []).map(pipeline => ({
      ...pipeline,
      stages: stagesByPipeline.get(pipeline.id) || [],
      creator_name: creators?.find(c => c.id === pipeline.created_by)?.display_name || creators?.find(c => c.id === pipeline.created_by)?.email || 'Unknown',
      library_name: libraries?.find(l => l.id === pipeline.library_id)?.name || 'No Library',
      // Remove the raw pipeline_stages to avoid confusion
      pipeline_stages: undefined
    }));

    // Get total count for pagination
    let countQuery = adminSupabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true });

    if (libraryId) {
      const libraryIdNum = parseInt(libraryId);
      if (!isNaN(libraryIdNum)) {
        countQuery = countQuery.eq('library_id', libraryIdNum);
      }
    }

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting pipelines:', countError);
      return NextResponse.json({ error: 'Failed to count pipelines' }, { status: 500 });
    }

    return NextResponse.json({
      pipelines: transformedPipelines,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/pipelines - Create a new pipeline with stages (Managers/Admins only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has manager or admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only managers and admins can create pipelines' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, library_id, stages } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (library_id && typeof library_id !== 'number') {
      return NextResponse.json({ error: 'Library ID must be a number' }, { status: 400 });
    }

    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ error: 'At least one stage is required' }, { status: 400 });
    }

    // Validate stages
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (!stage.prompt_id || typeof stage.prompt_id !== 'string') {
        return NextResponse.json({ 
          error: `Stage ${i + 1}: prompt_id is required and must be a string` 
        }, { status: 400 });
      }
      
      if (typeof stage.stage_order !== 'number' || stage.stage_order < 1) {
        return NextResponse.json({ 
          error: `Stage ${i + 1}: stage_order must be a positive number` 
        }, { status: 400 });
      }
    }

    // Check for duplicate stage orders
    const stageOrders = stages.map(s => s.stage_order);
    if (new Set(stageOrders).size !== stageOrders.length) {
      return NextResponse.json({ 
        error: 'Stage orders must be unique' 
      }, { status: 400 });
    }

    // Use service role client to bypass RLS for database operations
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If library_id is provided, verify it exists and user has access
    if (library_id) {
      const { error: libraryError } = await supabase
        .from('libraries')
        .select('id')
        .eq('id', library_id)
        .single();

      if (libraryError) {
        if (libraryError.code === 'PGRST116') {
          return NextResponse.json({ error: 'Library not found or access denied' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to verify library access' }, { status: 500 });
      }
    }

    // Verify all prompts exist and user has access
    const promptIds = stages.map(s => s.prompt_id);
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select('id')
      .in('id', promptIds);

    if (promptsError) {
      console.error('Error verifying prompts:', promptsError);
      return NextResponse.json({ error: 'Failed to verify prompts' }, { status: 500 });
    }

    if (!prompts || prompts.length !== promptIds.length) {
      return NextResponse.json({ 
        error: 'One or more prompts not found or access denied' 
      }, { status: 400 });
    }

    // Start transaction - create pipeline and stages using service role
    const { data: newPipeline, error: createError } = await adminSupabase
      .from('pipelines')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        library_id: library_id || null,
        created_by: user.id
      })
      .select(`
        id,
        name,
        description,
        library_id,
        created_at,
        created_by
      `)
      .single();

    if (createError) {
      console.error('Error creating pipeline:', createError);
      return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
    }

    // Create pipeline stages using service role
    const stageInserts = stages.map(stage => ({
      pipeline_id: newPipeline.id,
      prompt_id: stage.prompt_id,
      stage_order: stage.stage_order,
      filter_condition: stage.filter_condition || null
    }));

    const { data: newStages, error: stagesError } = await adminSupabase
      .from('pipeline_stages')
      .insert(stageInserts)
      .select(`
        id,
        stage_order,
        filter_condition,
        prompt_id
      `);

    if (stagesError) {
      console.error('Error creating pipeline stages:', stagesError);
      // Try to clean up the pipeline
      await adminSupabase.from('pipelines').delete().eq('id', newPipeline.id);
      return NextResponse.json({ error: 'Failed to create pipeline stages' }, { status: 500 });
    }

    // Fetch created user profile for response using service role
    const { data: userProfile } = await adminSupabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single();

    // Fetch prompt details for stages using service role
    const { data: stagePrompts } = await adminSupabase
      .from('prompts')
      .select('id, name, type')
      .in('id', promptIds);

    // Combine stage data with prompt information
    const stagesWithPrompts = newStages?.map(stage => ({
      ...stage,
      prompts: stagePrompts?.find(p => p.id === stage.prompt_id)
    }));

    return NextResponse.json({
      message: 'Pipeline created successfully',
      pipeline: {
        ...newPipeline,
        profiles: userProfile,
        stages: stagesWithPrompts
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 