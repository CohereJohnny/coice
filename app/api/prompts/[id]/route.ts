import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// GET /api/prompts/[id] - Get a specific prompt
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

    // Get the prompt with creator info
    const { data: prompt, error } = await supabase
      .from('prompts')
      .select(`
        id,
        name,
        prompt,
        type,
        created_at,
        profiles:created_by (
          id,
          display_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
      }
      console.error('Error fetching prompt:', error);
      return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/prompts/[id] - Update a prompt
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

    // Get the existing prompt to check ownership
    const { data: existingPrompt, error: fetchError } = await supabase
      .from('prompts')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
      }
      console.error('Error fetching prompt:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
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

    const isCreator = existingPrompt.created_by === user.id;
    const isAdmin = profile.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ 
        error: 'Only the prompt creator or admins can update this prompt' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, prompt, type } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt text is required' }, { status: 400 });
    }

    if (!type || !['boolean', 'descriptive', 'keywords'].includes(type)) {
      return NextResponse.json({ 
        error: 'Type must be one of: boolean, descriptive, keywords' 
      }, { status: 400 });
    }

    // Update the prompt
    const { data: updatedPrompt, error: updateError } = await supabase
      .from('prompts')
      .update({
        name: name.trim(),
        prompt: prompt.trim(),
        type
      })
      .eq('id', id)
      .select(`
        id,
        name,
        prompt,
        type,
        created_at,
        profiles:created_by (
          display_name,
          email
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating prompt:', updateError);
      return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Prompt updated successfully',
      prompt: updatedPrompt
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/prompts/[id] - Delete a prompt
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

    // Get the existing prompt to check ownership
    const { data: existingPrompt, error: fetchError } = await supabase
      .from('prompts')
      .select('created_by, name')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
      }
      console.error('Error fetching prompt:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
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

    const isCreator = existingPrompt.created_by === user.id;
    const isAdmin = profile.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ 
        error: 'Only the prompt creator or admins can delete this prompt' 
      }, { status: 403 });
    }

    // Check if prompt is used in any pipelines
    const { data: pipelineStages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('prompt_id', id)
      .limit(1);

    if (stagesError) {
      console.error('Error checking pipeline usage:', stagesError);
      return NextResponse.json({ error: 'Failed to check prompt usage' }, { status: 500 });
    }

    if (pipelineStages && pipelineStages.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete prompt that is used in pipelines' 
      }, { status: 400 });
    }

    // Delete the prompt
    const { error: deleteError } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting prompt:', deleteError);
      return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Prompt deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 