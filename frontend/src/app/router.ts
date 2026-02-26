import { useEffect, useMemo, useState } from 'react'

export type AppRoute =
  | { kind: 'record' }
  | { kind: 'memories' }
  | { kind: 'memory-detail'; memoryId: string }
  | { kind: 'not-found' }

function normalizePath(pathname: string): string {
  if (pathname === '/') {
    return '/record'
  }
  return pathname
}

function resolveRoute(pathname: string): AppRoute {
  if (pathname === '/record') {
    return { kind: 'record' }
  }
  if (pathname === '/memories') {
    return { kind: 'memories' }
  }

  const detailMatch = pathname.match(/^\/memories\/([0-9a-fA-F-]+)$/)
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
    if (nextPath === window.location.pathname) {
      return
    }
    window.history.pushState({}, '', nextPath)
    setPathname(nextPath)
  }

  return { pathname, route, navigate }
}
