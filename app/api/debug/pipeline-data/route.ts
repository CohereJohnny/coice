import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();

    // Get all pipeline data with prompts
    const { data: pipelines, error: pipelineError } = await supabase
      .from('pipelines')
      .select(`
        id,
        name,
        description,
        pipeline_stages (
          id,
          stage_order,
          prompt_id,
          prompts (
            id,
            name,
            prompt,
            type
          )
        )
      `)
      .order('created_at');

    if (pipelineError) {
      throw new Error(`Failed to fetch pipelines: ${pipelineError.message}`);
    }

    return NextResponse.json({
      success: true,
      pipelines,
      totalPipelines: pipelines?.length || 0
    });

  } catch (error) {
    console.error('Pipeline data debug error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch pipeline data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 