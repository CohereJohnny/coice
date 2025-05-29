import { useState, useEffect, useCallback } from 'react';
import { useJobSubscription } from './useJobSubscription';
import { notificationService } from '@/lib/services/notificationService';

export interface DashboardStats {
  libraryCount: number;
  activeJobCount: number;
  totalImageCount: number;
  recentJobCount: number;
}

export interface RecentActivity {
  id: string;
  type: 'job_completed' | 'job_started' | 'library_created' | 'images_uploaded';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'error' | 'warning' | 'info';
}

export interface UseDashboardDataReturn {
  // Data
  stats: DashboardStats;
  recentActivity: RecentActivity[];
  
  // Loading states
  isLoading: boolean;
  isStatsLoading: boolean;
  isActivityLoading: boolean;
  
  // Error states
  error: string | null;
  statsError: string | null;
  activityError: string | null;
  
  // Real-time status
  isRealTimeConnected: boolean;
  realTimeError: string | null;
  
  // Actions
  refreshStats: () => Promise<void>;
  refreshActivity: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Status flags
  hasData: boolean;
  isEmpty: boolean;
}

export function useDashboardData(): UseDashboardDataReturn {
  // State management
  const [stats, setStats] = useState<DashboardStats>({
    libraryCount: 0,
    activeJobCount: 0,
    totalImageCount: 0,
    recentJobCount: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  
  // Loading states
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  
  // Error states
  const [statsError, setStatsError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Real-time job subscription for live dashboard updates
  const {
    isConnected: isRealTimeConnected,
    connectionError: realTimeError,
    refreshJobStatus,
  } = useJobSubscription({
    enableNotifications: true,
    onJobUpdate: (jobUpdate) => {
      console.log('Dashboard received job update:', jobUpdate);
      // Refresh stats when job status changes to keep dashboard current
      refreshStats();
      refreshActivity();
    },
    onJobCompleted: (jobUpdate) => {
      console.log('Dashboard: Job completed:', jobUpdate);
      // Show a success notification (the hook already handles detailed notifications)
      notificationService.show({
        type: 'success',
        title: 'Dashboard Updated',
        description: 'Job completion detected, refreshing dashboard data',
        duration: 2000,
      });
    },
    onJobFailed: (jobUpdate) => {
      console.log('Dashboard: Job failed:', jobUpdate);
      // Refresh to show failed job in recent activity
      refreshStats();
      refreshActivity();
    },
  });

  // Fetch dashboard statistics
  const fetchStats = useCallback(async (): Promise<DashboardStats> => {
    setIsStatsLoading(true);
    setStatsError(null);
    
    try {
      // Fetch libraries count
      const librariesResponse = await fetch('/api/libraries');
      const librariesData = await librariesResponse.json();
      const libraryCount = librariesData.libraries?.length || 0;
      
      // Calculate total images from libraries
      let totalImageCount = 0;
      if (librariesData.libraries) {
        totalImageCount = librariesData.libraries.reduce((sum: number, lib: any) => {
          return sum + (lib.image_count || 0);
        }, 0);
      }
      
      // Fetch recent jobs for active job count
      const jobsResponse = await fetch('/api/jobs/history?limit=50');
      const jobsData = await jobsResponse.json();
      
      const activeJobCount = jobsData.jobs?.filter((job: any) => 
        job.status === 'pending' || job.status === 'processing'
      ).length || 0;
      
      const recentJobCount = jobsData.jobs?.filter((job: any) => {
        const jobDate = new Date(job.created_at);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return jobDate > dayAgo;
      }).length || 0;
      
      const newStats = {
        libraryCount,
        activeJobCount,
        totalImageCount,
        recentJobCount,
      };
      
      setStats(newStats);
      return newStats;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch dashboard stats';
      setStatsError(message);
      throw error;
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch recent activity
  const fetchActivity = useCallback(async (): Promise<RecentActivity[]> => {
    setIsActivityLoading(true);
    setActivityError(null);
    
    try {
      // Fetch recent jobs for activity
      const jobsResponse = await fetch('/api/jobs/history?limit=10');
      const jobsData = await jobsResponse.json();
      
      const activities: RecentActivity[] = [];
      
      if (jobsData.jobs) {
        for (const job of jobsData.jobs) {
          const timestamp = new Date(job.created_at).toISOString();
          
          if (job.status === 'completed') {
            activities.push({
              id: `job-${job.id}`,
              type: 'job_completed',
              title: 'Analysis Complete',
              description: `Pipeline "${job.pipeline?.name || 'Unknown'}" finished processing ${job.total_images || 0} images`,
              timestamp,
              status: 'success',
            });
          } else if (job.status === 'processing') {
            activities.push({
              id: `job-${job.id}`,
              type: 'job_started',
              title: 'Analysis Started',
              description: `Pipeline "${job.pipeline?.name || 'Unknown'}" is processing ${job.total_images || 0} images`,
              timestamp,
              status: 'info',
            });
          } else if (job.status === 'failed') {
            activities.push({
              id: `job-${job.id}`,
              type: 'job_completed',
              title: 'Analysis Failed',
              description: `Pipeline "${job.pipeline?.name || 'Unknown'}" failed: ${job.error_message || 'Unknown error'}`,
              timestamp,
              status: 'error',
            });
          }
        }
      }
      
      // Sort by timestamp, most recent first
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setRecentActivity(activities);
      return activities;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch recent activity';
      setActivityError(message);
      throw error;
    } finally {
      setIsActivityLoading(false);
    }
  }, []);

  // Combined actions
  const refreshStats = useCallback(async () => {
    try {
      await fetchStats();
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, [fetchStats]);

  const refreshActivity = useCallback(async () => {
    try {
      await fetchActivity();
    } catch (error) {
      console.error('Failed to refresh activity:', error);
    }
  }, [fetchActivity]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshStats(),
      refreshActivity(),
    ]);
  }, [refreshStats, refreshActivity]);

  // Initial data fetch
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh every 30 seconds for active data
  useEffect(() => {
    const interval = setInterval(() => {
      // Only auto-refresh if we have active jobs
      if (stats.activeJobCount > 0) {
        refreshAll();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [stats.activeJobCount, refreshAll]);

  // Computed values
  const isLoading = isStatsLoading || isActivityLoading;
  const error = statsError || activityError;
  const hasData = stats.libraryCount > 0 || stats.totalImageCount > 0 || recentActivity.length > 0;
  const isEmpty = !hasData && !isLoading;

  return {
    // Data
    stats,
    recentActivity,
    
    // Loading states
    isLoading,
    isStatsLoading,
    isActivityLoading,
    
    // Error states
    error,
    statsError,
    activityError,
    
    // Real-time status
    isRealTimeConnected,
    realTimeError,
    
    // Actions
    refreshStats,
    refreshActivity,
    refreshAll,
    
    // Status flags
    hasData,
    isEmpty,
  };
} 