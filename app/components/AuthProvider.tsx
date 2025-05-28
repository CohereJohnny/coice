'use client'

import { useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuthActions } from '@/lib/stores/auth'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setProfile, setLoading, setInitialized, reset } = useAuthActions()
  
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

    // Validate session with server to check for sync issues
    const validateSessionWithServer = async () => {
      try {
        const response = await fetch('/api/auth/debug')
        const serverAuth = await response.json()
        return serverAuth
      } catch (error) {
        console.error('AuthProvider: Failed to validate session with server:', error)
        return null
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Getting initial session')
        setLoading(true)
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error)
          reset() // Clear persisted state
          finishInit()
          return
        }
        
        console.log('AuthProvider: Client session result:', { hasSession: !!session, userEmail: session?.user?.email })
        
        // Validate with server to check for sync issues
        const serverAuth = await validateSessionWithServer()
        console.log('AuthProvider: Server auth state:', serverAuth)
        
        // Check for sync mismatch
        const clientHasSession = !!session?.user
        const serverHasSession = !!serverAuth?.user
        
        if (clientHasSession !== serverHasSession) {
          console.warn('AuthProvider: Session sync mismatch detected!', {
            client: clientHasSession,
            server: serverHasSession
          })
          
          // If server says no session but client thinks there is one, clear client state
          if (clientHasSession && !serverHasSession) {
            console.log('AuthProvider: Clearing client state due to server mismatch')
            await supabase.auth.signOut()
            reset()
            finishInit()
            return
          }
        }
        
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
        reset() // Clear persisted state on error
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
          if (event === 'SIGNED_OUT' || !session?.user) {
            console.log('AuthProvider: User signed out, clearing all state')
            setUser(null)
            setProfile(null)
            // Clear any persisted auth data
            localStorage.removeItem('auth-storage')
            sessionStorage.clear()
          } else if (session?.user) {
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
  }, [setUser, setProfile, setLoading, setInitialized, reset])
  
  return <>{children}</>
} 