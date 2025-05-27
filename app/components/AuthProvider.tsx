'use client'

import { useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuthActions } from '@/lib/stores/auth'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setProfile, setLoading, setInitialized } = useAuthActions()
  
  useEffect(() => {
    console.log('AuthProvider: Starting initialization')
    const supabase = createSupabaseClient()
    
    // Set a timeout to ensure initialization completes even if there are issues
    const initTimeout = setTimeout(() => {
      console.log('AuthProvider: Timeout reached, forcing initialization')
      setLoading(false)
      setInitialized(true)
    }, 5000) // 5 second timeout
    
    // Always ensure we set initialized, even if something fails
    const finishInit = () => {
      setLoading(false)
      setInitialized(true)
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Getting initial session')
        setLoading(true)
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error)
          setUser(null)
          setProfile(null)
          finishInit()
          return
        }
        
        console.log('AuthProvider: Session result:', { hasSession: !!session, userEmail: session?.user?.email })
        
        if (session?.user) {
          console.log('AuthProvider: Setting user from session')
          setUser(session.user)
          
          // Try to fetch user profile, but don't block on it
          try {
            console.log('AuthProvider: Fetching user profile')
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (profileError) {
              console.error('AuthProvider: Error fetching profile:', profileError)
              setProfile(null)
            } else if (profileData) {
              console.log('AuthProvider: Profile fetched successfully:', profileData.email)
              setProfile(profileData)
            }
          } catch (profileError) {
            console.error('AuthProvider: Profile fetch failed:', profileError)
            setProfile(null)
          }
        } else {
          console.log('AuthProvider: No session found, clearing user state')
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('AuthProvider: Error in getInitialSession:', error)
        setUser(null)
        setProfile(null)
      } finally {
        console.log('AuthProvider: Initialization complete, setting loading=false, initialized=true')
        clearTimeout(initTimeout)
        finishInit()
      }
    }
    
    getInitialSession()
    
    // Listen for auth changes
    console.log('AuthProvider: Setting up auth state change listener')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('AuthProvider: Auth state changed:', event, session?.user?.email)
        
        try {
          if (session?.user) {
            setUser(session.user)
            
            // Fetch user profile
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (profileError) {
              console.error('AuthProvider: Error fetching profile on auth change:', profileError)
              setProfile(null)
            } else if (profileData) {
              console.log('AuthProvider: Profile updated on auth change:', profileData.email)
              setProfile(profileData)
            }
          } else {
            console.log('AuthProvider: Clearing user state on auth change')
            setUser(null)
            setProfile(null)
          }
        } catch (error) {
          console.error('AuthProvider: Error in auth state change handler:', error)
        } finally {
          finishInit()
        }
      }
    )
    
    return () => {
      console.log('AuthProvider: Cleaning up auth subscription')
      clearTimeout(initTimeout)
      subscription.unsubscribe()
    }
  }, [setUser, setProfile, setLoading, setInitialized])
  
  return <>{children}</>
} 