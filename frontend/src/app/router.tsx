import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { RouteNotFound } from '../components/RouteNotFound'
import { AuthGate } from '../features/auth/AuthGate'
import {
  acceptInvitation,
  createFamilyWithOwner,
  ensureDefaultChildForFamily,
  getFirstChildIdForFamily,
  listMyFamilies,
  type FamilySummary,
} from '../features/families/api'
import {
  clearActiveChildId,
  clearActiveFamilyId,
  clearCanRecord,
  getActiveChildId,
  clearPendingInviteToken,
  getActiveFamilyId,
  getCanRecord,
  getPendingInviteToken,
  setActiveFamilyId as persistActiveFamilyId,
  setActiveChildId as persistActiveChildId,
  setCanRecord as persistCanRecord,
  setPendingInviteToken,
} from '../features/families/localState'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AccountPage } from '../pages/AccountPage'
import { AcceptInvitePage } from '../pages/AcceptInvitePage'
import { FamilyPage } from '../pages/FamilyPage'
import { MemoriesPage } from '../pages/MemoriesPage'
import { MemoryDetailPage } from '../pages/MemoryDetailPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { PrivacyPage } from '../pages/PrivacyPage'
import { RecordPage } from '../pages/RecordPage'
import { SettingsPage } from '../pages/SettingsPage'
import { AppShell } from './AppShell'
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
  const basePath = trimmed.length === 0 ? APP_ROUTES.root : trimmed
  const normalizedSlashes = basePath.replace(/\/{2,}/g, '/')
  const withoutTrailingSlash =
    normalizedSlashes.length > 1 && normalizedSlashes.endsWith('/')
      ? normalizedSlashes.slice(0, -1)
      : normalizedSlashes
  const normalized = withoutTrailingSlash.toLowerCase()

  if (normalized === APP_ROUTES.root) {
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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Could not complete family onboarding.'
}

function parseInviteTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')?.trim() ?? ''
  return token.length > 0 ? token : null
}

function isUnconfirmedSession(nextSession: Session | null): boolean {
  if (!nextSession?.user) {
    return false
  }
  return !nextSession.user.email_confirmed_at
}

function resolveActiveFamily(memberships: FamilySummary[], preferredFamilyId?: string | null): string | null {
  if (memberships.length === 0) {
    return null
  }

  const preferred = preferredFamilyId?.trim() || getActiveFamilyId()
  if (preferred && memberships.some((membership) => membership.familyId === preferred)) {
    return preferred
  }

  return memberships[0].familyId
}

