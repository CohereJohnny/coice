'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/stores/auth'
import { createSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Search, 
  Settings, 
  User, 
  LogOut, 
  Moon, 
  Sun,
  ChevronDown
} from 'lucide-react'

export function Navbar() {
  const { user, profile, isAuthenticated, isAdmin, isManager } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast.error('Error signing out')
      } else {
        toast.success('Signed out successfully')
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('An unexpected error occurred')
    }
    setShowUserMenu(false)
  }

  const toggleTheme = () => {
    setIsDark(!isDark)
    // TODO: Implement theme switching logic
    toast.info('Theme switching coming soon!')
  }

  return (
    <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="flex h-16 items-center px-6">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-xl">Coice</span>
          </Link>
        </div>

        {/* Navigation Links - Only show if authenticated */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center space-x-6 ml-8">
            <Link 
              href="/libraries" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Libraries
            </Link>
            <Link 
              href="/analysis" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Analysis
            </Link>
            <Link 
              href="/search" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Search
            </Link>
            {(isAdmin || isManager) && (
              <Link 
                href="/pipelines" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pipelines
              </Link>
            )}
            {isAdmin && (
              <Link 
                href="/admin" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin
              </Link>
            )}
          </div>
        )}

        {/* Right side controls */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Search - Only show if authenticated */}
          {isAuthenticated && (
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Button>
          )}

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User menu or auth buttons */}
          {isAuthenticated ? (
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center space-x-2 h-9"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-medium">
                    {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium">
                  {profile?.display_name || user?.email?.split('@')[0] || 'User'}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover p-1 shadow-md z-50">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground border-b mb-1">
                    <div className="font-medium text-foreground">
                      {profile?.display_name || user?.email?.split('@')[0]}
                    </div>
                    <div className="text-xs">{user?.email}</div>
                    <div className="text-xs capitalize">{profile?.role}</div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-8 px-2"
                    onClick={() => {
                      router.push('/profile')
                      setShowUserMenu(false)
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-8 px-2"
                    onClick={() => {
                      router.push('/settings')
                      setShowUserMenu(false)
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  
                  <div className="border-t my-1" />
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-8 px-2 text-red-600 hover:text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={() => router.push('/auth/login')}
              >
                Sign In
              </Button>
              <Button
                onClick={() => router.push('/auth/register')}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  )
} 