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

    const { searchParams } = new URL(request.url);
    const libraryId = searchParams.get('library_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query with filters
    let query = supabase
      .from('pipelines')
      .select(`
        id,
        name,
        description,
        library_id,
        created_at,
        profiles:created_by (
          display_name,
          email
        ),
        libraries:library_id (
          id,
          name,
          catalogs:catalog_id (
            id,
            name
          )
        )
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

    // Get total count for pagination
    let countQuery = supabase
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
      pipelines,
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

    // Start transaction - create pipeline and stages
    const { data: newPipeline, error: createError } = await supabase
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
        profiles:created_by (
          display_name,
          email
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating pipeline:', createError);
      return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
    }

    // Create pipeline stages
    const stageInserts = stages.map(stage => ({
      pipeline_id: newPipeline.id,
      prompt_id: stage.prompt_id,
      stage_order: stage.stage_order,
      filter_condition: stage.filter_condition || null
    }));

    const { data: newStages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .insert(stageInserts)
      .select(`
        id,
        stage_order,
        filter_condition,
        prompts:prompt_id (
          id,
          name,
          type
        )
      `);

    if (stagesError) {
      console.error('Error creating pipeline stages:', stagesError);
      // Try to clean up the pipeline
      await supabase.from('pipelines').delete().eq('id', newPipeline.id);
      return NextResponse.json({ error: 'Failed to create pipeline stages' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Pipeline created successfully',
      pipeline: {
        ...newPipeline,
        stages: newStages
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 