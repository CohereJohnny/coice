'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/stores/auth'
import { LoginForm } from '@/app/components/auth/LoginForm'
import { useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="w-full max-w-md">
        <LoginForm
          onSuccess={() => router.push('/')}
          onSwitchToRegister={() => router.push('/auth/register')}
        />
      </div>
    </div>
  )
} 