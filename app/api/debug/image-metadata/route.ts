import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Use service role to bypass RLS
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get a few sample images to check their metadata
    const { data: images, error } = await adminSupabase
      .from('images')
      .select('id, gcs_path, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch images',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sampleImages: images?.map(img => ({
        id: img.id,
        gcs_path: img.gcs_path,
        metadata: img.metadata,
        created_at: img.created_at
      })) || []
    });

  } catch (error) {
    console.error('Debug metadata error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 