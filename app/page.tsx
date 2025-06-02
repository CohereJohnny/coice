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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your image analysis projects and recent activity
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Refresh button */}
            <button
              onClick={refreshAll}
              className="flex items-center space-x-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors"
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
            
            {/* Real-time connection indicator */}
            <div className="flex items-center space-x-2 text-sm">
              <div className={`h-2 w-2 rounded-full ${
                isRealTimeConnected 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-red-500'
              }`} />
              <span className="text-muted-foreground">
                {isRealTimeConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Error States */}
        {(statsError || activityError || realTimeError) && (
          <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-4">
            <div className="text-sm text-destructive">
              {statsError && <div>Stats Error: {statsError}</div>}
              {activityError && <div>Activity Error: {activityError}</div>}
              {realTimeError && <div>Real-time Error: {realTimeError}</div>}
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Libraries"
            value={stats.libraryCount.toString()}
            description="Active image collections"
            isLoading={isStatsLoading}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
          <StatCard
            title="Total Images"
            value={stats.totalImageCount.toString()}
            description="Across all libraries"
            isLoading={isStatsLoading}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            title="Active Jobs"
            value={stats.activeJobCount.toString()}
            description="Currently processing"
            isLoading={isStatsLoading}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            title="Recent Jobs"
            value={stats.recentJobCount.toString()}
            description="Completed this week"
            isLoading={isStatsLoading}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>

        {/* Sprint Status */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Sprint Status */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sprint 13: Admin Panel & User Management</h3>
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
            <p className="text-sm text-muted-foreground mb-4">
              Complete admin functionality, user management, and access control features
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Sprint 11 Complete</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full w-full"></div>
                  </div>
                  <span className="text-xs text-green-600 font-medium">100%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sprint 12 Complete</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full w-full"></div>
                  </div>
                  <span className="text-xs text-green-600 font-medium">100%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sprint 13 In Progress</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full w-[65%]"></div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">65%</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                <strong>Sprint 12 Achievements:</strong> Search functionality with Cohere multimodal embeddings, advanced filtering, search result highlighting, AI-powered similarity search, comprehensive search interface
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <RecentActivity 
              activities={recentActivity} 
              isLoading={isActivityLoading}
            />
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
