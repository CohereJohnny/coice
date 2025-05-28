'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/stores/auth'
import { Button } from '@/components/ui/button'
import { CatalogNavigation } from '@/components/navigation/CatalogNavigation'

interface SidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { isAuthenticated, profile } = useAuth()
  const [expandedSections, setExpandedSections] = useState<string[]>(['catalogs'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const navigation = []

  // Add admin/manager specific navigation
  if (profile?.role === 'admin' || profile?.role === 'manager') {
    navigation.push({
      name: 'Pipelines',
      href: '/pipelines',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    })
  }

  if (profile?.role === 'admin') {
    navigation.push({
      name: 'Admin',
      href: '/admin',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    })
  }

  return (
    <div className={`flex h-full flex-col border-r bg-background transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Sidebar Header */}
      <div className="flex h-14 items-center border-b px-4">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold">Navigation</h2>
        )}
        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={`h-8 w-8 p-0 ${isCollapsed ? 'mx-auto' : 'ml-auto'}`}
          >
            <svg
              className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
        )}
      </div>

      {/* Catalogs Section */}
      <div className="flex-1">
        <div className="border-b pb-2 mb-2">
          {!isCollapsed && (
            <div className="px-4 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">Catalogs</h3>
            </div>
          )}
          <CatalogNavigation isCollapsed={isCollapsed} />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t">
        {/* Navigation for role-specific items */}
        {navigation.length > 0 && (
          <nav className="space-y-1 p-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start ${isCollapsed ? 'px-2' : 'px-3'}`}
                    size="sm"
                  >
                    {item.icon}
                    {!isCollapsed && <span className="ml-2">{item.name}</span>}
                  </Button>
                </Link>
              )
            })}
          </nav>
        )}

        {/* GCS Buckets Section */}
        <div className="p-2">
          <Button
            variant="ghost"
            className={`w-full justify-start ${isCollapsed ? 'px-2' : 'px-3'}`}
            size="sm"
            onClick={() => !isCollapsed && toggleSection('buckets')}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            {!isCollapsed && (
              <>
                <span className="ml-2">GCS Buckets</span>
                <svg
                  className={`ml-auto h-4 w-4 transition-transform ${
                    expandedSections.includes('buckets') ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </Button>

          {/* Bucket Items - Placeholder for now */}
          {!isCollapsed && expandedSections.includes('buckets') && (
            <div className="ml-4 mt-1 space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                coice-main
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                legacy-images
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 