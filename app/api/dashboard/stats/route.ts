import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS for counting
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user's accessible catalogs
    const { data: allCatalogs } = await adminSupabase
      .from('catalogs')
      .select('id, name, user_id')
      .order('created_at', { ascending: false });

    // Get user's profile to check role
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Get user's groups
    const { data: userGroups } = await adminSupabase
      .from('user_groups')
      .select('group_id')
      .eq('user_id', user.id);

    // Get catalog-group mappings for user's groups
    const groupIds = userGroups?.map(ug => ug.group_id) || [];
    let accessibleCatalogIds: number[] = [];
    
    if (groupIds.length > 0) {
      const { data: catalogGroups } = await adminSupabase
        .from('catalog_groups')
        .select('catalog_id')
        .in('group_id', groupIds);
      
      accessibleCatalogIds = catalogGroups?.map(cg => cg.catalog_id) || [];
    }

    // Filter catalogs based on access rules
    const accessibleCatalogs = allCatalogs?.filter(catalog => {
      // Rule 1: User owns the catalog
      if (catalog.user_id === user.id) return true;
      
      // Rule 2: User is admin or manager
      if (profile?.role === 'admin' || profile?.role === 'manager') return true;
      
      // Rule 3: User has group access
      if (accessibleCatalogIds.includes(catalog.id)) return true;
      
      return false;
    }) || [];

    const accessibleCatalogIdsList = accessibleCatalogs.map(c => c.id);

    // Initialize statistics
    let libraryCount = 0;
    let totalImageCount = 0;
    let activeJobCount = 0;
    let recentJobCount = 0;

    // Count libraries user has access to
    if (accessibleCatalogIdsList.length > 0) {
      const { count: libCount } = await adminSupabase
        .from('libraries')
        .select('*', { count: 'exact', head: true })
        .in('catalog_id', accessibleCatalogIdsList);
      
      libraryCount = libCount || 0;

      // Count images in accessible libraries
      const { data: libraries } = await adminSupabase
        .from('libraries')
        .select('id')
        .in('catalog_id', accessibleCatalogIdsList);
      
      if (libraries && libraries.length > 0) {
        const libraryIds = libraries.map(lib => lib.id);
        
        const { count: imageCount } = await adminSupabase
          .from('images')
          .select('*', { count: 'exact', head: true })
          .in('library_id', libraryIds);
        
        totalImageCount = imageCount || 0;
      }
    }

    // Count jobs created by this user
    const { data: allJobs } = await adminSupabase
      .from('jobs')
      .select('id, status, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (allJobs) {
      // Count active jobs
      activeJobCount = allJobs.filter(job => 
        job.status === 'pending' || job.status === 'processing'
      ).length;

      // Count recent jobs (last 24 hours)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      recentJobCount = allJobs.filter(job => {
        const jobDate = new Date(job.created_at);
        return jobDate > dayAgo;
      }).length;
    }

    const stats = {
      libraryCount,
      activeJobCount,
      totalImageCount,
      recentJobCount,
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard statistics' }, { status: 500 });
  }
} 