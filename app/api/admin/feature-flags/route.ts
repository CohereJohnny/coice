import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlagDetails, updateFeatureFlag, refreshFeatureFlags } from '@/lib/featureFlags';
import { createSupabaseServerClient } from '@/lib/supabase';

/**
 * GET /api/admin/feature-flags
 * Fetch all feature flags with details
 */
export async function GET(request: NextRequest) {
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
    
    // Fetch feature flags directly using the authenticated client
    const { data: featureFlags, error } = await supabase
      .from('feature_flags')
      .select('id, name, enabled, description, created_at')
      .order('name');
    
    if (error) {
      console.error('Error fetching feature flags:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch feature flags'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: featureFlags || []
    });
    
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch feature flags'
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/feature-flags
 * Update a feature flag
 */
export async function PUT(request: NextRequest) {
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
    
    // Parse request body
    const body = await request.json();
    const { name, enabled } = body;
    
    if (!name || typeof enabled !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body. Required: name (string), enabled (boolean)'
      }, { status: 400 });
    }
    
    // Update feature flag
    const success = await updateFeatureFlag(name, enabled);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update feature flag'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Feature flag '${name}' ${enabled ? 'enabled' : 'disabled'}`
    });
    
  } catch (error) {
    console.error('Error updating feature flag:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update feature flag'
    }, { status: 500 });
  }
} 