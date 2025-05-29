import { useEffect, useRef, useCallback } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { notificationService } from '@/lib/services/notificationService';
import type { Database } from '@/lib/supabase';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobResult = Database['public']['Tables']['job_results']['Row'];

export interface JobUpdate {
  id: string;
  status: string;
  progress?: number;
  processed_images?: number;
  total_images?: number;
  error_message?: string | null;
  completed_at?: string | null;
}

export interface UseJobSubscriptionOptions {
  // Specific job ID to track (optional)
  jobId?: string;
  
  // Whether to show notifications for job updates
  enableNotifications?: boolean;
  
  // Callbacks for different events
  onJobUpdate?: (job: JobUpdate) => void;
  onJobCompleted?: (job: JobUpdate) => void;
  onJobFailed?: (job: JobUpdate) => void;
  onJobProgress?: (job: JobUpdate) => void;
  
  // Whether to auto-connect on mount
  autoConnect?: boolean;
}

export interface UseJobSubscriptionReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Control methods
  connect: () => void;
  disconnect: () => void;
  
  // Manual refresh
  refreshJobStatus: (jobId: string) => Promise<JobUpdate | null>;
  
  // Subscription info
  subscribedJobId: string | null;
  lastUpdate: Date | null;
}

export function useJobSubscription(options: UseJobSubscriptionOptions = {}): UseJobSubscriptionReturn {
  const {
    jobId,
    enableNotifications = true,
    onJobUpdate,
    onJobCompleted,
    onJobFailed,
    onJobProgress,
    autoConnect = true,
  } = options;

  // State refs
  const isConnectedRef = useRef(false);
  const isConnectingRef = useRef(false);
  const connectionErrorRef = useRef<string | null>(null);
  const subscribedJobIdRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<Date | null>(null);
  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([]);

  const supabase = createSupabaseClient();

  // Fetch job details for notifications
  const fetchJobDetails = useCallback(async (jobId: string) => {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select(`
          *,
          pipeline:pipelines!jobs_pipeline_id_fkey(
            id,
            name
          )
        `)
        .eq('id', jobId)
        .single();

      return job;
    } catch (error) {
      console.warn('Failed to fetch job details for notifications:', error);
      return null;
    }
  }, [supabase]);

  // Handle job status changes
  const handleJobUpdate = useCallback(async (job: Job) => {
    const update: JobUpdate = {
      id: job.id,
      status: job.status,
      processed_images: job.processed_images,
      total_images: job.total_images,
      completed_at: job.completed_at,
    };

    // Calculate progress if available
    if (job.total_images > 0) {
      update.progress = Math.round((job.processed_images / job.total_images) * 100);
    }

    lastUpdateRef.current = new Date();

    // Call general update callback
    onJobUpdate?.(update);

    // Handle specific status changes
    if (job.status === 'completed') {
      onJobCompleted?.(update);
      
      if (enableNotifications) {
        const jobDetails = await fetchJobDetails(job.id);
        if (jobDetails) {
          // Count results
          const { count } = await supabase
            .from('job_results')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id);

          notificationService.jobCompleted(
            job.id,
            jobDetails.pipeline?.name || 'Unknown Pipeline',
            count || 0
          );
        }
      }
    } else if (job.status === 'failed') {
      onJobFailed?.(update);
      
      if (enableNotifications) {
        const jobDetails = await fetchJobDetails(job.id);
        if (jobDetails) {
          notificationService.jobFailed(
            job.id,
            jobDetails.pipeline?.name || 'Unknown Pipeline',
            'Job execution failed'
          );
        }
      }
    } else if (job.status === 'processing') {
      onJobProgress?.(update);
      
      if (enableNotifications && update.progress) {
        const jobDetails = await fetchJobDetails(job.id);
        if (jobDetails) {
          notificationService.jobProgress(
            job.id,
            jobDetails.pipeline?.name || 'Unknown Pipeline',
            update.progress
          );
        }
      }
    }
  }, [
    onJobUpdate,
    onJobCompleted,
    onJobFailed,
    onJobProgress,
    enableNotifications,
    fetchJobDetails,
    supabase,
  ]);

  // Connect to real-time subscriptions
  const connect = useCallback(() => {
    if (isConnectedRef.current || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    connectionErrorRef.current = null;

    try {
      // Subscribe to jobs table changes
      const jobSubscription = supabase
        .channel('job-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'jobs',
            filter: jobId ? `id=eq.${jobId}` : undefined,
          },
          (payload: any) => {
            console.log('Job update received:', payload);
            handleJobUpdate(payload.new as Job);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'jobs',
            filter: jobId ? `id=eq.${jobId}` : undefined,
          },
          async (payload: any) => {
            console.log('New job created:', payload);
            const job = payload.new as Job;
            
            if (enableNotifications) {
              const jobDetails = await fetchJobDetails(job.id);
              if (jobDetails) {
                notificationService.jobStarted(
                  job.id,
                  jobDetails.pipeline?.name || 'Unknown Pipeline',
                  job.total_images
                );
              }
            }
            
            handleJobUpdate(job);
          }
        )
        .subscribe((status: string, err?: Error) => {
          if (err) {
            console.error('Job subscription error:', err);
            connectionErrorRef.current = err.message;
            isConnectedRef.current = false;
          } else if (status === 'SUBSCRIBED') {
            console.log('Job subscription connected');
            isConnectedRef.current = true;
            subscribedJobIdRef.current = jobId || 'all';
          } else if (status === 'CLOSED') {
            console.log('Job subscription closed');
            isConnectedRef.current = false;
          }
          
          isConnectingRef.current = false;
        });

      subscriptionsRef.current.push(jobSubscription);

      // If tracking a specific job, also subscribe to job results for more detailed progress
      if (jobId) {
        const resultSubscription = supabase
          .channel('job-results')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'job_results',
              filter: `job_id=eq.${jobId}`,
            },
            (payload: any) => {
              console.log('Job result added:', payload);
              // Could trigger more granular progress updates here
            }
          )
          .subscribe();

        subscriptionsRef.current.push(resultSubscription);
      }

    } catch (error) {
      console.error('Failed to connect to job subscriptions:', error);
      connectionErrorRef.current = error instanceof Error ? error.message : 'Connection failed';
      isConnectingRef.current = false;
    }
  }, [jobId, handleJobUpdate, enableNotifications, fetchJobDetails, supabase]);

  // Disconnect from subscriptions
  const disconnect = useCallback(() => {
    subscriptionsRef.current.forEach(subscription => {
      subscription.unsubscribe();
    });
    subscriptionsRef.current = [];
    isConnectedRef.current = false;
    isConnectingRef.current = false;
    subscribedJobIdRef.current = null;
  }, []);

  // Manual refresh job status
  const refreshJobStatus = useCallback(async (targetJobId: string): Promise<JobUpdate | null> => {
    try {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', targetJobId)
        .single();

      if (error) throw error;

      const update: JobUpdate = {
        id: job.id,
        status: job.status,
        processed_images: job.processed_images,
        total_images: job.total_images,
        completed_at: job.completed_at,
      };

      if (job.total_images > 0) {
        update.progress = Math.round((job.processed_images / job.total_images) * 100);
      }

      return update;
    } catch (error) {
      console.error('Failed to refresh job status:', error);
      return null;
    }
  }, [supabase]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect when jobId changes
  useEffect(() => {
    if (isConnectedRef.current && subscribedJobIdRef.current !== (jobId || 'all')) {
      disconnect();
      if (autoConnect) {
        setTimeout(connect, 100); // Small delay to ensure cleanup
      }
    }
  }, [jobId, disconnect, connect, autoConnect]);

  return {
    isConnected: isConnectedRef.current,
    isConnecting: isConnectingRef.current,
    connectionError: connectionErrorRef.current,
    connect,
    disconnect,
    refreshJobStatus,
    subscribedJobId: subscribedJobIdRef.current,
    lastUpdate: lastUpdateRef.current,
  };
} 