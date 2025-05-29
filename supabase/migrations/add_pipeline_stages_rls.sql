-- Add RLS policies for pipeline_stages table
-- These were missing from the initial schema, causing pipeline stages to be inaccessible

-- RLS Policies for pipeline_stages table
CREATE POLICY "Users can view accessible pipeline stages" ON pipeline_stages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pipelines p
            WHERE p.id = pipeline_stages.pipeline_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role IN ('admin', 'manager')
                ) OR
                (p.library_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM libraries l
                    JOIN catalogs c ON l.catalog_id = c.id
                    WHERE l.id = p.library_id AND (
                        c.user_id = auth.uid() OR
                        EXISTS (
                            SELECT 1 FROM catalog_groups cg
                            JOIN user_groups ug ON cg.group_id = ug.group_id
                            WHERE cg.catalog_id = c.id AND ug.user_id = auth.uid()
                        ) OR
                        EXISTS (
                            SELECT 1 FROM library_groups lg
                            JOIN user_groups ug ON lg.group_id = ug.group_id
                            WHERE lg.library_id = l.id AND ug.user_id = auth.uid()
                        )
                    )
                ))
            )
        )
    );

CREATE POLICY "Managers and admins can create pipeline stages" ON pipeline_stages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Pipeline creators and admins can update pipeline stages" ON pipeline_stages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pipelines p
            WHERE p.id = pipeline_stages.pipeline_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Pipeline creators and admins can delete pipeline stages" ON pipeline_stages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pipelines p
            WHERE p.id = pipeline_stages.pipeline_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            )
        )
    ); 