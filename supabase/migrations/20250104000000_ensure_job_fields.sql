-- Ensure all required job fields exist
-- This migration safely adds fields that may be missing

-- Add error_message field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'error_message'
    ) THEN
        ALTER TABLE jobs ADD COLUMN error_message TEXT;
    END IF;
END $$;

-- Add results_summary field if it doesn't exist  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'results_summary'
    ) THEN
        ALTER TABLE jobs ADD COLUMN results_summary JSONB;
    END IF;
END $$;

-- Add updated_at field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE jobs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add progress field if it doesn't exist (for tracking percentage)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'progress'
    ) THEN
        ALTER TABLE jobs ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
    END IF;
END $$;

-- Update the status constraint to include all needed statuses
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at);
CREATE INDEX IF NOT EXISTS idx_jobs_error_message ON jobs(error_message) WHERE error_message IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_progress ON jobs(progress);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS jobs_updated_at_trigger ON jobs;
CREATE TRIGGER jobs_updated_at_trigger
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_updated_at(); 