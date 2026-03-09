import { useEffect, useMemo, useState } from 'react'
import { APP_ROUTES } from './routes'

export type AppRoute =
  | { kind: 'onboarding' }
  | { kind: 'record' }
  | { kind: 'memories' }
  | { kind: 'memory-detail'; memoryId: string }
  | { kind: 'invite-accept' }
  | { kind: 'settings' }
  | { kind: 'family' }
  | { kind: 'account' }
  | { kind: 'privacy' }
  | { kind: 'not-found' }

function normalizePath(pathname: string): string {
  const trimmed = pathname.trim()
  const basePath = trimmed.length === 0 ? '/' : trimmed
  const normalizedSlashes = basePath.replace(/\/{2,}/g, '/')
  const withoutTrailingSlash =
    normalizedSlashes.length > 1 && normalizedSlashes.endsWith('/')
      ? normalizedSlashes.slice(0, -1)
      : normalizedSlashes
  const normalized = withoutTrailingSlash.toLowerCase()

  if (normalized === '/') {
    return APP_ROUTES.record
  }
  return normalized
}

function resolveRoute(pathname: string): AppRoute {
  if (pathname === APP_ROUTES.onboarding) {
    return { kind: 'onboarding' }
  }
  if (pathname === APP_ROUTES.record) {
    return { kind: 'record' }
  }
  if (pathname === APP_ROUTES.memories) {
    return { kind: 'memories' }
  }
  if (pathname === APP_ROUTES.inviteAccept) {
    return { kind: 'invite-accept' }
  }
  if (pathname === APP_ROUTES.settings) {
    return { kind: 'settings' }
  }
  if (pathname === APP_ROUTES.settingsFamily) {
    return { kind: 'family' }
  }
  if (pathname === APP_ROUTES.settingsAccount) {
    return { kind: 'account' }
  }
  if (pathname === APP_ROUTES.settingsPrivacy) {
    return { kind: 'privacy' }
  }

  const detailMatch = pathname.match(new RegExp(`^${APP_ROUTES.memories}/([0-9a-f-]+)$`))
  if (detailMatch) {
    return { kind: 'memory-detail', memoryId: detailMatch[1] }
  }

  return { kind: 'not-found' }
}

export function useAppRouter() {
  const [pathname, setPathname] = useState<string>(() => normalizePath(window.location.pathname))

  useEffect(() => {
    if (window.location.pathname === APP_ROUTES.root) {
      window.history.replaceState({}, '', APP_ROUTES.record)
    }

    const onPopState = () => {
      setPathname(normalizePath(window.location.pathname || APP_ROUTES.record))
    }

    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  const route = useMemo(() => resolveRoute(pathname), [pathname])

  const navigate = (nextPath: string) => {
    const normalizedNextPath = normalizePath(nextPath)
    const normalizedCurrentPath = normalizePath(window.location.pathname)
    if (normalizedNextPath === normalizedCurrentPath) {
      return
    }
    window.history.pushState({}, '', normalizedNextPath)
    setPathname(normalizedNextPath)
  }

  return { pathname, route, navigate }
}
