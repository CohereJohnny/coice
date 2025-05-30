-- Add versioning and compression support to job_results table
-- Sprint 11 Task 1.2: Implement comprehensive job result storage

-- Add version field to job_results table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_results' AND column_name = 'version'
    ) THEN
        ALTER TABLE job_results ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add compression tracking field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_results' AND column_name = 'is_compressed'
    ) THEN
        ALTER TABLE job_results ADD COLUMN is_compressed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create job_result_history table for versioning
CREATE TABLE IF NOT EXISTS job_result_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL,
    image_id UUID NOT NULL,
    stage_id UUID NOT NULL,
    result JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    is_compressed BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    original_result_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_results_version ON job_results(job_id, image_id, stage_id, version);
CREATE INDEX IF NOT EXISTS idx_job_results_compressed ON job_results(is_compressed) WHERE is_compressed = TRUE;

CREATE INDEX IF NOT EXISTS idx_job_result_history_job_id ON job_result_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_result_history_image_stage ON job_result_history(image_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_job_result_history_version ON job_result_history(version);
CREATE INDEX IF NOT EXISTS idx_job_result_history_archived ON job_result_history(archived_at);

-- Add constraint to ensure version numbers are positive
ALTER TABLE job_results ADD CONSTRAINT job_results_version_positive CHECK (version > 0);
ALTER TABLE job_result_history ADD CONSTRAINT job_result_history_version_positive CHECK (version > 0);

-- Create function to automatically archive old results when new versions are created
CREATE OR REPLACE FUNCTION archive_old_job_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Only archive if this is a new version (version > 1)
    IF NEW.version > 1 THEN
        -- Archive the previous version
        INSERT INTO job_result_history (
            job_id, image_id, stage_id, result, version, is_compressed, 
            archived_at, original_result_id
        )
        SELECT 
            job_id, image_id, stage_id, result, version, is_compressed,
            NOW(), id
        FROM job_results 
        WHERE job_id = NEW.job_id 
          AND image_id = NEW.image_id 
          AND stage_id = NEW.stage_id 
          AND version = NEW.version - 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically archive old results
DROP TRIGGER IF EXISTS job_result_versioning_trigger ON job_results;
CREATE TRIGGER job_result_versioning_trigger
    AFTER INSERT ON job_results
    FOR EACH ROW
    EXECUTE FUNCTION archive_old_job_result();

-- Add comments for documentation
COMMENT ON COLUMN job_results.version IS 'Version number for result versioning, starts at 1';
COMMENT ON COLUMN job_results.is_compressed IS 'Whether the result data has been compressed to save space';
COMMENT ON TABLE job_result_history IS 'Historical versions of job results for versioning and audit trail';
COMMENT ON COLUMN job_result_history.archived_at IS 'When this version was archived';
COMMENT ON COLUMN job_result_history.original_result_id IS 'Reference to the original result ID that was archived'; 