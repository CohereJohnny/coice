/**
 * Feature Flag Configuration
 * 
 * This file controls the visibility of features that are under development
 * or not yet ready for production use. Feature flags are now stored in Supabase
 * and can be managed through the admin panel.
 */

import { createClient } from '@supabase/supabase-js';

export interface FeatureFlags {
  // Job Details Advanced Features
  jobAnalyticsDashboard: boolean;
  jobComparisonTools: boolean;
  resultValidation: boolean;
  
  // Pipeline Features
  advancedPipelineEditor: boolean;
  promptVersioning: boolean;
  
  // System Features
  realTimeCollaboration: boolean;
  realTimeNotifications: boolean;
  googleOauth: boolean;
  advancedSearch: boolean;
  bulkOperations: boolean;
  systemMonitoring: boolean;
}

/**
 * Default fallback feature flag configuration
 * Used when database is unavailable or during build time
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Job Details Advanced Features - Currently incomplete, hidden until properly implemented
  jobAnalyticsDashboard: false,
  jobComparisonTools: false,
  resultValidation: false,
  
  // Pipeline Features
  advancedPipelineEditor: false,
  promptVersioning: false,
  
  // System Features
  realTimeCollaboration: false,
  realTimeNotifications: true, // This one is working
  googleOauth: false,
  advancedSearch: false,
  bulkOperations: false,
  systemMonitoring: false, // Experimental system resource monitoring
};

/**
 * Map database field names to TypeScript interface names
 */
const FEATURE_FLAG_MAPPING: Record<string, keyof FeatureFlags> = {
  'job_analytics_dashboard': 'jobAnalyticsDashboard',
  'job_comparison_tools': 'jobComparisonTools',
  'result_validation': 'resultValidation',
  'advanced_pipeline_editor': 'advancedPipelineEditor',
  'prompt_versioning': 'promptVersioning',
  'real_time_collaboration': 'realTimeCollaboration',
  'real_time_notifications': 'realTimeNotifications',
  'google_oauth': 'googleOauth',
  'advanced_search': 'advancedSearch',
  'bulk_operations': 'bulkOperations',
  'system_monitoring': 'systemMonitoring',
};

/**
 * Create Supabase client for feature flag access
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  console.log('[FeatureFlag] Supabase URL:', supabaseUrl);
  console.log('[FeatureFlag] Supabase Key:', supabaseKey ? 'Present' : 'Missing');
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase configuration missing, using default feature flags');
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Fetch feature flags from Supabase database
 */
async function fetchFeatureFlagsFromDatabase(): Promise<FeatureFlags> {
  try {
    const supabase = createSupabaseClient();
    
    if (!supabase) {
      console.warn('Supabase client not available, using default feature flags');
      return DEFAULT_FEATURE_FLAGS;
    }
    
    const { data, error } = await supabase
      .from('feature_flags')
      .select('name, enabled')
      .order('name');
    
    console.log('[FeatureFlag] Raw data from Supabase:', data);
    
    // Start with defaults and override with database values
    const flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
    
    if (data) {
      data.forEach((flag) => {
        const mappedKey = FEATURE_FLAG_MAPPING[flag.name];
        if (mappedKey) {
          flags[mappedKey] = flag.enabled;
        }
      });
    }

    console.log('[FeatureFlag] Final mapped flags:', flags);
    
    return flags;
    
  } catch (error) {
    console.error('Failed to fetch feature flags:', error);
    return DEFAULT_FEATURE_FLAGS;
  }
}

/**
 * Get current feature flag configuration (no cache)
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  // Always fetch fresh flags from database
  return await fetchFeatureFlagsFromDatabase();
}

/**
 * Check if a specific feature is enabled (async version)
 */
export async function isFeatureEnabled(feature: keyof FeatureFlags): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[feature];
}

/**
 * Refresh feature flag cache (useful after admin changes)
 */
export async function refreshFeatureFlags(): Promise<FeatureFlags> {
  return await getFeatureFlags();
}

/**
 * Get feature flag with description (for admin panel)
 */
export async function getFeatureFlagDetails() {
  try {
    const supabase = createSupabaseClient();
    
    if (!supabase) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('feature_flags')
      .select('id, name, enabled, description, created_at')
      .order('name');
    
    if (error) {
      console.error('Error fetching feature flag details:', error);
      return [];
    }
    
    return data || [];
    
  } catch (error) {
    console.error('Failed to fetch feature flag details:', error);
    return [];
  }
}

/**
 * Update a feature flag (for admin panel)
 */
export async function updateFeatureFlag(name: string, enabled: boolean): Promise<boolean> {
  try {
    const supabase = createSupabaseClient();
    
    if (!supabase) {
      return false;
    }
    
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled })
      .eq('name', name);
    
    if (error) {
      console.error('Error updating feature flag:', error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Failed to update feature flag:', error);
    return false;
  }
} 