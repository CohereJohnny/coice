'use client'

import { AuthGuard } from './components/auth/AuthGuard'
import { useDashboardData } from './hooks/useDashboardData'
import { StatCard, QuickActions, RecentActivity } from './components/dashboard'

export default function Home() {
  const {
    stats,
    recentActivity,
    isStatsLoading,
    isActivityLoading,
    statsError,
    activityError,
    isRealTimeConnected,
    realTimeError,
    refreshAll,
  } = useDashboardData();

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <p className="text-muted-foreground">
                Welcome to Coice - Your AI-powered image catalog management platform
              </p>
              {/* Real-time status indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isRealTimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-muted-foreground">
                  {isRealTimeConnected ? 'Live updates active' : 'Live updates disconnected'}
                </span>
                {realTimeError && (
                  <span className="text-xs text-red-500" title={realTimeError}>
                    ⚠️
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={refreshAll}
            className="flex items-center space-x-2 px-3 py-2 text-sm border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Refresh dashboard data"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Libraries"
            value={stats.libraryCount}
            description={stats.libraryCount === 0 ? "No libraries created yet" : `${stats.libraryCount} image ${stats.libraryCount === 1 ? 'library' : 'libraries'}`}
            isLoading={isStatsLoading}
            error={statsError}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            }
          />

          <StatCard
            title="Active Jobs"
            value={stats.activeJobCount}
            description={stats.activeJobCount === 0 ? "No analysis jobs running" : `${stats.activeJobCount} ${stats.activeJobCount === 1 ? 'job' : 'jobs'} in progress`}
            isLoading={isStatsLoading}
            error={statsError}
            variant={stats.activeJobCount > 0 ? "warning" : "default"}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="m22 21-3-3m0 0a5.5 5.5 0 1 0-7.78-7.78 5.5 5.5 0 0 0 7.78 7.78Z" />
              </svg>
            }
          />

          <StatCard
            title="Images"
            value={stats.totalImageCount}
            description={stats.totalImageCount === 0 ? "No images uploaded yet" : `${stats.totalImageCount} ${stats.totalImageCount === 1 ? 'image' : 'images'} total`}
            isLoading={isStatsLoading}
            error={statsError}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            }
          />

          <StatCard
            title="Recent Jobs"
            value={stats.recentJobCount}
            description={stats.recentJobCount === 0 ? "No jobs in last 24 hours" : `${stats.recentJobCount} ${stats.recentJobCount === 1 ? 'job' : 'jobs'} today`}
            isLoading={isStatsLoading}
            error={statsError}
            variant={stats.recentJobCount > 0 ? "success" : "default"}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            }
          />
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Recent Activity and Sprint Status */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentActivity
            activities={recentActivity}
            isLoading={isActivityLoading}
            error={activityError}
            maxItems={6}
          />

          {/* Sprint Status */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sprint 10: Real-time Notifications</h3>
              <div className="text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Phase 1: Dashboard Modernization</span>
                <span className="text-sm font-medium text-blue-600">🚧 In Progress</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Phase 2: Supabase Real-time Integration</span>
                <span className="text-sm font-medium text-muted-foreground">⏳ Pending</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Phase 3: Toast Notification System</span>
                <span className="text-sm font-medium text-muted-foreground">⏳ Pending</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Phase 4: Enhanced Job Progress</span>
                <span className="text-sm font-medium text-muted-foreground">⏳ Pending</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Completed Sprints</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Sprint 9: Cohere AI Integration & Job Foundation</span>
                  <span className="text-green-600">✅ Complete</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sprint 8: Prompt & Pipeline Management</span>
                  <span className="text-green-600">✅ Complete</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sprint 7: Image Viewing - Carousel & Full-Screen</span>
                  <span className="text-green-600">✅ Complete</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sprint 6: Image Viewing - Card & List Views</span>
                  <span className="text-green-600">✅ Complete</span>
                </div>
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">... and 5 more sprints</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
