import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// GET /api/prompts/[id] - Get a specific prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get prompt details
    const { data: prompt, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prompt });

  } catch (error) {
    console.error('Prompt fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/prompts/[id] - Update a prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, prompt, type } = body;

    // Validate required fields
    if (!name || !prompt || !type) {
      return NextResponse.json(
        { error: 'Name, prompt, and type are required' },
        { status: 400 }
      );
    }

    // Update prompt
    const { data, error } = await supabase
      .from('prompts')
      .update({
        name,
        prompt,
        type,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Prompt update error:', error);
      return NextResponse.json(
        { error: 'Failed to update prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prompt: data
    });

  } catch (error) {
    console.error('Prompt update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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