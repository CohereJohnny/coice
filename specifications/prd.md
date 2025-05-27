Product Requirements Document (PRD): Coice
1. Overview
Coice (Cohere Image Catalog Explorer) is a Next.js web application for managing and analyzing image collections, with images stored in Google Cloud Storage (GCS) buckets and metadata in Supabase PostgreSQL. The UI, inspired by Apple Photos, Google Photos, and Adobe Lightroom, features three views (Card, List with TanStack Table, Carousel), a persistent horizontal navbar, and a left sidebar for navigating catalogs and libraries. It uses Cohere’s V2 Client for AI-powered image analysis via multi-stage pipelines, with job tracking and real-time progress monitoring. Role-based authentication supports Application Administrator, Library/Catalog Manager, and Application End User roles.
1.1 Purpose

Provide an intuitive interface for organizing and analyzing images in industry-specific catalogs and libraries.
Store images in GCS and metadata in Supabase for scalability.
Enable AI-driven analysis with chained prompts in pipelines, tracked as jobs.
Support real-time job progress monitoring with notifications and progress bars.

1.2 Scope

In Scope:
Authentication with three roles: Administrator, Manager, End User.
Catalog and library management in Supabase with nested hierarchies.
Image storage in GCS; metadata (EXIF, AI results) in Supabase.
Three UI views: Card, List, Carousel.
Persistent horizontal navbar (logo, Libraries, Analysis, Search) and left sidebar (catalogs/libraries).
Multi-stage analysis pipelines with prompt chaining and filtering.
Job tracking with real-time progress updates via toast notifications and progress bars.
Image uploads with drag-and-drop to GCS.
Search across catalogs, libraries, images, and metadata.


Out of Scope:
Real-time collaboration.
Image editing.
Non-image file support.
Offline mode.



2. Features
2.1 Authentication

Roles:
Administrator: Manage users, roles, groups, feature flags.
Manager: Create/edit/delete catalogs, libraries, prompts, pipelines; run jobs.
End User: Browse libraries, run predefined pipelines, submit ad-hoc prompts, view job results.


Login: Email/password or Google OAuth via Supabase Auth.

2.2 Navigation

Horizontal Navbar (persistent):
Left: Coice logo and name.
Center: Links to “Libraries” (catalog/library view), “Analysis” (pipeline/job management), “Search” (metadata search).
Right: Theme switcher (light/dark), settings, profile icons.


Left Sidebar:
File-explorer-like navigation for catalogs and libraries (nested).
Clicking a library shows images, metadata, and subfolders in the main panel.



2.3 Catalog and Library Management

Managers create/edit/delete catalogs (e.g., “Oil & Gas”) and libraries (e.g., “Wells”).
Libraries are nested within catalogs, with optional sub-libraries.
Browse in Card, List, or Carousel views.

2.4 Image Management

Upload images to GCS via drag-and-drop (single or folders).
Extract EXIF metadata and store in Supabase.
Display images, metadata, and subfolders in the main panel for selected libraries.
List GCS buckets in sidebar for legacy data.

2.5 Analysis Pipelines and Jobs

Pipelines:
Multi-stage workflows with chained prompts (e.g., Stage 1: “Are flares present?”; Stage 2: “Describe flares” for true results).
Types: Boolean, descriptive, keywords.
Library-specific or general-purpose, defined by Managers.


Jobs:
Track pipeline executions on libraries or selected images.
Store status (pending, running, completed, failed), total/processed images.
Real-time progress updates via toast notifications and progress bar (e.g., 50% for 10/20 images).
Historical job results viewable for comparison and prompt tuning.


Ad-Hoc Prompts: End Users can run one-off prompts, saved as job results.

2.6 Job Progress Monitoring

Notifications:
Toast notifications for status changes (e.g., “Job #123 running”) and milestones (e.g., 50% complete).
Stackable, auto-dismiss after 3 seconds.


Job Details View:
Accessible via Job History or Analysis Results Screen.
Real-time progress bar showing percentage complete.
Metrics: Processed/total images, stage-specific progress.
Preview of results with links to full results.



2.7 Search

Search catalogs, libraries, images, and job results (EXIF, AI descriptions).
Accessible via navbar “Search” link.

2.8 User Interface

Card View: Thumbnail grid with hover effects.
List View: TanStack Table with columns for path, EXIF, job results.
Carousel View: Full-screen slideshow with metadata.
Responsive: Mobile/desktop support, inspired by Lightroom.
Analysis Results Screen: Shows job results with filters by stage.
Job History: Lists jobs by library/image, with comparison tools.

3. Non-Functional Requirements

Performance: Load library contents in <2 seconds for <1,000 images; handle 100 concurrent jobs.
Security: RBAC via Supabase RLS; validate GCS uploads.
Scalability: Support 10,000 images per library; GCS/Supabase scale natively.
Reliability: 99.9% uptime; accurate real-time updates.

4. Constraints

Requires Supabase project with Auth, PostgreSQL, and real-time enabled.
Requires GCP service account with Storage Admin permissions.
Requires Cohere API key for Vision models.
Browser support: Chrome, Firefox, Safari, Edge.

5. Success Metrics

Engagement: 80% of users create/run a pipeline in first session.
Performance: Image load time <1 second; job updates <1 second latency.
Error Rate: <1% API call failures.
Satisfaction: NPS >50 from beta testers.

6. Assumptions

Users are familiar with photo management apps.
GCS buckets and Supabase project are pre-configured.
Cohere Vision models support prompt types.

7. Risks

API Limits: GCS, Supabase, or Cohere rate limits may impact jobs.
Cost: High AI analysis volume may increase costs.
Real-Time: Network issues may delay updates.

8. Stakeholders

Product Owner: Defines priorities.
Developers: Build Next.js app and integrations.
Users: Creative professionals, industry analysts.
Admins: Manage Supabase/GCS.

9. Timeline

Phase 1 (2 weeks): Set up Next.js, Supabase, navbar, sidebar, authentication.
Phase 2 (3 weeks): Implement catalog/library management, GCS uploads, views.
Phase 3 (3 weeks): Build pipelines, jobs, real-time progress, Cohere integration.
Phase 4 (2 weeks): Add search, notifications, testing, deployment.

10. Future Enhancements

Pipeline versioning.
Image editing tools.
Advanced search filters.
Job pausing/resuming.

