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
        if (typeof window !== 'undefined') {
          console.log('AuthStore: setUser called with:', user?.email || 'null')
        }
        set({ user })
      },
      
      setProfile: (profile) => {
        if (typeof window !== 'undefined') {
          console.log('AuthStore: setProfile called with:', profile?.email || 'null')
        }
        set({ profile })
      },
      
      setLoading: (loading) => {
        if (typeof window !== 'undefined') {
          console.log('AuthStore: setLoading called with:', loading)
        }
        set({ loading })
      },
      
      setInitialized: (initialized) => {
        if (typeof window !== 'undefined') {
          console.log('AuthStore: setInitialized called with:', initialized)
        }
        set({ initialized, loading: false })
      },
      
      signOut: () => {
        if (typeof window !== 'undefined') {
          console.log('AuthStore: signOut called')
        }
        set({
          user: null,
          profile: null,
          loading: false,
          initialized: true,
        })
      },
      
      reset: () => {
        if (typeof window !== 'undefined') {
          console.log('AuthStore: reset called')
        }
        set({
          user: null,
          profile: null,
          loading: true,
          initialized: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window !== 'undefined') {
          console.log('AuthStore: Rehydrating from storage:', {
            hasUser: !!state?.user,
            hasProfile: !!state?.profile,
            userEmail: state?.user?.email
          })
        }
        // Always reset loading and initialized states after rehydration
        return {
          ...state,
          loading: true,
          initialized: false,
        }
      },
    }
  )
)

// Computed selectors
export const useAuth = () => {
  const { user, profile, loading, initialized } = useAuthStore()
  
  const authState = {
    user,
    profile,
    loading,
    initialized,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
    isEndUser: profile?.role === 'end_user',
  }
  
  if (typeof window !== 'undefined') {
    console.log('useAuth: Current auth state:', {
      loading: authState.loading,
      initialized: authState.initialized,
      isAuthenticated: authState.isAuthenticated,
      userEmail: authState.user?.email,
      profileEmail: authState.profile?.email
    })
  }
  
  return authState
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