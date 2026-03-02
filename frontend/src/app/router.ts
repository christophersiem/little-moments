import { useEffect, useMemo, useState } from 'react'

export type AppRoute =
  | { kind: 'record' }
  | { kind: 'memories' }
  | { kind: 'memory-detail'; memoryId: string }
  | { kind: 'settings' }
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
    return '/record'
  }
  return normalized
}

function resolveRoute(pathname: string): AppRoute {
  if (pathname === '/record') {
    return { kind: 'record' }
  }
  if (pathname === '/memories') {
    return { kind: 'memories' }
  }
  if (pathname === '/settings') {
    return { kind: 'settings' }
  }
  if (pathname === '/settings/account') {
    return { kind: 'account' }
  }
  if (pathname === '/settings/privacy') {
    return { kind: 'privacy' }
  }

  const detailMatch = pathname.match(/^\/memories\/([0-9a-f-]+)$/)
  if (detailMatch) {
    return { kind: 'memory-detail', memoryId: detailMatch[1] }
  }

  return { kind: 'not-found' }
}

export function useAppRouter() {
  const [pathname, setPathname] = useState<string>(() => normalizePath(window.location.pathname))

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/record')
    }

    const onPopState = () => {
      setPathname(normalizePath(window.location.pathname || '/record'))
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
