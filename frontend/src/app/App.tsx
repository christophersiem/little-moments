import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import styled from 'styled-components'
import { RouteNotFound } from '../components/RouteNotFound'
import { RippleLogo } from '../components/RippleLogo'
import { TopNav } from '../components/TopNav'
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
  clearActiveFamilyId,
  clearPendingInviteToken,
  getActiveFamilyId,
  getPendingInviteToken,
  setActiveFamilyId as persistActiveFamilyId,
  setPendingInviteToken,
} from '../features/families/localState'
import { ensureOwnProfileForSession } from '../features/profiles/api'
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
import { useAppRouter } from './router'

const Shell = styled.div`
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  min-height: 100vh;
  padding: ${({ theme }) =>
    `${theme.space.x3} ${theme.space.x3} calc(${theme.layout.bottomNavHeight} + ${theme.space.x4} + env(safe-area-inset-bottom, 0px))`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
  padding-top: ${({ theme }) => theme.space.x1};
`

const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
  color: ${({ theme }) => theme.colors.textMuted};
`

const Title = styled.h1`
  margin: 0;
  font-size: 1.95rem;
  color: currentColor;
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-weight: 500;
  letter-spacing: 0.02em;
`

const BrandLogo = styled(RippleLogo)`
  width: 20px;
  height: 20px;
  color: ${({ theme }) => theme.colors.background};
  opacity: 1;
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
`

const Content = styled.main`
  flex: 1;
  display: flex;
`

const NavDock = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(${({ theme }) => theme.space.x3} + env(safe-area-inset-bottom, 0px));
  width: min(
    calc(${({ theme }) => theme.layout.maxWidth} - (${({ theme }) => theme.space.x3} * 2)),
    calc(100vw - (${({ theme }) => theme.space.x3} * 2))
  );
  z-index: 12;
`

const NavigationHint = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(
    ${({ theme }) => theme.layout.bottomNavHeight} + ${({ theme }) => theme.space.x4} + env(safe-area-inset-bottom, 0px)
  );
  background: ${({ theme }) => theme.colors.surfaceStrong};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  box-shadow: ${({ theme }) => theme.shadows.card};
  z-index: 13;
`

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

export default function App() {
  const { pathname, route, navigate } = useAppRouter()
  const [navigationLocked, setNavigationLocked] = useState(false)
  const [showNavigationHint, setShowNavigationHint] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [authError, setAuthError] = useState('')
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [childId, setChildId] = useState<string | null>(null)
  const [familyReady, setFamilyReady] = useState(false)
  const [familyError, setFamilyError] = useState('')
  const [canRecord, setCanRecord] = useState(true)
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
      setSession(data.session ?? null)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
      clearActiveFamilyId()
      return
    }

    let disposed = false
    setFamilyReady(false)
    setFamilyError('')

    const bootstrapFamilyContext = async () => {
      try {
        try {
          if (session?.user) {
            await ensureOwnProfileForSession(session.user)
          }
        } catch {
          // Keep onboarding robust if profile sync is temporarily unavailable.
        }

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
        navigate('/onboarding')
      }
      return
    }

    if (route.kind === 'onboarding') {
      navigate(canRecord ? '/record' : '/memories')
      return
    }

    if (!canRecord && route.kind === 'record') {
      navigate('/memories')
    }
  }, [canRecord, familyError, familyReady, navigate, needsOnboarding, route.kind])

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
    rerunFamilyBootstrap()
  }

  const onInviteAccepted = (acceptedFamilyId: string) => {
    clearPendingInviteToken()
    persistActiveFamilyId(acceptedFamilyId)
    rerunFamilyBootstrap()
  }

  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <Header>
          <Brand>
            <BrandLogo animate="stopped" />
            <Title>Little Moments</Title>
          </Brand>
          <Divider />
        </Header>
        <Content>
          <AuthGate configurationError="Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." />
        </Content>
      </Shell>
    )
  }

  if (!authReady) {
    return (
      <Shell>
        <Header>
          <Brand>
            <BrandLogo animate="stopped" />
            <Title>Little Moments</Title>
          </Brand>
          <Divider />
        </Header>
        <Content>Checking your session…</Content>
      </Shell>
    )
  }

  if (!session) {
    return (
      <Shell>
        <Header>
          <Brand>
            <BrandLogo animate="stopped" />
            <Title>Little Moments</Title>
          </Brand>
          <Divider />
        </Header>
        <Content>
          <AuthGate configurationError={authError || undefined} />
        </Content>
      </Shell>
    )
  }

  if (!familyReady) {
    return (
      <Shell>
        <Header>
          <Brand>
            <BrandLogo animate="stopped" />
            <Title>Little Moments</Title>
          </Brand>
          <Divider />
        </Header>
        <Content>Setting up your family…</Content>
      </Shell>
    )
  }

  if (familyError) {
    return (
      <Shell>
        <Header>
          <Brand>
            <BrandLogo animate="stopped" />
            <Title>Little Moments</Title>
          </Brand>
          <Divider />
        </Header>
        <Content>{familyError}</Content>
      </Shell>
    )
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
    <Shell data-family-id={familyId ?? undefined} data-child-id={childId ?? undefined}>
      <Header>
        <Brand>
          <BrandLogo animate="stopped" />
          <Title>Little Moments</Title>
        </Brand>
        <Divider />
      </Header>
      <Content>{content}</Content>
      {showNavigationHint && <NavigationHint>Please stop the recording first.</NavigationHint>}
      <NavDock>
        <TopNav
          pathname={pathname}
          navigate={navigate}
          canRecord={canRecord}
          navigationLocked={navigationLocked}
          onLockedNavigationAttempt={onLockedNavigationAttempt}
        />
      </NavDock>
    </Shell>
  )
}
