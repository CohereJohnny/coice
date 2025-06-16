import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createSupabaseServerClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
      }

      if (data.user) {
        // Check if profile exists, create if not
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (profileCheckError && profileCheckError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const displayName = 
            data.user.user_metadata?.full_name || 
            data.user.user_metadata?.name ||
            data.user.user_metadata?.display_name ||
            data.user.email?.split('@')[0] || 
            'User'

          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              display_name: displayName,
              role: 'end_user',
            })

          if (profileError) {
            console.error('Error creating OAuth profile:', profileError)
            // Don't fail the auth process for profile creation errors
          }
        } else if (profileCheckError) {
          console.error('Error checking profile:', profileCheckError)
        }

        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('Authentication failed')}`)
    }
  }

  // Return the user to login with an error message
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('Invalid authentication code')}`)
} 