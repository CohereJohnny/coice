import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
}

interface ThemeActions {
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

type ThemeStore = ThemeState & ThemeActions

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') return getSystemTheme()
  return theme
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light', // Default to light theme
      resolvedTheme: 'light',
      
      setTheme: (theme) => {
        const resolvedTheme = resolveTheme(theme)
        set({ theme, resolvedTheme })
        
        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(resolvedTheme)
        }
      },
      
      toggleTheme: () => {
        const { theme } = get()
        const newTheme = theme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          // Apply theme on rehydration
          const resolvedTheme = resolveTheme(state.theme)
          state.resolvedTheme = resolvedTheme
          
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(resolvedTheme)
          
          // Listen for system theme changes if using system theme
          if (state.theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = () => {
              const newResolvedTheme = getSystemTheme()
              state.resolvedTheme = newResolvedTheme
              root.classList.remove('light', 'dark')
              root.classList.add(newResolvedTheme)
            }
            mediaQuery.addEventListener('change', handleChange)
          }
        }
      },
    }
  )
)

// Hook for components
export const useTheme = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeStore()
  
  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  }
} 