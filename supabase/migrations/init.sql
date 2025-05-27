-- Initial database schema for Coice
-- Complete implementation of all tables and relationships

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'end_user')) DEFAULT 'end_user',
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Catalogs table
CREATE TABLE catalogs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Libraries table
CREATE TABLE libraries (
    id SERIAL PRIMARY KEY,
    catalog_id INTEGER REFERENCES catalogs(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Images table
CREATE TABLE images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE NOT NULL,
    gcs_path TEXT UNIQUE NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Prompts table
CREATE TABLE prompts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('boolean', 'descriptive', 'keywords')),
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Pipelines table
CREATE TABLE pipelines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Pipeline_Stages table
CREATE TABLE pipeline_stages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    stage_order INTEGER NOT NULL CHECK (stage_order >= 1),
    filter_condition JSONB,
    UNIQUE(pipeline_id, stage_order)
);

-- Jobs table
CREATE TABLE jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE NOT NULL,
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE NOT NULL,
    image_ids UUID[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
    total_images INTEGER NOT NULL,
    processed_images INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Job_Results table
CREATE TABLE job_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE NOT NULL,
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE NOT NULL,
    result JSONB NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    search_vector TSVECTOR
);

-- Groups table
CREATE TABLE groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User_Groups table
CREATE TABLE user_groups (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- Library_Groups table
CREATE TABLE library_groups (
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (library_id, group_id)
);

-- Catalog_Groups table
CREATE TABLE catalog_groups (
    catalog_id INTEGER REFERENCES catalogs(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (catalog_id, group_id)
);

-- Feature_Flags table
CREATE TABLE feature_flags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT FALSE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_catalogs_user_id ON catalogs(user_id);
CREATE INDEX idx_libraries_catalog_id ON libraries(catalog_id);
CREATE INDEX idx_libraries_parent_id ON libraries(parent_id);
CREATE INDEX idx_images_library_id ON images(library_id);
CREATE INDEX idx_images_gcs_path ON images(gcs_path);
CREATE INDEX idx_prompts_created_by ON prompts(created_by);
CREATE INDEX idx_pipelines_library_id ON pipelines(library_id);
CREATE INDEX idx_pipelines_created_by ON pipelines(created_by);
CREATE INDEX idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX idx_jobs_pipeline_id ON jobs(pipeline_id);
CREATE INDEX idx_jobs_library_id ON jobs(library_id);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_job_results_job_id ON job_results(job_id);
CREATE INDEX idx_job_results_image_id ON job_results(image_id);
CREATE INDEX idx_job_results_search_vector ON job_results USING gin(search_vector);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for catalogs table
CREATE POLICY "Users can view accessible catalogs" ON catalogs
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        ) OR
        EXISTS (
            SELECT 1 FROM catalog_groups cg
            JOIN user_groups ug ON cg.group_id = ug.group_id
            WHERE cg.catalog_id = catalogs.id AND ug.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers and admins can create catalogs" ON catalogs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Catalog owners and admins can update catalogs" ON catalogs
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Catalog owners and admins can delete catalogs" ON catalogs
    FOR DELETE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for libraries table
CREATE POLICY "Users can view accessible libraries" ON libraries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM catalogs c
            WHERE c.id = libraries.catalog_id AND (
                c.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role IN ('admin', 'manager')
                ) OR
                EXISTS (
                    SELECT 1 FROM catalog_groups cg
                    JOIN user_groups ug ON cg.group_id = ug.group_id
                    WHERE cg.catalog_id = c.id AND ug.user_id = auth.uid()
                )
            )
        ) OR
        EXISTS (
            SELECT 1 FROM library_groups lg
            JOIN user_groups ug ON lg.group_id = ug.group_id
            WHERE lg.library_id = libraries.id AND ug.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers and admins can create libraries" ON libraries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- RLS Policies for images table
CREATE POLICY "Users can view accessible images" ON images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM libraries l
            JOIN catalogs c ON l.catalog_id = c.id
            WHERE l.id = images.library_id AND (
                c.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role IN ('admin', 'manager')
                ) OR
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
        )
    );

-- RLS Policies for prompts table
CREATE POLICY "Users can view accessible prompts" ON prompts
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Managers and admins can create prompts" ON prompts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Prompt creators and admins can update prompts" ON prompts
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for pipelines table
CREATE POLICY "Users can view accessible pipelines" ON pipelines
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        ) OR
        (library_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM libraries l
            JOIN catalogs c ON l.catalog_id = c.id
            WHERE l.id = pipelines.library_id AND (
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
    );

-- RLS Policies for jobs table
CREATE POLICY "Users can view accessible jobs" ON jobs
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        ) OR
        EXISTS (
            SELECT 1 FROM libraries l
            JOIN catalogs c ON l.catalog_id = c.id
            WHERE l.id = jobs.library_id AND (
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
        )
    );

CREATE POLICY "Users can create jobs for accessible libraries" ON jobs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM libraries l
            JOIN catalogs c ON l.catalog_id = c.id
            WHERE l.id = jobs.library_id AND (
                c.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role IN ('admin', 'manager')
                ) OR
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
        )
    );

-- RLS Policies for admin-only tables
CREATE POLICY "Admins only" ON groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins and self access" ON user_groups
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins only manage user groups" ON user_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins only" ON library_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins only" ON catalog_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins only" ON feature_flags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some initial feature flags
INSERT INTO feature_flags (name, enabled, description) VALUES
    ('google_oauth', true, 'Enable Google OAuth authentication'),
    ('real_time_notifications', true, 'Enable real-time job progress notifications'),
    ('advanced_search', false, 'Enable advanced search functionality'),
    ('bulk_operations', false, 'Enable bulk operations for images and jobs');

-- Insert initial admin user (will be created when first user signs up)
-- The first user to sign up should be manually promoted to admin role 