import { initializeJobWorker, shutdownJobWorker } from './jobWorker';

let workerInitialized = false;

/**
 * Ensures the job worker is initialized
 * Safe to call multiple times - will only initialize once
 */
export function ensureWorkerInitialized(): void {
  if (!workerInitialized) {
    console.log('Initializing job worker...');
    initializeJobWorker();
    workerInitialized = true;
    
    // Handle graceful shutdown
    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
  }
}

async function handleShutdown(): Promise<void> {
  if (workerInitialized) {
    console.log('Shutting down job worker...');
    await shutdownJobWorker();
    workerInitialized = false;
  }
  process.exit(0);
}

// Auto-initialize in development (not in edge runtime)
if (process.env.NODE_ENV === 'development' && !process.env.VERCEL_EDGE_RUNTIME) {
  ensureWorkerInitialized();
}

export { workerInitialized }; 