export function AppRouter() {
  const { pathname, route, navigate } = useAppRouter()
  const cachedFamilyId = getActiveFamilyId()
  const cachedChildId = getActiveChildId()
  const cachedCanRecord = getCanRecord()
  const [navigationLocked, setNavigationLocked] = useState(false)
  const [showNavigationHint, setShowNavigationHint] = useState(false)
  const [redirectToRecordOnLogin, setRedirectToRecordOnLogin] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [authError, setAuthError] = useState('')
  const [familyId, setFamilyId] = useState<string | null>(cachedFamilyId)
  const [childId, setChildId] = useState<string | null>(cachedChildId)
  const [familyReady, setFamilyReady] = useState(Boolean(cachedFamilyId && cachedChildId))
  const [familyError, setFamilyError] = useState('')
  const [canRecord, setCanRecord] = useState(cachedCanRecord ?? true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [families, setFamilies] = useState<FamilySummary[]>([])
  const [bootstrapTick, setBootstrapTick] = useState(0)
  const sessionUserId = session?.user.id ?? null

  useEffect(() => {
    if (route.kind !== 'record') {
      setNavigationLocked(false)
      setShowNavigationHint(false)
    }
  }, [route.kind])

  useEffect(() => {
    if (route.kind !== 'invite-accept') {
      return
    }
    const token = parseInviteTokenFromUrl()
    if (token) {
      setPendingInviteToken(token)
    }
  }, [route.kind])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return
      }
      if (error) {
        setAuthError(error.message)
      }
      if (isUnconfirmedSession(data.session ?? null)) {
        setAuthError('Please confirm your email address before signing in.')
        setSession(null)
      } else {
        setAuthError('')
        setSession(data.session ?? null)
      }
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_IN' && isUnconfirmedSession(nextSession)) {
        setAuthError('Please confirm your email address before signing in.')
        void supabase.auth.signOut()
        setSession(null)
        setRedirectToRecordOnLogin(false)
        return
      }
      if (event === 'SIGNED_IN') {
        setAuthError('')
        setRedirectToRecordOnLogin(true)
      }
      if (event === 'SIGNED_OUT') {
        setRedirectToRecordOnLogin(false)
      }
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessionUserId) {
      setFamilies([])
      setFamilyId(null)
      setChildId(null)
      setFamilyReady(false)
      setFamilyError('')
      setCanRecord(false)
      setNeedsOnboarding(false)
      return
    }

    let disposed = false
    const persistedFamilyId = getActiveFamilyId()
    const persistedChildId = getActiveChildId()
    const persistedCanRecord = getCanRecord()
    const hasCachedContext = Boolean(persistedFamilyId && persistedChildId)
    if (!familyId && persistedFamilyId) {
      setFamilyId(persistedFamilyId)
    }
    if (!childId && persistedChildId) {
      setChildId(persistedChildId)
    }
    if (persistedCanRecord !== null) {
      setCanRecord(persistedCanRecord)
    }
    setFamilyReady(hasCachedContext)
    setFamilyError('')

    const bootstrapFamilyContext = async () => {
      try {
        let acceptedFamilyId: string | null = null
        const pendingInviteToken = getPendingInviteToken()
        if (pendingInviteToken) {
          try {
            acceptedFamilyId = await acceptInvitation(pendingInviteToken)
            clearPendingInviteToken()
          } catch (inviteError) {
            const message = toErrorMessage(inviteError).toLowerCase()
            if (message.includes('already accepted')) {
              clearPendingInviteToken()
            }
          }
        }

        const memberships = await listMyFamilies()
        if (disposed) {
          return
        }
        setFamilies(memberships)

        if (memberships.length === 0) {
          setNeedsOnboarding(true)
          setFamilyId(null)
          setChildId(null)
          setCanRecord(false)
          clearActiveFamilyId()
          clearActiveChildId()
          clearCanRecord()
          setFamilyReady(true)
          return
        }

        const resolvedFamilyId = resolveActiveFamily(memberships, acceptedFamilyId)
        if (!resolvedFamilyId) {
          throw new Error('No family could be selected.')
        }
        persistActiveFamilyId(resolvedFamilyId)

        let resolvedChildId = await getFirstChildIdForFamily(resolvedFamilyId)
        if (!resolvedChildId) {
          resolvedChildId = await ensureDefaultChildForFamily(resolvedFamilyId)
        }
        if (!resolvedChildId) {
          throw new Error('No child exists for this family. Please ask the family owner to create one.')
        }

        const currentRole = memberships.find((membership) => membership.familyId === resolvedFamilyId)?.role
        const allowRecording = currentRole === 'OWNER'

        if (disposed) {
          return
        }
        setNeedsOnboarding(false)
        setFamilyId(resolvedFamilyId)
        setChildId(resolvedChildId)
        setCanRecord(allowRecording)
        persistActiveChildId(resolvedChildId)
        persistCanRecord(allowRecording)
        setFamilyReady(true)
      } catch (error) {
        if (disposed) {
          return
        }
        setFamilyError(toErrorMessage(error))
        setFamilyReady(true)
      }
    }

    void bootstrapFamilyContext()

    return () => {
      disposed = true
    }
  }, [bootstrapTick, sessionUserId])

  useEffect(() => {
    if (!familyReady || familyError) {
      return
    }

    if (needsOnboarding) {
      if (route.kind !== 'onboarding' && route.kind !== 'invite-accept') {
        navigate(APP_ROUTES.onboarding)
      }
      return
    }

    if (route.kind === 'onboarding') {
      navigate(canRecord ? APP_ROUTES.record : APP_ROUTES.memories)
      return
    }

    if (redirectToRecordOnLogin) {
      const loginTarget = canRecord ? APP_ROUTES.record : APP_ROUTES.memories
      if (route.kind !== (canRecord ? 'record' : 'memories')) {
        navigate(loginTarget)
      }
      setRedirectToRecordOnLogin(false)
      return
    }

    if (!canRecord && route.kind === 'record') {
      navigate(APP_ROUTES.memories)
    }
  }, [canRecord, familyError, familyReady, navigate, needsOnboarding, redirectToRecordOnLogin, route.kind])

  const onLockedNavigationAttempt = () => {
    setShowNavigationHint(true)
    window.setTimeout(() => setShowNavigationHint(false), 1800)
  }

  const onLogout = async () => {
    if (!supabase) {
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) {
      setAuthError(error.message)
    } else {
      setAuthError('')
    }
  }

  const rerunFamilyBootstrap = () => {
    setBootstrapTick((current) => current + 1)
  }

  const onCreateFamily = async (name: string) => {
    const createdFamilyId = await createFamilyWithOwner(name)
    persistActiveFamilyId(createdFamilyId)
    rerunFamilyBootstrap()
  }

  const onJoinPendingInvite = async () => {
    const token = getPendingInviteToken()
    if (!token) {
      throw new Error('No pending invite token found.')
    }
    const invitedFamilyId = await acceptInvitation(token)
    clearPendingInviteToken()
    persistActiveFamilyId(invitedFamilyId)
    rerunFamilyBootstrap()
  }

  const onActiveFamilyChange = (nextFamilyId: string) => {
    persistActiveFamilyId(nextFamilyId)
    clearActiveChildId()
    setChildId(null)
    setFamilyReady(false)
    rerunFamilyBootstrap()
  }

  const onInviteAccepted = (acceptedFamilyId: string) => {
    clearPendingInviteToken()
    persistActiveFamilyId(acceptedFamilyId)
    rerunFamilyBootstrap()
  }

  if (!isSupabaseConfigured) {
    return (
      <AppShell>
        <AuthGate configurationError="Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." />
      </AppShell>
    )
  }

  if (!authReady) {
    return <AppShell>Checking your session…</AppShell>
  }

  if (!session) {
    return (
      <AppShell>
        <AuthGate configurationError={authError || undefined} />
      </AppShell>
    )
  }

  const shouldBlockForFamilySetup = !familyReady && !(familyId && childId)

  if (shouldBlockForFamilySetup) {
    return <AppShell>Setting up your family…</AppShell>
  }

  if (familyError) {
    return <AppShell>{familyError}</AppShell>
  }

  let content: ReactNode
  if (route.kind === 'onboarding') {
    content = (
      <OnboardingPage
        hasPendingInvite={Boolean(getPendingInviteToken())}
        onCreateFamily={onCreateFamily}
        onJoinPendingInvite={onJoinPendingInvite}
      />
    )
  } else if (route.kind === 'record') {
    content = <RecordPage navigate={navigate} childId={childId ?? ''} onNavigationLockChange={setNavigationLocked} />
  } else if (route.kind === 'memories') {
    content = <MemoriesPage navigate={navigate} familyId={familyId} />
  } else if (route.kind === 'invite-accept') {
    content = <AcceptInvitePage navigate={navigate} onAccepted={onInviteAccepted} />
  } else if (route.kind === 'memory-detail') {
    content = <MemoryDetailPage memoryId={route.memoryId} navigate={navigate} canManageMemory={canRecord} />
  } else if (route.kind === 'settings') {
    content = <SettingsPage navigate={navigate} onLogout={() => void onLogout()} />
  } else if (route.kind === 'family') {
    content = (
      <FamilyPage
        familyId={familyId}
        families={families}
        navigate={navigate}
        onActiveFamilyChange={onActiveFamilyChange}
      />
    )
  } else if (route.kind === 'account') {
    content = <AccountPage navigate={navigate} userEmail={session.user.email ?? ''} />
  } else if (route.kind === 'privacy') {
    content = <PrivacyPage navigate={navigate} />
  } else {
    content = <RouteNotFound navigate={navigate} />
  }

  return (
    <AppShell
      pathname={pathname}
      navigate={navigate}
      canRecord={canRecord}
      navigationLocked={navigationLocked}
      showNavigationHint={showNavigationHint}
      onLockedNavigationAttempt={onLockedNavigationAttempt}
      showNavigation
      familyId={familyId}
      childId={childId}
    >
      {content}
    </AppShell>
  )
}
