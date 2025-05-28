UX Flow: Coice
1. Authentication

Screen: Login page
Elements: Email/password fields, Google OAuth button, sign-up link.
Flow:
User logs in via Supabase Auth.
Success: Redirect to home page with navbar and sidebar.
Error: Show "Invalid credentials".



2. Home Page

Screen: Library dashboard
Elements:
Horizontal Navbar: Logo, "Libraries", "Analysis", "Search"; theme switcher, settings, profile.
Left Sidebar: Nested catalogs/libraries (file-explorer style).
Main panel: Shows selected library's images, metadata, subfolders.
View toggle (Card, List, Carousel).
Admin panel button (Administrators).


Actions:
Click library in sidebar to load content in main panel.
Toggle views.
Navigate via navbar.



3. Card View

Screen: Thumbnail grid in main panel
Flow:
Shows GCS image thumbnails; Supabase metadata on hover (EXIF, job results).
Click image for details or Carousel view.
Managers: Drag-and-drop uploads; create sub-libraries.



4. List View

Screen: TanStack Table in main panel
Flow:
Columns: GCS path, Title, EXIF, Job Results.
Sort/filter columns.
Click row to view/download image.
Managers: Edit metadata, delete images.



5. Carousel View

Screen: Full-screen slideshow in main panel
Flow:
Shows GCS images with Supabase metadata below.
Navigation arrows for slideshow.
End Users: Run pipelines or ad-hoc prompts.
Managers: Edit metadata or prompts.



6. Admin Panel (Administrators)

Screen: Admin dashboard (via navbar/sidebar)
Flow:
Manage users: Add/edit/delete, assign roles.
Manage groups: Create groups for library access.
Feature flags: Enable/disable features.
Changes saved to Supabase; errors shown.

+Screen: Group Management
+Elements:
  - List of groups (name, created_at)
  - Expandable group rows to show members (users)
  - Add user to group (by email)
  - Remove user from group
  - Create new group
  - Delete group
+Flow:
  - Admin clicks "Groups" tab in Admin panel.
  - Sees all groups; can expand to view members.
  - Can add a user to a group by entering email.
  - Can remove a user from a group.
  - Can create or delete groups.
  - All changes update Supabase and show success/error feedback.



7. Catalog and Library Management (Managers)

Screen: Sidebar and main panel
Flow:
Create/edit/delete catalogs/libraries in Supabase via sidebar.
Upload images to GCS; save metadata.
Define pipelines in Analysis section.



8. Analysis Pipelines and Jobs

Screen: Analysis section (via navbar)
Flow:
Managers: Create multi-stage pipelines with prompts (boolean, descriptive, keywords).
Users: Select library/images, choose pipeline, submit job.
Ad-hoc prompts: Enter custom prompt for one-off analysis.
Job submission triggers toast notification ("Job submitted").
Errors: Alert for API failures (e.g., "Cohere rate limit").



9. Job Progress Monitoring

Screen: Job Details View (/analysis/jobs/:jobId)
Flow:
Access via Job History or Analysis Results Screen.
Shows job metadata (pipeline, library, status, timestamps).
Real-time progress bar: Percentage complete (e.g., 50% for 10/20 images).
Metrics: Processed/total images, stage-specific progress.
Results preview with link to full results.
Toast notifications for status changes (e.g., "Running") and milestones (e.g., 50% complete).


Screen: Job History (/analysis/history)
Flow:
Lists jobs by library/image with details (pipeline, status, dates).
Compare jobs side-by-side for prompt tuning.


Screen: Analysis Results Screen (/analysis/results/:jobId)
Flow:
Shows job results in Card/List/Carousel view.
Filter by stage or result (e.g., flares = true).



10. Search

Screen: Search page (via navbar)
Flow:
Search bar for catalogs, libraries, images, job results.
Results in Card or List view with filters.



11. GCS Integration

Screen: Sidebar and main panel
Flow:
Sidebar lists GCS buckets with prefixes as folders.
Click bucket to show images/subfolders in main panel.
Managers: Upload to GCS.



12. Responsive Design

Mobile:
Navbar collapses to hamburger; sidebar toggles.
Simplified List view; touch-friendly Carousel.
Compact job details with vertical progress bar.


Desktop:
Full navbar/sidebar; grid for Card view; full TanStack Table.
Hover effects, drag-and-drop support.



