import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppearanceMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const APPEARANCE_STORAGE_KEY = 'lm-appearance'
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

interface AppearanceContextValue {
  mode: AppearanceMode
  resolvedTheme: ResolvedTheme
  setMode: (nextMode: AppearanceMode) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

function isAppearanceMode(value: string | null): value is AppearanceMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function getStoredAppearanceMode(): AppearanceMode | null {
  if (typeof window === 'undefined') {
    return null
  }

  const saved = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
  return isAppearanceMode(saved) ? saved : null
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(SYSTEM_DARK_QUERY).matches
}

function resolveTheme(mode: AppearanceMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'dark') {
    return 'dark'
  }
  if (mode === 'light') {
    return 'light'
  }
  return systemPrefersDark ? 'dark' : 'light'
}

function setThemeAttribute(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.setAttribute('data-theme', theme)
}

function persistMode(mode: AppearanceMode): void {
  if (typeof window === 'undefined') {
    return
  }

  if (mode === 'system') {
    window.localStorage.removeItem(APPEARANCE_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, mode)
}

export function initializeAppearance(): AppearanceMode {
  const mode = getStoredAppearanceMode() ?? 'system'
  setThemeAttribute(resolveTheme(mode, getSystemPrefersDark()))
  return mode
}

interface AppearanceProviderProps {
  children: ReactNode
}

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  const [mode, setModeState] = useState<AppearanceMode>(() => getStoredAppearanceMode() ?? 'system')
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemPrefersDark())

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange)
      return () => mediaQuery.removeEventListener('change', onChange)
    }

    mediaQuery.addListener(onChange)
    return () => mediaQuery.removeListener(onChange)
  }, [])

  const resolvedTheme = useMemo(
    () => resolveTheme(mode, systemPrefersDark),
    [mode, systemPrefersDark],
  )

  useEffect(() => {
    setThemeAttribute(resolvedTheme)
  }, [resolvedTheme])

  const setMode = useCallback((nextMode: AppearanceMode) => {
    persistMode(nextMode)
    setModeState(nextMode)
  }, [])

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme, setMode],
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext)
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider')
  }
  return context
}
