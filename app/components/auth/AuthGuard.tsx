'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/stores/auth'
import { Database } from '@/lib/supabase'

type UserRole = Database['public']['Tables']['profiles']['Row']['role']

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredRole?: UserRole | UserRole[]
  redirectTo?: string
  fallback?: React.ReactNode
}

export function AuthGuard({
  children,
  requireAuth = true,
  requiredRole,
  redirectTo = '/auth/login',
  fallback = <div className="flex items-center justify-center min-h-screen">Loading...</div>
}: AuthGuardProps) {
  const { profile, loading, initialized, isAuthenticated } = useAuth()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)

  // Debug logging
  console.log('AuthGuard state:', { 
    loading, 
    initialized, 
    isAuthenticated, 
    profile: profile?.email,
    shouldRender 
  })

  useEffect(() => {
    console.log('AuthGuard useEffect triggered:', { initialized, isAuthenticated, requireAuth })
    
    if (!initialized) {
      console.log('Not initialized yet, waiting...')
      return
    }

    // If auth is not required, always render
    if (!requireAuth) {
      console.log('Auth not required, rendering')
      setShouldRender(true)
      return
    }

    // If auth is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      console.log('Auth required but not authenticated, redirecting to:', redirectTo)
      router.push(redirectTo)
      return
    }

    // If specific role is required
    if (requiredRole && profile) {
      const hasRequiredRole = Array.isArray(requiredRole)
        ? requiredRole.includes(profile.role)
        : profile.role === requiredRole

      if (!hasRequiredRole) {
        console.log('User does not have required role, redirecting to unauthorized')
        // Redirect to unauthorized page or home
        router.push('/unauthorized')
        return
      }
    }

    console.log('All checks passed, rendering children')
    setShouldRender(true)
  }, [initialized, isAuthenticated, profile, requireAuth, requiredRole, router, redirectTo])

  // Show loading while checking auth state
  if (loading || !initialized) {
    console.log('Showing loading fallback:', { loading, initialized })
    return <>{fallback}</>
  }

  // Don't render if auth check failed
  if (!shouldRender) {
    console.log('Should not render, showing fallback')
    return <>{fallback}</>
  }

  console.log('Rendering children')
  return <>{children}</>
}

// Convenience components for specific roles
export function AdminGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole="admin" {...props}>
      {children}
    </AuthGuard>
  )
}

export function ManagerGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole={['admin', 'manager']} {...props}>
      {children}
    </AuthGuard>
  )
}

export function EndUserGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole={['admin', 'manager', 'end_user']} {...props}>
      {children}
    </AuthGuard>
  )
} 