import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// GET /api/pipelines/[id] - Get a specific pipeline with its stages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the pipeline with creator and library info
    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .select(`
        id,
        name,
        description,
        library_id,
        created_at,
        profiles:created_by (
          id,
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
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
      }
      console.error('Error fetching pipeline:', error);
      return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 });
    }

    // Get pipeline stages
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select(`
        id,
        stage_order,
        filter_condition,
        prompts:prompt_id (
          id,
          name,
          prompt,
          type
        )
      `)
      .eq('pipeline_id', id)
      .order('stage_order');

    if (stagesError) {
      console.error('Error fetching pipeline stages:', stagesError);
      return NextResponse.json({ error: 'Failed to fetch pipeline stages' }, { status: 500 });
    }

    return NextResponse.json({
      pipeline: {
        ...pipeline,
        stages: stages || []
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/pipelines/[id] - Update a pipeline and its stages
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the existing pipeline to check ownership
    const { data: existingPipeline, error: fetchError } = await supabase
      .from('pipelines')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
      }
      console.error('Error fetching pipeline:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 });
    }

    // Check if user is the creator or has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    const isCreator = existingPipeline.created_by === user.id;
    const isAdmin = profile.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ 
        error: 'Only the pipeline creator or admins can update this pipeline' 
      }, { status: 403 });
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

    // Update pipeline
    const { data: updatedPipeline, error: updateError } = await supabase
      .from('pipelines')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        library_id: library_id || null
      })
      .eq('id', id)
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

    if (updateError) {
      console.error('Error updating pipeline:', updateError);
      return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 });
    }

    // Delete existing stages
    const { error: deleteStagesError } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('pipeline_id', id);

    if (deleteStagesError) {
      console.error('Error deleting pipeline stages:', deleteStagesError);
      return NextResponse.json({ error: 'Failed to update pipeline stages' }, { status: 500 });
    }

    // Create new stages
    const stageInserts = stages.map(stage => ({
      pipeline_id: id,
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
      return NextResponse.json({ error: 'Failed to create pipeline stages' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Pipeline updated successfully',
      pipeline: {
        ...updatedPipeline,
        stages: newStages
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/pipelines/[id] - Delete a pipeline
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the existing pipeline to check ownership
    const { data: existingPipeline, error: fetchError } = await supabase
      .from('pipelines')
      .select('created_by, name')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
      }
      console.error('Error fetching pipeline:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 });
    }

    // Check if user is the creator or has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    const isCreator = existingPipeline.created_by === user.id;
    const isAdmin = profile.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ 
        error: 'Only the pipeline creator or admins can delete this pipeline' 
      }, { status: 403 });
    }

    // Check if pipeline is used in any jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('pipeline_id', id)
      .limit(1);

    if (jobsError) {
      console.error('Error checking pipeline usage:', jobsError);
      return NextResponse.json({ error: 'Failed to check pipeline usage' }, { status: 500 });
    }

    if (jobs && jobs.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete pipeline that has been used in jobs' 
      }, { status: 400 });
    }

    // Delete the pipeline (stages will be deleted automatically due to CASCADE)
    const { error: deleteError } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting pipeline:', deleteError);
      return NextResponse.json({ error: 'Failed to delete pipeline' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Pipeline deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 