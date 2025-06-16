import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Server logout error:', error)
    }
    
    // Create response with headers to clear all possible auth cookies
    const response = NextResponse.json({
      message: 'Logged out successfully',
      success: true
    })
    
    // Clear all possible auth-related cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      'supabase.auth.token',
      'auth-storage'
    ]
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.delete(cookieName)
      response.cookies.set(cookieName, '', { 
        expires: new Date(0),
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    })
    
    return response
  } catch (error) {
    console.error('Logout API error:', error)
    // Return success anyway to allow client-side cleanup
    const response = NextResponse.json({
      message: 'Logged out successfully',
      success: true
    })
    
    // Still clear cookies even if there was an error
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      'supabase.auth.token',
      'auth-storage'
    ]
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.delete(cookieName)
    })
    
    return response
  }
} 