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

  useEffect(() => {
    if (!initialized) {
      return
    }

    // If auth is not required, always render
    if (!requireAuth) {
      setShouldRender(true)
      return
    }

    // If auth is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo)
      return
    }

    // If specific role is required
    if (requiredRole && profile) {
      const hasRequiredRole = Array.isArray(requiredRole)
        ? requiredRole.includes(profile.role)
        : profile.role === requiredRole

      if (!hasRequiredRole) {
        // Redirect to unauthorized page or home
        router.push('/unauthorized')
        return
      }
    }

    setShouldRender(true)
  }, [initialized, isAuthenticated, profile, requireAuth, requiredRole, router, redirectTo])

  // Show loading while checking auth state
  if (loading || !initialized) {
    return <>{fallback}</>
  }

  // Don't render if auth check failed
  if (!shouldRender) {
    return <>{fallback}</>
  }

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