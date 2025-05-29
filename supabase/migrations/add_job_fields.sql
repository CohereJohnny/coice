-- Add missing fields to jobs table for Sprint 9
-- These fields are needed for job processing, error handling, and progress tracking

-- Add error_message field for storing error details
ALTER TABLE jobs ADD COLUMN error_message TEXT;

-- Add results_summary field for storing job completion summary
ALTER TABLE jobs ADD COLUMN results_summary JSONB;

-- Add updated_at field for tracking last update time
ALTER TABLE jobs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update the status constraint to include new statuses used in the job processing
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Create index for performance on the new fields
CREATE INDEX idx_jobs_updated_at ON jobs(updated_at);
CREATE INDEX idx_jobs_error_message ON jobs(error_message) WHERE error_message IS NOT NULL;

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at_trigger
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_updated_at(); 