import { getQueueService, SimpleJob } from '@/lib/services/simpleQueue';
import { ImageProcessor } from './imageProcessor';

let isInitialized = false;
let imageProcessor: ImageProcessor;

/**
 * Initialize the job worker
 */
export function initializeJobWorker(): void {
  if (isInitialized) {
    console.log('Job worker already initialized');
    return;
  }

  console.log('Initializing job worker...');
  
  const queueService = getQueueService();
  imageProcessor = new ImageProcessor();

  // Process jobs with concurrency of 2
  queueService.process(2, async (job: SimpleJob) => {
    console.log(`Worker processing job ${job.id}`);
    
    try {
      await imageProcessor.processJob(job.data);
      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  });

  // Set up event listeners
  queueService.on('active', (job: SimpleJob) => {
    console.log(`Job ${job.id} started processing`);
  });

  queueService.on('completed', (job: SimpleJob) => {
    console.log(`Job ${job.id} completed`);
  });

  queueService.on('failed', (job: SimpleJob, error: Error) => {
    console.error(`Job ${job.id} failed:`, error.message);
  });

  queueService.on('progress', (job: SimpleJob, progress: number) => {
    console.log(`Job ${job.id} progress: ${progress}%`);
  });

  isInitialized = true;
  console.log('Job worker initialized successfully');
}

/**
 * Shutdown the job worker
 */
export async function shutdownJobWorker(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  console.log('Shutting down job worker...');
  
  const queueService = getQueueService();
  await queueService.close();
  
  isInitialized = false;
  console.log('Job worker shut down');
}

/**
 * Get worker status
 */
export function getWorkerStatus() {
  return {
    initialized: isInitialized,
    timestamp: new Date().toISOString(),
  };
} 