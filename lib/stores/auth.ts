import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { Database } from '../supabase'
import { createSupabaseClient } from '@/lib/supabase'

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
        // Clear persisted storage (no longer needed, but keep for safety)
        localStorage.removeItem('auth-storage');
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
        // Clear persisted storage (no longer needed, but keep for safety)
        localStorage.removeItem('auth-storage');
      }
      set({
        user: null,
        profile: null,
        loading: true,
        initialized: false,
      })
    },
  })
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

// Force logout utility for SSR compatibility
export const forceLogout = async () => {
  if (typeof window === 'undefined') {
    console.log('forceLogout: Window undefined, skipping')
    return
  }
  
  try {
    console.log('forceLogout: Starting complete logout process')
    
    // 1. Sign out from Supabase
    const supabase = createSupabaseClient()
    console.log('forceLogout: Calling supabase.auth.signOut()')
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('forceLogout: Supabase signOut error:', error)
    } else {
      console.log('forceLogout: Supabase signOut successful')
    }
    
    // 2. Clear all local state immediately
    console.log('forceLogout: Clearing localStorage and sessionStorage')
    localStorage.clear()
    sessionStorage.clear()
    
    // 3. Reset auth store
    console.log('forceLogout: Resetting auth store')
    useAuthStore.getState().reset()
    
    // 4. Force page reload to ensure SSR/client sync
    console.log('forceLogout: Redirecting to /auth/login')
    window.location.replace('/auth/login')
  } catch (error) {
    console.error('forceLogout: Error during logout, forcing redirect anyway:', error)
    localStorage.clear()
    sessionStorage.clear()
    useAuthStore.getState().reset()
    console.log('forceLogout: Force redirecting to /auth/login after error')
    window.location.replace('/auth/login')
  }
} 