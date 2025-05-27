Data Model: Coice
1. Supabase Tables
1.1 Profiles

Description: Stores user accounts and roles, extending auth.users.
Attributes:
id (uuid, PK, FK to auth.users.id): User identifier.
email (text, unique): User email.
role (text, check: admin, manager, end_user): User role.
display_name (text, nullable): Display name.
created_at (timestamptz, default now()): Creation time.


Relationships: Referenced by catalogs, prompts, pipelines, jobs, user_groups.

1.2 Catalogs

Description: Top-level industry/domain containers (e.g., “Oil & Gas”).
Attributes:
id (serial, PK): Catalog identifier.
name (varchar(255), not null): Catalog name.
user_id (uuid, FK to profiles.id): Owner.
description (text, nullable): Description.
created_at (timestamptz, default now()): Creation time.


Relationships: Contains libraries; owned by a profile.

1.3 Libraries

Description: Subcategories within catalogs (e.g., “Wells”).
Attributes:
id (serial, PK): Library identifier.
catalog_id (integer, FK to catalogs.id): Parent catalog.
name (varchar(255), not null): Library name.
parent_id (integer, FK to libraries.id, nullable): Parent library.
description (text, nullable): Description.
created_at (timestamptz, default now()): Creation time.


Relationships: Belongs to a catalog; contains images, pipelines; linked to library_groups.

1.4 Images

Description: Metadata for images in GCS.
Attributes:
id (uuid, PK): Image identifier.
library_id (integer, FK to libraries.id): Parent library.
gcs_path (text, unique): GCS path (e.g., gs://coice/catalogs/1/wells/image.jpg).
metadata (jsonb, default {}): EXIF and user-defined data.
created_at (timestamptz, default now()): Upload time.


Relationships: Belongs to a library; linked to job_results.

1.5 Prompts

Description: Reusable AI analysis prompts.
Attributes:
id (uuid, PK): Prompt identifier.
name (text, not null): Prompt name (e.g., “Flare Detection”).
prompt (text, not null): Prompt text.
type (text, check: boolean, descriptive, keywords): Prompt type.
created_by (uuid, FK to profiles.id): Creator.
created_at (timestamptz, default now()): Creation time.


Relationships: Referenced by pipeline_stages; created by a profile.

1.6 Pipelines

Description: Workflows with multiple prompt stages.
Attributes:
id (uuid, PK): Pipeline identifier.
library_id (integer, FK to libraries.id, nullable): Associated library.
name (varchar(255), not null): Pipeline name.
description (text, nullable): Description.
created_by (uuid, FK to profiles.id): Creator.
created_at (timestamptz, default now()): Creation time.


Relationships: Associated with a library (optional); has pipeline_stages; created by a profile.

1.7 Pipeline_Stages

Description: Stages in a pipeline with prompts and conditions.
Attributes:
id (uuid, PK): Stage identifier.
pipeline_id (uuid, FK to pipelines.id): Parent pipeline.
prompt_id (uuid, FK to prompts.id): Prompt for this stage.
stage_order (integer, not null, check >= 1): Execution order.
filter_condition (jsonb, nullable): Filter for images (e.g., { "stage_1.result": true }).


Relationships: Belongs to a pipeline; references a prompt.

1.8 Jobs

Description: Tracks pipeline executions.
Attributes:
id (uuid, PK): Job identifier.
pipeline_id (uuid, FK to pipelines.id): Executed pipeline.
library_id (integer, FK to libraries.id): Target library.
image_ids (uuid[], not null): Specific images (empty array for all library images).
status (text, check: pending, running, completed, failed): Job status.
total_images (integer, not null): Total images to process.
processed_images (integer, not null, default 0): Images processed.
created_by (uuid, FK to profiles.id): Submitter.
created_at (timestamptz, default now()): Creation time.
completed_at (timestamptz, nullable): Completion time.


Relationships: References a pipeline, library, profile; has job_results.

1.9 Job_Results

Description: Results per image and stage.
Attributes:
id (uuid, PK): Result identifier.
job_id (uuid, FK to jobs.id): Parent job.
image_id (uuid, FK to images.id): Analyzed image.
stage_id (uuid, FK to pipeline_stages.id): Pipeline stage.
result (jsonb, not null): Analysis output (e.g., { "result": true }).
executed_at (timestamptz, default now()): Execution time.
search_vector (tsvector): Full-text search for result.


Relationships: Linked to a job, image, pipeline_stage.

1.10 Groups

Description: Access control groups.
Attributes:
id (uuid, PK): Group identifier.
name (text, not null): Group name.
created_at (timestamptz, default now()): Creation time.


Relationships: Referenced by user_groups, library_groups, catalog_groups.

1.11 User_Groups

Description: Assigns users to groups.
Attributes:
user_id (uuid, FK to profiles.id): User.
group_id (uuid, FK to groups.id): Group.
Primary key: (user_id, group_id).


Relationships: Links profiles to groups.

1.12 Library_Groups

Description: Assigns groups to libraries.
Attributes:
library_id (integer, FK to libraries.id): Library.
group_id (uuid, FK to groups.id): Group.
Primary key: (library_id, group_id).


Relationships: Links libraries to groups.

1.13 Catalog_Groups

Description: Assigns groups to catalogs.
Attributes:
catalog_id (integer, FK to catalogs.id): Catalog.
group_id (uuid, FK to groups.id): Group.
Primary key: (catalog_id, group_id).


Relationships: Links catalogs to groups.

1.14 Feature_Flags

Description: Toggles experimental features.
Attributes:
id (uuid, PK): Flag identifier.
name (text, unique): Flag name.
enabled (boolean, default false): Status.
description (text, nullable): Description.
created_at (timestamptz, default now()): Creation time.


Relationships: None.

2. Google Cloud Storage

Bucket: coice (or user-specified).
Paths: catalogs/<catalog_id>/<library_id>/<image_name>.
Access: GCP service account.



3. Constraints

Unique: profiles.email, images.gcs_path, feature_flags.name, pipeline_stages(pipeline_id, stage_order).
RBAC: Supabase RLS policies enforce role-based access.
Image size: 10MB (practical for Cohere).

