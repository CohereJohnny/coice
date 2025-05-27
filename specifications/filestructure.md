File Structure: Coice
project_root/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.js
│   │   ├── catalogs/
│   │   │   └── route.js
│   │   ├── libraries/
│   │   │   └── route.js
│   │   ├── images/
│   │   │   └── route.js
│   │   ├── prompts/
│   │   │   └── route.js
│   │   ├── pipelines/
│   │   │   └── route.js
│   │   ├── jobs/
│   │   │   ├── run/
│   │   │   │   └── route.js
│   │   │   ├── [id]/
│   │   │   │   └── route.js
│   │   │   ├── [id]/results/
│   │   │   │   └── route.js
│   │   │   └── history/
│   │   │       └── route.js
│   │   ├── buckets/
│   │   │   └── route.js
│   │   └── search/
│   │       └── route.js
│   ├── components/
│   │   ├── Navbar.js
│   │   ├── Sidebar.js
│   │   ├── CardView.js
│   │   ├── ListView.js
│   │   ├── CarouselView.js
│   │   ├── AdminPanel.js
│   │   ├── JobDetails.js
│   │   └── Notifications.js
│   ├── layout.js
│   ├── page.js
│   └── globals.css
├── lib/
│   ├── supabase.js
│   └── queue.js
├── public/
│   └── assets/
│       └── coice-logo.png
├── supabase/
│   └── migrations/
│       └── init.sql
├── specifications/
│   ├── prd.md
│   ├── personas.md
│   ├── user_stories.md
│   ├── ux_flow.md
│   ├── api_spec.md
│   ├── datamodel.md
│   ├── architecture.md
│   ├── techstack.md
│   └── filestructure.md
├── service-account-key.json
├── package.json
├── next.config.js
├── .env.local
├── .gitignore
└── README.md

File Descriptions

app/: Next.js app directory.
api/: Routes for auth, catalogs, libraries, images, prompts, pipelines, jobs, buckets, search.
components/: React components for UI, including job details and notifications.
layout.js: Root layout with Navbar, Sidebar, ToastContainer.
page.js: Main dashboard.
globals.css: Tailwind CSS customizations.


lib/:
supabase.js: Supabase client initialization.
queue.js: Bull queue configuration for job processing.


public/assets/: Coice logo.
supabase/migrations/: Database schema.
specifications/: Specification documents.
service-account-key.json: GCS credentials.
package.json: Dependencies.
next.config.js: Next.js config.
.env.local: Environment variables.
.gitignore: Excludes sensitive files.

