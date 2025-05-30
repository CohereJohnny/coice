-- Performance Optimization Migration
-- Sprint 11 Task 5.2: Optimize performance for large datasets

-- ============================================================================
-- DATABASE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Job Results Performance Indexes
CREATE INDEX IF NOT EXISTS idx_job_results_job_stage 
    ON job_results(job_id, stage_id);

CREATE INDEX IF NOT EXISTS idx_job_results_created 
    ON job_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_results_success 
    ON job_results(success, job_id);

CREATE INDEX IF NOT EXISTS idx_job_results_image_stage 
    ON job_results(image_id, stage_id);

CREATE INDEX IF NOT EXISTS idx_job_results_confidence 
    ON job_results(confidence DESC) WHERE confidence IS NOT NULL;

-- Jobs Performance Indexes  
CREATE INDEX IF NOT EXISTS idx_jobs_status_created 
    ON jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_status 
    ON jobs(pipeline_id, status);

CREATE INDEX IF NOT EXISTS idx_jobs_library_created 
    ON jobs(library_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_user_created 
    ON jobs(user_id, created_at DESC);

-- Pipeline Stages Performance Indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_order 
    ON pipeline_stages(pipeline_id, stage_order);

-- Images Performance Indexes
CREATE INDEX IF NOT EXISTS idx_images_library_created 
    ON images(library_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_images_gcs_path 
    ON images(gcs_path);

-- Job Progress Performance Indexes
CREATE INDEX IF NOT EXISTS idx_job_progress_job_stage 
    ON job_progress(job_id, stage_id);

CREATE INDEX IF NOT EXISTS idx_job_progress_updated 
    ON job_progress(updated_at DESC);

-- ============================================================================
-- MATERIALIZED VIEWS FOR COMMON AGGREGATIONS
-- ============================================================================

-- Job Statistics Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS job_statistics AS
SELECT 
    j.id as job_id,
    j.pipeline_id,
    j.library_id,
    j.status,
    j.created_at,
    j.completed_at,
    COUNT(jr.id) as total_results,
    COUNT(CASE WHEN jr.success THEN 1 END) as successful_results,
    COUNT(CASE WHEN NOT jr.success THEN 1 END) as failed_results,
    ROUND(AVG(CASE WHEN jr.confidence IS NOT NULL THEN jr.confidence END), 3) as avg_confidence,
    EXTRACT(EPOCH FROM (j.completed_at - j.created_at)) as execution_time_seconds
FROM jobs j
LEFT JOIN job_results jr ON j.id = jr.job_id
WHERE j.created_at >= NOW() - INTERVAL '30 days'  -- Only recent jobs for performance
GROUP BY j.id, j.pipeline_id, j.library_id, j.status, j.created_at, j.completed_at;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_job_statistics_pipeline_created 
    ON job_statistics(pipeline_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_statistics_status_created 
    ON job_statistics(status, created_at DESC);

-- ============================================================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function to get job results with optimized pagination
CREATE OR REPLACE FUNCTION get_job_results_paginated(
    p_job_id UUID,
    p_stage_filter INTEGER DEFAULT NULL,
    p_success_filter BOOLEAN DEFAULT NULL,
    p_limit INTEGER DEFAULT 25,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    result TEXT,
    success BOOLEAN,
    confidence DECIMAL,
    error_message TEXT,
    stage_order INTEGER,
    prompt_name TEXT,
    prompt_type TEXT,
    image_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jr.id,
        jr.result,
        jr.success,
        jr.confidence,
        jr.error_message,
        ps.stage_order,
        p.name as prompt_name,
        p.type as prompt_type,
        jr.image_id,
        jr.created_at
    FROM job_results jr
    LEFT JOIN pipeline_stages ps ON jr.stage_id = ps.id
    LEFT JOIN prompts p ON ps.prompt_id = p.id
    WHERE jr.job_id = p_job_id
    AND (p_stage_filter IS NULL OR ps.stage_order = p_stage_filter)
    AND (p_success_filter IS NULL OR jr.success = p_success_filter)
    ORDER BY ps.stage_order, jr.created_at
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get job analytics efficiently
CREATE OR REPLACE FUNCTION get_job_analytics_summary(
    p_pipeline_id UUID DEFAULT NULL,
    p_library_id INTEGER DEFAULT NULL,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_jobs BIGINT,
    completed_jobs BIGINT,
    failed_jobs BIGINT,
    success_rate DECIMAL,
    avg_execution_time DECIMAL,
    total_images_processed BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        ROUND(
            COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 
            2
        ) as success_rate,
        ROUND(
            AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60), 
            2
        ) as avg_execution_time,
        COALESCE(SUM(total_images), 0) as total_images_processed
    FROM jobs
    WHERE created_at BETWEEN p_date_from AND p_date_to
    AND (p_pipeline_id IS NULL OR pipeline_id = p_pipeline_id)
    AND (p_library_id IS NULL OR library_id = p_library_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PERFORMANCE MONITORING TABLES
-- ============================================================================

-- Table to track slow queries and performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL NOT NULL,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT performance_metrics_type_check 
        CHECK (metric_type IN ('query_time', 'memory_usage', 'api_response_time', 'cache_hit_rate'))
);

-- Index for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_recorded 
    ON performance_metrics(metric_type, recorded_at DESC);

-- ============================================================================
-- CACHE INVALIDATION TRIGGERS
-- ============================================================================

-- Function to refresh materialized view when jobs are updated
CREATE OR REPLACE FUNCTION refresh_job_statistics() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh if the job is from the last 30 days
    IF (NEW.created_at >= NOW() - INTERVAL '30 days' OR 
        OLD.created_at >= NOW() - INTERVAL '30 days') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY job_statistics;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh statistics when jobs are updated
DROP TRIGGER IF EXISTS trigger_refresh_job_statistics ON jobs;
CREATE TRIGGER trigger_refresh_job_statistics
    AFTER INSERT OR UPDATE OR DELETE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION refresh_job_statistics();

-- ============================================================================
-- QUERY PERFORMANCE HELPERS
-- ============================================================================

-- Create a function to analyze and log slow queries
CREATE OR REPLACE FUNCTION log_query_performance(
    p_query_name TEXT,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
DECLARE
    execution_time_ms DECIMAL;
BEGIN
    execution_time_ms := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) * 1000;
    
    -- Log if query took longer than 1 second
    IF execution_time_ms > 1000 THEN
        INSERT INTO performance_metrics (metric_type, metric_name, metric_value, metadata)
        VALUES ('query_time', p_query_name, execution_time_ms, p_metadata);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to clean up old performance metrics (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics() 
RETURNS VOID AS $$
BEGIN
    DELETE FROM performance_metrics 
    WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================================================

-- Enable RLS on performance metrics table
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for performance metrics (admin and service role access)
CREATE POLICY "performance_metrics_access" ON performance_metrics
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions for the materialized view
GRANT SELECT ON job_statistics TO authenticated;
GRANT SELECT ON performance_metrics TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_job_results_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_analytics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION log_query_performance TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_performance_metrics TO service_role; 