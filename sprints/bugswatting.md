## Bug Entry: [2024-01-25]
- **ID**: BUG-001
- **Description**: Job monitoring "View Details" action opens in new browser tab instead of navigating within current tab
- **Discovered**: Sprint 10 testing - job monitoring dashboard
- **Context**: Sprint 10, Phase 6 - Job History page development
- **Fix**: 
  - Changed JobMonitoringDashboard button from `window.open()` to `router.push()` navigation
  - Added useRouter import to components/jobs/JobMonitoringDashboard.tsx
  - Fixed notification service methods (jobStarted, jobCompleted, jobFailed) to use window.location.href instead of window.open
- **Status**: Resolved

## Bug Entry: [2024-01-25]
- **ID**: BUG-002  
- **Description**: Job details page repeatedly loads and refreshes images causing flickering
- **Discovered**: Sprint 10 testing - job details page with multiple results showing repeated API calls for same images
- **Context**: Sprint 10, Job details page ImageDisplay component
- **Fix**: 
  - Optimized ImageDisplay component with React.memo to prevent unnecessary re-renders
  - Improved image URL caching logic to check cache before making API calls
  - Added proper error handling and loading states
  - Reduced dependency array in useEffect to only imageId
  - Added error state to prevent infinite error loops
- **Status**: Resolved

## Bug Entry: [2024-01-25]
- **ID**: BUG-003
- **Description**: Excessive API calls to /api/images endpoint - hundreds of duplicate requests for same images on job details page load
- **Discovered**: Sprint 10 testing - single page load generating 100+ API requests for same image IDs
- **Context**: Sprint 10, Job details page with multiple ImageDisplay components causing race conditions
- **Fix**: 
  - Created centralized imageService with request deduplication and proper caching
  - Implemented singleton pattern to prevent multiple simultaneous requests for same image
  - Added request counter and debugging capabilities to monitor API calls
  - Replaced problematic inline caching with proper service-based caching
  - Added debug panel in development mode to track request statistics
- **Status**: Resolved

## Bug Entry: [2024-01-25]
- **ID**: BUG-004
- **Description**: Dashboard showing incorrect statistics - Images shows 0 despite having images across multiple catalogs/libraries, Active Jobs and Recent Jobs counts may be inaccurate
- **Discovered**: Sprint 10 testing - dashboard statistics not reflecting actual data
- **Context**: Sprint 10, Dashboard data fetching and aggregation issues
- **Fix**: 
  - Created dedicated `/api/dashboard/stats` endpoint with proper counting logic
  - Added role-based access control for catalog and library counting
  - Implemented proper image counting across all accessible libraries
  - Updated useDashboardData hook to use new dedicated stats API
  - Fixed job status filtering for accurate active and recent job counts
- **Status**: Resolved
