-- Add system monitoring feature flag
INSERT INTO feature_flags (name, enabled, description) VALUES
    ('system_monitoring', false, 'Enable system resource monitoring (CPU, memory, disk usage)')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description; 