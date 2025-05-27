'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuthActions } from '@/lib/stores/auth'
import { Database } from '@/lib/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
})

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  const { setUser: setStoreUser, setProfile: setStoreProfile, setLoading: setStoreLoading, setInitialized } = useAuthActions()
  
  useEffect(() => {
    const supabase = createSupabaseClient()
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          setStoreLoading(false)
          setInitialized(true)
          return
        }
        
        if (session?.user) {
          setUser(session.user)
          setStoreUser(session.user)
          
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profileError) {
            console.error('Error fetching profile:', profileError)
          } else if (profileData) {
            setProfile(profileData)
            setStoreProfile(profileData)
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
        setStoreLoading(false)
        setInitialized(true)
      }
    }
    
    getInitialSession()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          setStoreUser(session.user)
          
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profileError) {
            console.error('Error fetching profile:', profileError)
            setProfile(null)
            setStoreProfile(null)
          } else if (profileData) {
            setProfile(profileData)
            setStoreProfile(profileData)
          }
        } else {
          setUser(null)
          setProfile(null)
          setStoreUser(null)
          setStoreProfile(null)
        }
        
        setLoading(false)
        setStoreLoading(false)
        setInitialized(true)
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [setStoreUser, setStoreProfile, setStoreLoading, setInitialized])
  
  const value = {
    user,
    profile,
    loading,
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 