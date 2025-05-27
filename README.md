# Coice - Cohere Image Catalog Explorer

AI-powered image catalog management and analysis platform built with Next.js, Supabase, and Cohere AI.

## Overview

Coice provides an intuitive interface for organizing and analyzing images in industry-specific catalogs and libraries. It features:

- **Role-based Authentication**: Administrator, Manager, and End User roles
- **Catalog & Library Management**: Organize images by industry/domain with nested hierarchies
- **AI-Powered Analysis**: Multi-stage pipelines with Cohere Vision models
- **Real-time Job Monitoring**: Live progress updates and notifications
- **Multiple View Modes**: Card, List (TanStack Table), and Carousel views
- **Cloud Storage**: Images stored in Google Cloud Storage with metadata in Supabase

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (Auth, PostgreSQL, Real-time)
- **Storage**: Google Cloud Storage for images
- **AI**: Cohere V2 API for image analysis
- **Queue**: Bull (Redis) for job processing
- **UI Components**: Radix UI, Shadcn/ui, Lucide React
- **State Management**: Zustand
- **Notifications**: Sonner

## Prerequisites

- Node.js 18+
- PNPM package manager
- Supabase project with Auth, PostgreSQL, and Real-time enabled
- Google Cloud Platform account with Storage API access
- Cohere API account
- Redis instance (for job queue)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coice
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required environment variables:
   - Supabase URL and keys
   - Google Cloud Storage credentials
   - Cohere API key
   - Redis URL

4. **Google Cloud Storage Setup**
   ```bash
   cp service-account-key.json.example service-account-key.json
   ```
   Replace with your actual GCS service account credentials.

5. **Database Setup**
   - Create a Supabase project
   - Run the migrations in `supabase/migrations/`
   - Configure Row Level Security policies

6. **Start Development Server**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Workflow

### Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

### Project Structure

```
coice/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── lib/                   # Utility functions
│   ├── supabase.ts       # Supabase client
│   └── queue.ts          # Bull queue configuration
├── public/               # Static assets
├── supabase/            # Database migrations
├── specifications/      # Project specifications
└── sprints/            # Sprint documentation
```

### Sprint Development

This project follows a structured sprint workflow:

1. **Sprint Planning**: Detailed tasks in `sprints/v0.x.0/sprint_x_tasks.md`
2. **Implementation**: Code changes with progress tracking
3. **Testing**: Test plans in `sprints/v0.x.0/sprint_x_testplan.md`
4. **Review**: Sprint reports and retrospectives

Current Sprint: **Sprint 1 - Project Foundation & Setup**

## Features by Sprint

- **Sprint 1**: Project foundation, dependencies, basic layout ✅
- **Sprint 2**: Supabase integration, authentication, database schema
- **Sprint 3**: Navigation, responsive layout, theme switcher
- **Sprint 4**: Catalog & library management
- **Sprint 5**: Google Cloud Storage integration
- **Sprint 6-7**: Image viewing (Card, List, Carousel)
- **Sprint 8**: Prompt & pipeline management
- **Sprint 9**: Cohere AI integration, job processing
- **Sprint 10**: Real-time progress monitoring
- **Sprint 11**: Advanced job processing & results
- **Sprint 12**: Search & discovery
- **Sprint 13**: Admin panel & user management
- **Sprint 14**: Performance optimization
- **Sprint 15**: Testing, documentation, deployment

## Contributing

1. Follow the sprint workflow defined in `sprints/sprint-rules.md`
2. Use conventional commit messages
3. Ensure all tests pass before submitting PRs
4. Follow the established code style (ESLint + Prettier)

## Security

- Environment variables are required for all external services
- Service account keys should never be committed to version control
- Row Level Security (RLS) policies enforce access control
- All API routes include proper authentication checks

## License

[License information to be added]

## Support

For questions or issues, please refer to the project documentation in the `specifications/` directory or create an issue in the repository.
