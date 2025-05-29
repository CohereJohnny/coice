import Bull from 'bull';
import Redis from 'ioredis';

export interface JobData {
  jobId: string;
  pipelineId: string;
  imageIds: string[];
  userId: string;
  metadata?: Record<string, any>;
}

export interface JobProgress {
  percentage: number;
  stage: string;
  processedImages: number;
  totalImages: number;
  currentImage?: string;
}

export interface JobResult {
  jobId: string;
  success: boolean;
  results: any[];
  error?: string;
  completedAt: string;
}

export class QueueService {
  private imageProcessingQueue: Bull.Queue<JobData>;
  private redis: Redis;

  constructor() {
    // Initialize Redis connection
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);

    // Initialize Bull queue
    this.imageProcessingQueue = new Bull<JobData>('image-processing', redisUrl, {
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupQueueEventHandlers();
  }

  /**
   * Add a job to the processing queue
   */
  async addJob(jobData: JobData, priority: number = 0): Promise<Bull.Job<JobData>> {
    return await this.imageProcessingQueue.add('process-images', jobData, {
      priority,
      delay: 0,
    });
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Bull.Job<JobData> | null> {
    return await this.imageProcessingQueue.getJob(jobId);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const waiting = await this.imageProcessingQueue.getWaiting();
    const active = await this.imageProcessingQueue.getActive();
    const completed = await this.imageProcessingQueue.getCompleted();
    const failed = await this.imageProcessingQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job) {
        return false;
      }

      await job.remove();
      return true;
    } catch (error) {
      console.error('Error canceling job:', error);
      return false;
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job) {
        return false;
      }

      await job.retry();
      return true;
    } catch (error) {
      console.error('Error retrying job:', error);
      return false;
    }
  }

  /**
   * Clean up old completed and failed jobs
   */
  async cleanQueue(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      await this.imageProcessingQueue.clean(olderThan, 'completed');
      await this.imageProcessingQueue.clean(olderThan, 'failed');
      console.log('Queue cleanup completed');
    } catch (error) {
      console.error('Error cleaning queue:', error);
    }
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: 'waiting' | 'active' | 'completed' | 'failed', start = 0, end = 10) {
    switch (status) {
      case 'waiting':
        return await this.imageProcessingQueue.getWaiting(start, end);
      case 'active':
        return await this.imageProcessingQueue.getActive(start, end);
      case 'completed':
        return await this.imageProcessingQueue.getCompleted(start, end);
      case 'failed':
        return await this.imageProcessingQueue.getFailed(start, end);
      default:
        return [];
    }
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId: string, progress: JobProgress): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.progress(progress);
    }
  }

  /**
   * Set up event handlers for queue monitoring
   */
  private setupQueueEventHandlers(): void {
    this.imageProcessingQueue.on('completed', (job: Bull.Job<JobData>, result: any) => {
      console.log(`Job ${job.id} completed with result:`, result);
    });

    this.imageProcessingQueue.on('failed', (job: Bull.Job<JobData>, err: Error) => {
      console.error(`Job ${job.id} failed with error:`, err.message);
    });

    this.imageProcessingQueue.on('progress', (job: Bull.Job<JobData>, progress: any) => {
      console.log(`Job ${job.id} progress:`, progress);
    });

    this.imageProcessingQueue.on('stalled', (job: Bull.Job<JobData>) => {
      console.warn(`Job ${job.id} stalled`);
    });

    this.imageProcessingQueue.on('error', (error: Error) => {
      console.error('Queue error:', error);
    });
  }

  /**
   * Process jobs with a worker function
   */
  process(concurrency: number, processor: Bull.ProcessCallbackFunction<JobData>): void {
    this.imageProcessingQueue.process('process-images', concurrency, processor);
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    await this.imageProcessingQueue.pause();
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    await this.imageProcessingQueue.resume();
  }

  /**
   * Check if queue is paused
   */
  async isPaused(): Promise<boolean> {
    return await this.imageProcessingQueue.isPaused();
  }

  /**
   * Get queue health status
   */
  async getHealthStatus() {
    try {
      await this.redis.ping();
      const stats = await this.getQueueStats();
      const isPaused = await this.isPaused();

      return {
        healthy: true,
        redis: 'connected',
        queue: isPaused ? 'paused' : 'active',
        stats,
      };
    } catch (error) {
      return {
        healthy: false,
        redis: 'disconnected',
        queue: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close connections and cleanup
   */
  async close(): Promise<void> {
    await this.imageProcessingQueue.close();
    await this.redis.disconnect();
  }
}

// Singleton instance
let queueServiceInstance: QueueService | null = null;

export function getQueueService(): QueueService {
  if (!queueServiceInstance) {
    queueServiceInstance = new QueueService();
  }
  return queueServiceInstance;
}

export default getQueueService; 