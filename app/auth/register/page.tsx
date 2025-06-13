'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/stores/auth'
import { RegisterForm } from '@/app/components/auth/RegisterForm'
import { useEffect } from 'react'
import FeatureFlagTest from '@/app/components/auth/FeatureFlagTest'

export default function RegisterPage() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return <div style={{ color: 'orange', fontWeight: 'bold', textAlign: 'center' }}>DEBUG: Loading state</div>;
  }

  if (isAuthenticated) {
    return <div style={{ color: 'green', fontWeight: 'bold', textAlign: 'center' }}>DEBUG: Authenticated state</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="w-full max-w-md">
        <FeatureFlagTest />
        <RegisterForm
          onSuccess={() => router.push('/auth/login')}
          onSwitchToLogin={() => router.push('/auth/login')}
        />
      </div>
    </div>
  )
} 