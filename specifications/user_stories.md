User Stories: Coice
Epic 1: Authentication

As an Administrator, I want to manage user accounts and roles to control app access.
As an Administrator, I want to configure feature flags to enable/disable experimental features.
As an Administrator, I want to create, edit, and delete groups to control access to catalogs and libraries.
As an Administrator, I want to add or remove users from groups to manage group memberships.
As a Manager, I want to log in securely to manage catalogs and pipelines.
As an End User, I want to log in with Google OAuth for easy access.

Epic 2: Navigation

As a user, I want a persistent horizontal navbar with Coice logo, Libraries, Analysis, and Search links to navigate easily.
As a user, I want theme switcher, settings, and profile icons in the navbar to customize my experience.
As a user, I want a left sidebar to explore catalogs and libraries like a file explorer.
As a user, I want to click a library to view images, metadata, and subfolders in the main panel.

Epic 3: Catalog and Library Management

As a Manager, I want to create/delete catalogs to organize industries (e.g., "Oil & Gas").
As a Manager, I want to create/edit libraries within catalogs (e.g., "Wells") to categorize images.
As an End User, I want to browse libraries in Card, List, or Carousel view.

Epic 4: Image Management

As a Manager, I want to upload images to GCS via drag-and-drop to add to libraries.
As a Manager, I want to store EXIF metadata in Supabase to verify image details.
As an End User, I want to download images from GCS for projects.

Epic 5: Analysis Pipelines and Jobs

As a Manager, I want to create multi-stage pipelines with chained prompts to automate analysis (e.g., flare detection then description).
As a Manager, I want to define reusable prompts (boolean, descriptive, keywords) for pipelines.
As an End User, I want to run predefined pipelines on a library to analyze images.
As an End User, I want to submit ad-hoc prompts for one-off analysis.
As a Manager, I want to submit a job and track its progress to monitor analysis.

Epic 6: Job Progress Monitoring

As a user, I want toast notifications for job status changes and progress milestones to stay informed.
As a user, I want to view a job's details to see real-time progress (e.g., 50% for 10/20 images).
As a user, I want a progress bar in the job details view to visualize completion.
As a user, I want to see stage-specific progress and results in the job details view.
As a Manager, I want to view historical jobs to compare results and tune prompts.

Epic 7: Search

As a user, I want to search catalogs, libraries, images, and job results to find content.

Epic 8: GCS Support

As a Manager, I want to list GCS buckets in the sidebar to access legacy data.
As an End User, I want to browse bucket contents in the main panel.

