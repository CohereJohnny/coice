-- Add result validation tables for quality checks and approval workflows

-- Result validations table
CREATE TABLE IF NOT EXISTS result_validations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES job_results(id) ON DELETE CASCADE,
    validation_type TEXT NOT NULL CHECK (validation_type IN ('consistency', 'quality', 'confidence', 'content')),
    status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'warning', 'pending')),
    score DECIMAL(3,2) NOT NULL CHECK (score >= 0 AND score <= 1),
    feedback TEXT NOT NULL,
    automated BOOLEAN NOT NULL DEFAULT true,
    validator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    validation_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Result approvals table
CREATE TABLE IF NOT EXISTS result_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES job_results(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL CHECK (workflow_type IN ('auto', 'manual', 'hybrid')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'requires_review')),
    assigned_reviewer UUID REFERENCES users(id) ON DELETE SET NULL,
    approval_criteria JSONB NOT NULL DEFAULT '{}',
    review_notes TEXT,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quality metrics tracking table
CREATE TABLE IF NOT EXISTS quality_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES job_results(id) ON DELETE CASCADE,
    overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
    consistency_score DECIMAL(3,2) NOT NULL CHECK (consistency_score >= 0 AND consistency_score <= 1),
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    content_quality_score DECIMAL(3,2) NOT NULL CHECK (content_quality_score >= 0 AND content_quality_score <= 1),
    response_time_score DECIMAL(3,2) NOT NULL CHECK (response_time_score >= 0 AND response_time_score <= 1),
    breakdown JSONB NOT NULL DEFAULT '{}',
    recommendations JSONB NOT NULL DEFAULT '[]',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_result_validations_result_id ON result_validations(result_id);
CREATE INDEX IF NOT EXISTS idx_result_validations_status ON result_validations(status);
CREATE INDEX IF NOT EXISTS idx_result_validations_type ON result_validations(validation_type);
CREATE INDEX IF NOT EXISTS idx_result_validations_validated_at ON result_validations(validated_at);

CREATE INDEX IF NOT EXISTS idx_result_approvals_result_id ON result_approvals(result_id);
CREATE INDEX IF NOT EXISTS idx_result_approvals_status ON result_approvals(status);
CREATE INDEX IF NOT EXISTS idx_result_approvals_reviewer ON result_approvals(assigned_reviewer);
CREATE INDEX IF NOT EXISTS idx_result_approvals_approved_at ON result_approvals(approved_at);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_result_id ON quality_metrics(result_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_overall_score ON quality_metrics(overall_score);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_calculated_at ON quality_metrics(calculated_at);

-- Add triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_result_validations_updated_at 
    BEFORE UPDATE ON result_validations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_result_approvals_updated_at 
    BEFORE UPDATE ON result_approvals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE result_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for result_validations
CREATE POLICY "Users can view validations for results they have access to" ON result_validations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_results jr
            JOIN jobs j ON jr.job_id = j.id
            JOIN catalogs c ON j.catalog_id = c.id
            JOIN user_catalog_access uca ON c.id = uca.catalog_id
            WHERE jr.id = result_validations.result_id
            AND uca.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert validations" ON result_validations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Reviewers can update validations" ON result_validations
    FOR UPDATE USING (
        validator_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager')
        )
    );

-- Policies for result_approvals
CREATE POLICY "Users can view approvals for results they have access to" ON result_approvals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_results jr
            JOIN jobs j ON jr.job_id = j.id
            JOIN catalogs c ON j.catalog_id = c.id
            JOIN user_catalog_access uca ON c.id = uca.catalog_id
            WHERE jr.id = result_approvals.result_id
            AND uca.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert approvals" ON result_approvals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Assigned reviewers can update approvals" ON result_approvals
    FOR UPDATE USING (
        assigned_reviewer = auth.uid() OR
        approved_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager')
        )
    );

-- Policies for quality_metrics
CREATE POLICY "Users can view quality metrics for results they have access to" ON quality_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_results jr
            JOIN jobs j ON jr.job_id = j.id
            JOIN catalogs c ON j.catalog_id = c.id
            JOIN user_catalog_access uca ON c.id = uca.catalog_id
            WHERE jr.id = quality_metrics.result_id
            AND uca.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert quality metrics" ON quality_metrics
    FOR INSERT WITH CHECK (true);

-- Function to get validation summary for a job
CREATE OR REPLACE FUNCTION get_job_validation_summary(job_id_param UUID)
RETURNS TABLE (
    total_results BIGINT,
    validated_results BIGINT,
    average_quality_score DECIMAL,
    approved_results BIGINT,
    rejected_results BIGINT,
    pending_review BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(jr.id) as total_results,
        COUNT(rv.result_id) as validated_results,
        COALESCE(AVG(qm.overall_score), 0) as average_quality_score,
        COUNT(CASE WHEN ra.status = 'approved' THEN 1 END) as approved_results,
        COUNT(CASE WHEN ra.status = 'rejected' THEN 1 END) as rejected_results,
        COUNT(CASE WHEN ra.status = 'requires_review' THEN 1 END) as pending_review
    FROM job_results jr
    LEFT JOIN result_validations rv ON jr.id = rv.result_id
    LEFT JOIN quality_metrics qm ON jr.id = qm.result_id
    LEFT JOIN result_approvals ra ON jr.id = ra.result_id
    WHERE jr.job_id = job_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get quality distribution across jobs
CREATE OR REPLACE FUNCTION get_quality_distribution(
    date_from TIMESTAMPTZ DEFAULT NULL,
    date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    excellent_count BIGINT,
    good_count BIGINT,
    fair_count BIGINT,
    poor_count BIGINT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN qm.overall_score > 0.8 THEN 1 END) as excellent_count,
        COUNT(CASE WHEN qm.overall_score > 0.6 AND qm.overall_score <= 0.8 THEN 1 END) as good_count,
        COUNT(CASE WHEN qm.overall_score > 0.4 AND qm.overall_score <= 0.6 THEN 1 END) as fair_count,
        COUNT(CASE WHEN qm.overall_score <= 0.4 THEN 1 END) as poor_count,
        COUNT(qm.id) as total_count
    FROM quality_metrics qm
    WHERE (date_from IS NULL OR qm.calculated_at >= date_from)
    AND (date_to IS NULL OR qm.calculated_at <= date_to);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 