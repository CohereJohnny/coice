import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

interface JobRecord {
  id: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

interface UserRecord {
  id: string;
  role: string;
  is_active?: boolean;
  created_at: string;
  last_login_at?: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get user statistics
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, role, is_active, created_at, last_login_at');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    // Get library statistics
    const { data: libraries, error: librariesError } = await supabase
      .from('libraries')
      .select('id, created_at');
    
    if (librariesError) {
      console.error('Error fetching libraries:', librariesError);
    }

    // Get image statistics
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('id, created_at');
    
    if (imagesError) {
      console.error('Error fetching images:', imagesError);
    }

    // Get job statistics
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, status, created_at, completed_at');
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
    }

    // Calculate metrics
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter((u: UserRecord) => u.is_active !== false).length || 0;
    const totalLibraries = libraries?.length || 0;
    const totalImages = images?.length || 0;
    
    const totalJobs = jobs?.length || 0;
    const activeJobs = jobs?.filter((j: JobRecord) => j.status === 'running' || j.status === 'pending').length || 0;
    const completedJobs = jobs?.filter((j: JobRecord) => j.status === 'completed').length || 0;
    const failedJobs = jobs?.filter((j: JobRecord) => j.status === 'failed' || j.status === 'error').length || 0;

    // Calculate system health based on various factors
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    const failureRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;
    const activeJobLoad = activeJobs;
    
    if (failureRate > 20 || activeJobLoad > 50) {
      systemHealth = 'critical';
    } else if (failureRate > 10 || activeJobLoad > 25) {
      systemHealth = 'warning';
    }

    // Simulate resource usage (in a real app, you'd get this from system monitoring)
    const cpuUsage = Math.floor(Math.random() * 30) + 20; // 20-50%
    const memoryUsage = Math.floor(Math.random() * 40) + 30; // 30-70%
    const diskUsage = Math.floor(Math.random() * 20) + 40; // 40-60%

    // Get last backup info (placeholder - you'd implement actual backup tracking)
    const lastBackup = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday

    const metrics = {
      totalUsers,
      activeUsers,
      totalImages,
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      totalLibraries,
      systemHealth,
      lastBackup,
      diskUsage,
      memoryUsage,
      cpuUsage,
      // Additional metrics
      recentUsers: users?.filter((u: UserRecord) => new Date(u.created_at) > weekAgo).length || 0,
      recentJobs: jobs?.filter((j: JobRecord) => new Date(j.created_at) > weekAgo).length || 0,
      avgJobCompletionTime: calculateAverageJobTime(jobs || []),
      systemUptime: '99.9%', // Placeholder
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateAverageJobTime(jobs: JobRecord[]): number {
  const completedJobs = jobs.filter(j => j.status === 'completed' && j.completed_at);
  
  if (completedJobs.length === 0) return 0;
  
  const totalTime = completedJobs.reduce((sum, job) => {
    const start = new Date(job.created_at).getTime();
    const end = new Date(job.completed_at!).getTime();
    return sum + (end - start);
  }, 0);
  
  return Math.round(totalTime / completedJobs.length / 1000 / 60); // Average in minutes
} 