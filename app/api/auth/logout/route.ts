import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Logout error:', error)
      // Even if there's an error, we'll return success to clear client state
    }
    
    // Create response with headers to clear cookies
    const response = NextResponse.json({
      message: 'Logged out successfully',
    })
    
    // Clear any auth cookies
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    // Return success anyway to allow client-side cleanup
    return NextResponse.json({
      message: 'Logged out successfully',
    })
  }
} 