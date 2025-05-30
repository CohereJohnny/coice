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

## Bug Entry: [2024-12-19]
- **ID**: BUG-015
- **Description**: Job Overview showing empty values for "Total Images" and "Processed"
- **Discovered**: Sprint 11 testing - Job Details page shows blank values instead of image counts
- **Context**: Job Details page (/analysis/jobs/[id]) - Job Overview Card displaying empty values
- **Root Cause**: Field name mismatch between API response and UI component
  - API returns: `totalImages` and `processedImages` (camelCase)
  - UI expected: `total_images` and `processed_images` (snake_case)
- **Fix**: Updated Job Details page component to use correct camelCase field names
  - Changed `jobDetails.job.total_images` → `jobDetails.job.totalImages`
  - Changed `jobDetails.job.processed_images` → `jobDetails.job.processedImages`
  - Updated TypeScript interface and calculateProgress() function
- **Files Modified**: 
  - `app/analysis/jobs/[id]/page.tsx` (lines 469-472, interface definition, calculateProgress)
- **Testing**: Build successful (Exit code: 0), ready for user testing
- **Status**: Resolved

## Bug Entry: [2025-01-27]
- **ID**: BUG-016
- **Description**: Advanced Results View throwing 500 errors when applying stage filtering (stageOrder parameter)
- **Discovered**: During Sprint 11 testing of Advanced Results View filtering functionality
- **Context**: Sprint 11, Advanced Results View component, stage filtering feature
- **Technical Root Cause**: 
  - JobResultService.applyFilters() method referenced 'pipeline_stages.stage_order' field
  - Stats queries don't include pipeline_stages table joins (use count: 'exact', head: true mode)
  - Database constraint violation when trying to filter on non-existent table reference
- **Error Pattern**: "Failed to get total count:" with empty error details, 500 HTTP status
- **Fix**: Enhanced applyFilters() method with subquery approach:
  ```typescript
  // Before (broken):
  query = query.eq('pipeline_stages.stage_order', filters.stageOrder);
  
  // After (working):
  query = query.in('stage_id', 
    this.supabase
      .from('pipeline_stages')
      .select('id')
      .eq('stage_order', filters.stageOrder)
  );
  ```
- **Impact**: Stage filtering now works universally for both joined and non-joined queries
- **Status**: Resolved
- **Files Modified**: lib/services/jobResultService.ts
- **Sprint**: Sprint 11 - Advanced Job Processing & Results Enhancement

## Bug Entry: [2025-01-27]
- **ID**: BUG-017
- **Description**: Job Analytics Dashboard showing only skeleton loaders instead of actual analytics data
- **Discovered**: During Sprint 11 testing of Job Details page Analytics tab
- **Context**: Sprint 11, Job Details page (/analysis/jobs/[id]) - Analytics tab functionality
- **Technical Root Cause**: 
  - JobAnalyticsDashboard component was receiving `data={undefined}` instead of actual analytics data
  - No data fetching logic was implemented in Job Details page for analytics
  - Component correctly showed loading skeletons when data was undefined, but data was never loaded
- **User Experience Impact**: Users saw permanent loading skeletons instead of performance metrics and charts
- **Fix**: Added comprehensive analytics data loading system:
  ```typescript
  // Added analytics state management
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Added loadAnalyticsData function with job-specific filtering
  const loadAnalyticsData = useCallback(async () => {
    const params = new URLSearchParams({
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
      // ... pipeline-specific filters
    });
    const response = await fetch(`/api/analytics?${params}`);
  }, [jobDetails]);
  
  // Added tab change handler for lazy loading
  const handleTabChange = useCallback((newTab: string) => {
    if (newTab === 'analytics' && !analyticsData) {
      loadAnalyticsData();
    }
  }, [analyticsData, loadAnalyticsData]);
  ```
- **Technical Enhancements**: Lazy loading, job-specific filtering, proper state management, smart caching
- **Impact**: Analytics dashboard now shows real performance metrics, charts, and insights with proper loading states
- **Status**: Resolved
- **Files Modified**: app/analysis/jobs/[id]/page.tsx
- **Sprint**: Sprint 11 - Advanced Job Processing & Results Enhancement

## Bug Entry: [2025-01-27]
- **ID**: BUG-018
- **Description**: Feature flag system was hardcoded instead of being database-driven and manageable through admin interface
- **Discovered**: During Sprint 11 implementation of feature flag system for hiding incomplete advanced features
- **Context**: Sprint 11, Feature flag implementation for Job Analytics Dashboard, Comparison Tools, and Result Validation
- **Technical Root Cause**: 
  - Feature flag system in `lib/featureFlags.ts` used hardcoded DEFAULT_FEATURE_FLAGS object
  - No integration with existing Supabase `feature_flags` table
  - No admin interface for managing feature flags without code deployments
  - Advanced features were showing incomplete/broken functionality to users
- **User Experience Impact**: 
  - Users saw broken Analytics, Comparison, and Validation tabs that didn't work properly
  - Admins had no way to enable/disable features without deploying new code
  - No flexibility for gradual feature rollouts or A/B testing
- **Fix**: Comprehensive Supabase integration with admin management interface
  - **Database Integration**: Connected `lib/featureFlags.ts` to Supabase `feature_flags` table with caching
  - **Admin Interface**: Created `FeatureFlagManager` component in admin panel with real-time toggle controls
  - **API Layer**: Built `/api/admin/feature-flags` endpoints with proper authentication and CRUD operations
  - **Job Details Integration**: Used feature flags to dynamically hide incomplete tabs
  - **Future-Ready**: Added flags for all planned backlog features (pipeline editor, prompt versioning, etc.)
- **Status**: Resolved - Feature flags now fully integrated with database and manageable through admin panel

## Bug Entry: [2025-01-27]
- **ID**: BUG-019
- **Description**: NotificationService throwing localStorage error during server-side rendering (SSR)
- **Discovered**: During Sprint 11 admin panel testing - console warnings appearing on page loads
- **Context**: Sprint 11, NotificationService SSR compatibility issue
- **Technical Root Cause**: 
  - NotificationService constructor calls loadPreferences() which accesses localStorage
  - localStorage is only available in browser environment, not during SSR
  - Next.js SSR attempts to run notification service on server, causing ReferenceError
- **Error Pattern**: "ReferenceError: localStorage is not defined" during SSR
- **User Experience Impact**: 
  - Console warnings on every page load
  - Potential hydration mismatches between server and client
  - Degraded developer experience with noisy console
- **Fix**: Added browser environment checks to localStorage access methods:
  ```typescript
  private loadPreferences(): NotificationPreferences {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return DEFAULT_PREFERENCES;
    }
    // ... rest of method
  }
  
  private savePreferences() {
    // Check if we're in a browser environment  
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    // ... rest of method
  }
  ```
- **Technical Benefits**:
  - **SSR Compatibility**: NotificationService now works seamlessly during server-side rendering
  - **Graceful Fallbacks**: Uses default preferences when localStorage unavailable
  - **Clean Console**: Eliminates localStorage warnings during development and production
  - **Hydration Safety**: Prevents server/client mismatches in notification preferences
- **Status**: Resolved - NotificationService now SSR-compatible with proper browser checks
- **Files Modified**: lib/services/notificationService.ts (loadPreferences and savePreferences methods)
- **Sprint**: Sprint 11 - Advanced Job Processing & Results Enhancement
