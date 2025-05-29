import { getQueueService } from '@/lib/services/queue';
import ImageProcessor from './imageProcessor';
import Bull from 'bull';

// Worker initialization
export function initializeJobWorker() {
  const queueService = getQueueService();
  const imageProcessor = new ImageProcessor();

  // Process jobs with concurrency of 2 (can be adjusted based on resources)
  queueService.process(2, async (job: Bull.Job) => {
    console.log(`Processing job ${job.id} with data:`, job.data);
    
    try {
      await imageProcessor.processJob(job);
      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error; // Re-throw to mark job as failed
    }
  });

  console.log('Job worker initialized with concurrency of 2');
}

// Graceful shutdown handler
export async function shutdownJobWorker() {
  const queueService = getQueueService();
  await queueService.close();
  console.log('Job worker shut down gracefully');
}

// Export for use in server startup
export default initializeJobWorker; 