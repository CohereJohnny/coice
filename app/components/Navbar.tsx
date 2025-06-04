'use client'

import Link from 'next/link'
import { useAuth, useAuthActions } from '@/lib/stores/auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NotificationCenter } from '@/components/ui/NotificationCenter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlobalSearchModal } from '@/components/search'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Image from 'next/image'

export function Navbar() {
  const { user, profile, isAuthenticated } = useAuth()
  const { reset } = useAuthActions()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)

  const handleSignOut = async () => {
    try {
      const supabase = createSupabaseClient()
      
      // Sign out from Supabase first
      await supabase.auth.signOut()
      
      // Reset auth store
      reset()
      
      // Clear all client-side storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Try to call the logout API to clear server-side session
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
        })
      } catch (apiError) {
        console.log('Logout API error (continuing anyway):', apiError)
      }
      
      // Force redirect to login
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Sign out error:', error)
      // Force logout anyway
      reset()
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/auth/login'
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        {/* Logo and Brand */}
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image 
              src="/assets/coice.svg" 
              alt="COICE" 
              width={32} 
              height={32} 
              className="h-8 w-8 ml-2"
              priority
            />
            <span className="hidden font-bold sm:inline-block">Coice</span>
          </Link>
        </div>

        {/* Mobile Logo */}
        <div className="mr-4 flex md:hidden">
          <Link href="/" className="flex items-center space-x-2">
            <Image 
              src="/assets/coice.svg" 
              alt="COICE" 
              width={32} 
              height={32} 
              className="h-8 w-8 ml-2"
              priority
            />
            <span className="font-bold">Coice</span>
          </Link>
        </div>

        {/* Main Navigation */}
        {isAuthenticated && (
          <div className="flex flex-1 items-center space-x-2 md:justify-start">
            <nav className="flex items-center space-x-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Dashboard
                </Button>
              </Link>
              <Link href="/libraries">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Libraries
                </Button>
              </Link>
              <Link href="/prompts">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Prompts
                </Button>
              </Link>
              <Link href="/analysis">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analysis
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </Button>
              </Link>
            </nav>
          </div>
        )}

        {/* Right Side Controls */}
        <div className="flex items-center space-x-3 ml-auto">
          {/* Global Search Button - only show when authenticated */}
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearchModal(true)}
              className="hidden md:flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden lg:inline">Quick Search</span>
              <Badge variant="secondary" className="text-xs ml-1">⌘K</Badge>
            </Button>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification Center - only show when authenticated */}
          {isAuthenticated && (
            <NotificationCenter
              open={showNotifications}
              onOpenChange={setShowNotifications}
            />
          )}

          {/* User Controls */}
          {isAuthenticated ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="relative h-10 w-10 rounded-full p-0"
              >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {profile?.display_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              </Button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover p-1 shadow-md">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {profile?.display_name || user?.email}
                  </div>
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    {profile?.role || 'User'}
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsProfileOpen(false)
                      // Navigate to profile settings
                    }}
                  >
                    Profile Settings
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => {
                      setIsProfileOpen(false)
                      handleSignOut()
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        open={showSearchModal}
        onOpenChange={setShowSearchModal}
      />
    </nav>
  )
} 