# Sprint 15 Tasks - Public Landing Page & Auth Delineation

## Goals
- Create a compelling public-facing landing page for COICE
- Clearly separate authenticated and unauthenticated user experiences
- Implement robust access control for all app routes
- Polish onboarding and encourage sign-up

## Key Deliverables
- Public SaaS-style home page at `/` (hero, features, Unsplash images, CTA)
- Authenticated users redirected to `/dashboard` or workspace
- Unauthenticated users see only public landing and auth pages
- Navigation adapts to auth state (Sign In/Up vs. app nav)
- Access control for all internal routes
- (Optional) SEO, Open Graph, testimonials, pricing, FAQ

## Tasks

### 1. Public Landing Page
- [ ] Design hero section with COICE branding, tagline, and CTA
- [ ] Add feature highlights (image analysis, admin tools, performance, etc.)
- [ ] Integrate Unsplash images for visual appeal
- [ ] Add screenshots or demo carousel (optional)
- [ ] Add footer with links (privacy, terms, contact)
- [ ] Add testimonials, pricing, or FAQ sections (optional)

### 2. Routing & Navigation
- [ ] Update `/` route to show landing page for unauthenticated users
- [ ] Redirect authenticated users from `/` to `/dashboard`
- [ ] Show only Sign In/Up in navbar for public users
- [ ] Show full app navigation for authenticated users

### 3. Access Control
- [ ] Require authentication for all app routes except `/`, `/auth/login`, `/auth/register`, etc.
- [ ] Add middleware or guards to enforce access control
- [ ] Test all routes for correct access behavior

### 4. Polish & SEO
- [ ] Add SEO meta tags and Open Graph images for landing page
- [ ] Polish landing page design and responsiveness
- [ ] Add analytics/tracking for sign-up conversion (optional)

## Progress Notes
- Sprint 15 initialized. Planning and scaffolding landing page. 