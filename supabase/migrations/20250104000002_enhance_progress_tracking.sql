-- Enhance job progress tracking with detailed stage-level monitoring
-- Sprint 11 Task 1.3: Enhance job status and progress tracking

-- Add enhanced fields to job_progress table if it exists
DO $$ 
BEGIN
    -- Check if job_progress table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_progress') THEN
        -- Add error tracking fields
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'job_progress' AND column_name = 'error_count'
        ) THEN
            ALTER TABLE job_progress ADD COLUMN error_count INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'job_progress' AND column_name = 'last_error'
        ) THEN
            ALTER TABLE job_progress ADD COLUMN last_error TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'job_progress' AND column_name = 'failed_images'
        ) THEN
            ALTER TABLE job_progress ADD COLUMN failed_images UUID[];
        END IF;

        -- Add detailed progress tracking
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'job_progress' AND column_name = 'progress_percent'
        ) THEN
            ALTER TABLE job_progress ADD COLUMN progress_percent INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'job_progress' AND column_name = 'execution_time_ms'
        ) THEN
            ALTER TABLE job_progress ADD COLUMN execution_time_ms INTEGER;
        END IF;
    ELSE
        -- Create job_progress table if it doesn't exist
        CREATE TABLE job_progress (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            job_id UUID NOT NULL,
            stage_order INTEGER NOT NULL,
            images_total INTEGER DEFAULT 0,
            images_processed INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            progress_percent INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0,
            last_error TEXT,
            failed_images UUID[],
            execution_time_ms INTEGER,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(job_id, stage_order)
        );
    END IF;
END $$;

-- Create stage_progress_history table for detailed analytics
CREATE TABLE IF NOT EXISTS stage_progress_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL,
    stage_order INTEGER NOT NULL,
    status TEXT NOT NULL,
    images_processed INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stage_errors table for detailed error tracking
CREATE TABLE IF NOT EXISTS stage_errors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL,
    stage_order INTEGER NOT NULL,
    image_id UUID NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_type TEXT,
    prompt_id UUID,
    execution_time_ms INTEGER,
    metadata JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_progress_job_stage ON job_progress(job_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_job_progress_status ON job_progress(status);
CREATE INDEX IF NOT EXISTS idx_job_progress_error_count ON job_progress(error_count) WHERE error_count > 0;
CREATE INDEX IF NOT EXISTS idx_job_progress_updated ON job_progress(updated_at);

CREATE INDEX IF NOT EXISTS idx_stage_progress_history_job_id ON stage_progress_history(job_id);
CREATE INDEX IF NOT EXISTS idx_stage_progress_history_stage ON stage_progress_history(job_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_stage_progress_history_timestamp ON stage_progress_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_stage_progress_history_status ON stage_progress_history(status);

CREATE INDEX IF NOT EXISTS idx_stage_errors_job_id ON stage_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_stage_errors_stage ON stage_errors(job_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_stage_errors_image ON stage_errors(image_id);
CREATE INDEX IF NOT EXISTS idx_stage_errors_occurred ON stage_errors(occurred_at);
CREATE INDEX IF NOT EXISTS idx_stage_errors_type ON stage_errors(error_type);

-- Add constraints
ALTER TABLE stage_progress_history ADD CONSTRAINT stage_progress_history_progress_range 
    CHECK (progress_percent >= 0 AND progress_percent <= 100);

ALTER TABLE stage_errors ADD CONSTRAINT stage_errors_stage_positive 
    CHECK (stage_order > 0);

-- Create function to automatically clean up old progress history (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_progress_history()
RETURNS void AS $$
BEGIN
    DELETE FROM stage_progress_history 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM stage_errors 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to get stage progress summary
CREATE OR REPLACE FUNCTION get_stage_progress_summary(p_job_id UUID)
RETURNS TABLE (
    stage_order INTEGER,
    status TEXT,
    images_processed INTEGER,
    images_total INTEGER,
    progress_percent INTEGER,
    error_count INTEGER,
    execution_time_ms INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jp.stage_order,
        jp.status,
        jp.images_processed,
        jp.images_total,
        jp.progress_percent,
        jp.error_count,
        jp.execution_time_ms,
        jp.started_at,
        jp.completed_at
    FROM job_progress jp
    WHERE jp.job_id = p_job_id
    ORDER BY jp.stage_order;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE stage_progress_history IS 'Historical tracking of stage progress for analytics and debugging';
COMMENT ON TABLE stage_errors IS 'Detailed error tracking for individual stage failures';
COMMENT ON COLUMN job_progress.error_count IS 'Number of errors encountered in this stage';
COMMENT ON COLUMN job_progress.failed_images IS 'Array of image IDs that failed processing in this stage';
COMMENT ON COLUMN job_progress.progress_percent IS 'Percentage completion of this specific stage';
COMMENT ON FUNCTION cleanup_old_progress_history() IS 'Cleanup function to remove old progress history and error records';
COMMENT ON FUNCTION get_stage_progress_summary(UUID) IS 'Get comprehensive progress summary for all stages of a job'; 