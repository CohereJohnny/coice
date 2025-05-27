import Queue from 'bull'

// Initialize Redis-backed job queue for image analysis
export const analysisQueue = new Queue('image analysis', {
  redis: {
    port: 6379,
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD,
  },
})

// Job types
export interface AnalysisJobData {
  jobId: string
  pipelineId: string
  libraryId: number
  imageIds: string[]
  userId: string
}

// Queue event handlers (to be implemented in Sprint 9)
analysisQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

analysisQueue.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed:`, err)
})

analysisQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`)
}) 