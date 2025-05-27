Architecture: Coice
1. Overview
Coice is a Next.js web application with Supabase for metadata, authentication, and real-time updates, Google Cloud Storage (GCS) for images, and Cohere V2 Client for AI analysis. It features a horizontal navbar, left sidebar, and real-time job progress monitoring via Supabase subscriptions. The architecture supports multi-stage pipelines and job tracking with role-based access control.
2. Architecture Diagram
[User Browser]
      |
      v
[Frontend: Next.js, React, TanStack Table, Tailwind CSS]
      |    (Navbar, Sidebar, Job Details, Notifications)
      v
[Backend: Next.js API Routes, Supabase]
      |-----------------|
      v                 v
[Supabase: Auth, PostgreSQL, Real-Time]  [GCS API]
      |                      |
[Cohere V2 API]         [GCS Buckets]
      |
[Vision Models]

3. Components
3.1 Frontend

Tech: Next.js, React, TanStack Table, Tailwind CSS, react-toastify.
Responsibilities:
Render Card, List, Carousel views.
Display navbar, sidebar, job details with progress bar.
Show toast notifications for job updates.
Handle drag-and-drop uploads.
Subscribe to Supabase real-time events.


Features:
Responsive UI inspired by Apple Photos.
Real-time progress updates.



3.2 Backend

Tech: Next.js API Routes, Supabase SDK, Google Cloud Storage SDK, Bull (queue).
Responsibilities:
Handle Supabase Auth and RBAC.
Manage catalogs, libraries, images, pipelines, jobs.
Upload images to GCS; store metadata.
Run Cohere API for pipeline stages.
Update job progress; broadcast real-time events.


Features:
Asynchronous job processing via queue.
Secure uploads and real-time subscriptions.



3.3 External Services

Supabase:
Auth: JWT-based authentication.
PostgreSQL: Metadata, job results.
Real-Time: Job status/progress updates.


GCS: Image storage.
Cohere: Vision model API for analysis.

4. Data Flow

Authentication: User logs in via Supabase; JWT stored in browser.
Navigation: Navbar/sidebar load catalogs/libraries from Supabase.
Job Submission: User submits job; backend calculates total_images, queues processing.
Job Processing:
Fetch images from GCS; run Cohere prompts.
Save results to job_results; update jobs.processed_images.
Broadcast updates via Supabase real-time.


Progress Monitoring:
Client subscribes to jobs and job_results.
Toast notifications and progress bar update on events.


Search: Query Supabase for catalogs, libraries, images, job results.

5. Deployment

Environment: Vercel for Next.js; Supabase for metadata; GCS for images.
Configuration:
Env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_APPLICATION_CREDENTIALS, COHERE_API_KEY.


Scaling:
Vercel scales Next.js; Supabase/GCS handle data; queue manages jobs.



6. Security

Auth: Supabase JWT and RLS.
Uploads: Validate image MIME types and size.
Secrets: Store API keys in env vars.

