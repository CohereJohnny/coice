'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/stores/auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function Navbar() {
  const { user, profile, isAuthenticated } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })
      if (response.ok) {
        window.location.href = '/auth/login'
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo and Brand */}
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="hidden font-bold sm:inline-block">Coice</span>
          </Link>
        </div>

        {/* Mobile Logo */}
        <div className="mr-4 flex md:hidden">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="font-bold">Coice</span>
          </Link>
        </div>

        {/* Main Navigation */}
        {isAuthenticated && (
          <div className="flex flex-1 items-center space-x-2 md:justify-start">
            <nav className="flex items-center space-x-2">
              <Link href="/libraries">
                <Button variant="ghost" size="sm">
                  Libraries
                </Button>
              </Link>
              <Link href="/analysis">
                <Button variant="ghost" size="sm">
                  Analysis
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="ghost" size="sm">
                  Search
                </Button>
              </Link>
            </nav>
          </div>
        )}

        {/* Right Side Controls */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Controls */}
          {isAuthenticated ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="relative h-8 w-8 rounded-full"
              >
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
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
    </nav>
  )
} 