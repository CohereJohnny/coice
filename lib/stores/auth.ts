import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'
import { Database } from '../supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  signOut: () => void
  reset: () => void
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  user: null,
  profile: null,
  loading: true,
  initialized: false,
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setUser: (user) => {
        set({ user })
      },
      
      setProfile: (profile) => {
        set({ profile })
      },
      
      setLoading: (loading) => {
        set({ loading })
      },
      
      setInitialized: (initialized) => {
        set({ initialized })
      },
      
      signOut: () => {
        set({
          user: null,
          profile: null,
          loading: false,
          initialized: true,
        })
      },
      
      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        initialized: state.initialized,
      }),
    }
  )
)

// Computed selectors
export const useAuth = () => {
  const { user, profile, loading, initialized } = useAuthStore()
  
  return {
    user,
    profile,
    loading,
    initialized,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
    isEndUser: profile?.role === 'end_user',
  }
}

// Auth actions
export const useAuthActions = () => {
  const { setUser, setProfile, setLoading, setInitialized, signOut, reset } = useAuthStore()
  
  return {
    setUser,
    setProfile,
    setLoading,
    setInitialized,
    signOut,
    reset,
  }
} 