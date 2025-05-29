import { EventEmitter } from 'events';

export interface JobData {
  jobId: string;
  pipelineId: string;
  imageIds: string[];
  userId: string;
  metadata?: {
    libraryId: number;
    libraryName: string;
    pipelineName: string;
  };
}

export interface JobProgress {
  percentage: number;
  stage: string;
  processedImages: number;
  totalImages: number;
  currentImage?: string;
}

export interface SimpleJob {
  id: string;
  data: JobData;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
}

export type JobProcessor = (job: SimpleJob) => Promise<void>;

export class SimpleQueueService extends EventEmitter {
  private jobs: Map<string, SimpleJob> = new Map();
  private queue: SimpleJob[] = [];
  private processing = false;
  private processors: JobProcessor[] = [];
  private concurrency = 1;

  constructor() {
    super();
  }

  /**
   * Add a new job to the queue
   */
  async addJob(data: JobData): Promise<SimpleJob> {
    const job: SimpleJob = {
      id: data.jobId,
      data,
      status: 'waiting',
      progress: 0,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
    };

    this.jobs.set(job.id, job);
    this.queue.push(job);
    
    console.log(`Job ${job.id} added to queue`);
    this.emit('waiting', job.id);
    
    // Start processing if not already running
    this.processJobs();
    
    return job;
  }

  /**
   * Process jobs with a worker function
   */
  process(concurrency: number, processor: JobProcessor): void {
    this.concurrency = concurrency;
    this.processors.push(processor);
    this.processJobs();
  }

  /**
   * Get a specific job by ID
   */
  async getJob(jobId: string): Promise<SimpleJob | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'waiting') {
      job.status = 'failed';
      job.error = 'Job cancelled';
      job.completedAt = new Date();
      
      // Remove from queue
      const index = this.queue.findIndex(q => q.id === jobId);
      if (index > -1) {
        this.queue.splice(index, 1);
      }
      
      console.log(`Job ${jobId} cancelled`);
      this.emit('failed', job, new Error('Job cancelled'));
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'failed' && job.attempts < job.maxAttempts) {
      job.status = 'waiting';
      job.progress = 0;
      job.error = undefined;
      job.startedAt = undefined;
      job.completedAt = undefined;
      job.attempts++;
      
      this.queue.push(job);
      console.log(`Job ${jobId} retried (attempt ${job.attempts})`);
      this.processJobs();
    }
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.max(0, Math.min(100, progress));
      this.emit('progress', job, progress);
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const stats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };

    for (const job of this.jobs.values()) {
      stats[job.status]++;
    }

    return stats;
  }

  /**
   * Get queue health status
   */
  async getHealth(): Promise<{ healthy: boolean; error?: string }> {
    return { healthy: true };
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanup(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.completedAt && job.completedAt < cutoffTime) {
        this.jobs.delete(jobId);
      }
    }
    
    console.log('Queue cleanup completed');
  }

  /**
   * Close the queue service
   */
  async close(): Promise<void> {
    this.processing = false;
    console.log('Queue service closed');
  }

  /**
   * Process jobs from the queue
   */
  private async processJobs(): Promise<void> {
    if (this.processing || this.processors.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        // Process jobs up to concurrency limit
        const activeJobs = Array.from(this.jobs.values()).filter(j => j.status === 'active');
        
        if (activeJobs.length >= this.concurrency) {
          // Wait for at least one job to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const job = this.queue.shift();
        if (!job) break;

        // Process the job
        this.processJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: SimpleJob): Promise<void> {
    job.status = 'active';
    job.startedAt = new Date();
    job.attempts++;
    
    console.log(`Processing job ${job.id} (attempt ${job.attempts})`);
    this.emit('active', job);

    try {
      // Run all processors
      for (const processor of this.processors) {
        await processor(job);
      }

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      
      console.log(`Job ${job.id} completed`);
      this.emit('completed', job, null);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.completedAt = new Date();
        this.emit('failed', job, error);
      } else {
        // Retry the job
        job.status = 'waiting';
        job.startedAt = undefined;
        this.queue.push(job);
        console.log(`Retrying job ${job.id} (attempt ${job.attempts + 1})`);
      }
    }
  }
}

// Singleton instance
let queueServiceInstance: SimpleQueueService | null = null;

export function getQueueService(): SimpleQueueService {
  if (!queueServiceInstance) {
    queueServiceInstance = new SimpleQueueService();
  }
  return queueServiceInstance;
}

export default getQueueService; 