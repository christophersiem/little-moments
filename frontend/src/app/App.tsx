import { useEffect, useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { RouteNotFound } from '../components/RouteNotFound'
import { TopNav } from '../components/TopNav'
import { AccountPage } from '../pages/AccountPage'
import { MemoriesPage } from '../pages/MemoriesPage'
import { MemoryDetailPage } from '../pages/MemoryDetailPage'
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

const Title = styled.h1`
  margin: 0;
  font-size: 1.95rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-weight: 500;
  letter-spacing: 0.02em;
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

export default function App() {
  const { pathname, route, navigate } = useAppRouter()
  const [navigationLocked, setNavigationLocked] = useState(false)
  const [showNavigationHint, setShowNavigationHint] = useState(false)

  useEffect(() => {
    if (route.kind !== 'record') {
      setNavigationLocked(false)
      setShowNavigationHint(false)
    }
  }, [route.kind])

  const onLockedNavigationAttempt = () => {
    setShowNavigationHint(true)
    window.setTimeout(() => setShowNavigationHint(false), 1800)
  }

  let content: ReactNode
  if (route.kind === 'record') {
    content = <RecordPage navigate={navigate} onNavigationLockChange={setNavigationLocked} />
  } else if (route.kind === 'memories') {
    content = <MemoriesPage navigate={navigate} />
  } else if (route.kind === 'memory-detail') {
    content = <MemoryDetailPage memoryId={route.memoryId} navigate={navigate} />
  } else if (route.kind === 'settings') {
    content = <SettingsPage navigate={navigate} />
  } else if (route.kind === 'account') {
    content = <AccountPage navigate={navigate} />
  } else if (route.kind === 'privacy') {
    content = <PrivacyPage navigate={navigate} />
  } else {
    content = <RouteNotFound navigate={navigate} />
  }

  return (
    <Shell>
      <Header>
        <Title>Little Moments</Title>
        <Divider />
      </Header>
      <Content>{content}</Content>
      {showNavigationHint && <NavigationHint>Please stop the recording first.</NavigationHint>}
      <NavDock>
        <TopNav
          pathname={pathname}
          navigate={navigate}
          navigationLocked={navigationLocked}
          onLockedNavigationAttempt={onLockedNavigationAttempt}
        />
      </NavDock>
    </Shell>
  )
}
