Tech Stack: Coice
1. Frontend

Framework: Next.js (React)
Server-side rendering, static generation, and API routes for scalable web apps.


Libraries:
@tanstack/react-table: Dynamic, performant tables for List View.
@supabase/supabase-js: Supabase SDK for authentication, database, and real-time subscriptions.
exif-js: Extract EXIF metadata from images.
@google-cloud/storage: Google Cloud Storage SDK for image uploads and retrieval.
cohere-ai: Cohere V2 Client for AI-powered image analysis.
zustand: Lightweight state management for UI state (e.g., carousel index, view mode).
@radix-ui/react-* (via Shadcn): Accessible, unstyled UI components for buttons, modals, etc.
sonner: Modern toast notifications for job status and user actions.
embla-carousel-react: Lightweight, touch-friendly carousel for Carousel View.


Styling: Tailwind CSS
Utility-first CSS framework for responsive, customizable design.



2. Backend

Next.js API Routes: Serverless API endpoints for app logic.
Supabase:
Auth: JWT-based authentication with role-based access control.
PostgreSQL: Relational database for metadata, pipelines, and job results.
Real-Time: WebSocket-based subscriptions for live job progress updates.


Google Cloud Storage (GCS): Scalable storage for images.
Bull: Redis-based job queue for asynchronous processing of analysis jobs.

3. External Services

Supabase: Authentication, database, and real-time features.
Google Cloud Storage: Image storage with bucket-based organization.
Cohere V2 API: Vision models for AI-driven image analysis.

4. Development Tools

Package Manager: PNPM
Efficient, disk-space-saving dependency management.


IDE: Cursor
AI-enhanced coding environment for vibe-coding.


Version Control: Git
Source control with GitHub integration.


Testing:
Jest: Unit testing for components and utilities (future).
Cypress: End-to-end testing (future).


Linting/Formatting:
ESLint: Code quality for JavaScript/React.
Prettier: Code formatting.



5. Deployment

Platform: Vercel
Hosting for Next.js app with automatic scaling and CI/CD.


Configuration:
.env.local: Environment variables (e.g., Supabase keys, GCS credentials, Cohere API key).
service-account-key.json: GCS service account credentials (not committed).


CI/CD: Vercel Git integration for automated builds and deployments.

6. Why This Stack?

Next.js: Ideal for SSR, static sites, and API routes; optimizes for Vercel.
Vercel: Simplifies deployment and scaling for Next.js apps.
Supabase: All-in-one backend with auth, database, and real-time, reducing complexity.
GCS: Reliable, scalable image storage with native GCP integration.
Zustand: Lightweight alternative to Redux for managing UI state.
Shadcn/Tailwind: Rapid, consistent UI development with customizable components.
PNPM: Faster and more efficient than npm/yarn.
Sonner: Modern, lightweight notifications for job progress.
TanStack Table: Flexible, performant tables for metadata display.
Cohere: Advanced vision models for AI analysis.
Bull: Robust job queue for handling large analysis tasks.
embla-carousel-react: Lightweight, customizable carousel for slideshows.

7. Installation
# Initialize project with PNPM
pnpm create next-app@latest coice
cd coice

# Install dependencies
pnpm add @supabase/supabase-js @tanstack/react-table exif-js @google-cloud/storage cohere-ai zustand sonner embla-carousel-react bull
pnpm add -D @radix-ui/react-* tailwindcss postcss autoprefixer eslint prettier

