'use client'

import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { useLayout } from './LayoutProvider'
import { useAuth } from '@/lib/stores/auth'

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const { isSidebarCollapsed, isMobile, toggleSidebar } = useLayout()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        {/* Sidebar - only show when authenticated */}
        {isAuthenticated && (
          <>
            {/* Mobile overlay */}
            {isMobile && !isSidebarCollapsed && (
              <div
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={toggleSidebar}
              />
            )}
            
            {/* Sidebar */}
            <div className={`
              ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
              ${isMobile && isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}
              transition-transform duration-300 ease-in-out
            `}>
              <Sidebar
                isCollapsed={!isMobile && isSidebarCollapsed}
                onToggle={toggleSidebar}
              />
            </div>
          </>
        )}

        {/* Main content */}
        <main className={`
          flex-1 overflow-auto
          ${isAuthenticated && !isMobile && !isSidebarCollapsed ? 'ml-0' : ''}
          ${isAuthenticated && !isMobile && isSidebarCollapsed ? 'ml-0' : ''}
        `}>
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 