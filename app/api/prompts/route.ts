import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// GET /api/prompts - List prompts accessible to the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query with filters
    let query = supabase
      .from('prompts')
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type && ['boolean', 'descriptive', 'keywords'].includes(type)) {
      query = query.eq('type', type);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,prompt.ilike.%${search}%`);
    }

    const { data: prompts, error } = await query;

    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true });

    if (type && ['boolean', 'descriptive', 'keywords'].includes(type)) {
      countQuery = countQuery.eq('type', type);
    }

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,prompt.ilike.%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting prompts:', countError);
      return NextResponse.json({ error: 'Failed to count prompts' }, { status: 500 });
    }

    return NextResponse.json({
      prompts,
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

// POST /api/prompts - Create a new prompt (Managers/Admins only)
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
      return NextResponse.json({ error: 'Only managers and admins can create prompts' }, { status: 403 });
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

    // Create the prompt
    const { data: newPrompt, error: createError } = await supabase
      .from('prompts')
      .insert({
        name: name.trim(),
        prompt: prompt.trim(),
        type,
        created_by: user.id
      })
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

    if (createError) {
      console.error('Error creating prompt:', createError);
      return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Prompt created successfully',
      prompt: newPrompt
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 