import { NextRequest, NextResponse } from 'next/server';
import { refreshFeatureFlags } from '@/lib/featureFlags';
import { createSupabaseServerClient } from '@/lib/supabase';

/**
 * POST /api/admin/feature-flags/refresh
 * Refresh feature flag cache
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Refresh feature flag cache
    const flags = await refreshFeatureFlags();
    
    return NextResponse.json({
      success: true,
      message: 'Feature flag cache refreshed',
      data: flags
    });
    
  } catch (error) {
    console.error('Error refreshing feature flags:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh feature flag cache'
    }, { status: 500 });
  }
} 