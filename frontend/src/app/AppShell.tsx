import type { ReactNode } from 'react'
import styled from 'styled-components'
import { RippleLogo } from '../components/RippleLogo'
import { TopNav } from '../components/TopNav'
import { BOTTOM_NAVIGATION_ITEMS } from './navigation'
import { APP_ROUTES } from './routes'

interface AppShellProps {
  children: ReactNode
  pathname?: string
  navigate?: (nextPath: string) => void
  canRecord?: boolean
  navigationLocked?: boolean
  showNavigationHint?: boolean
  onLockedNavigationAttempt?: () => void
  showNavigation?: boolean
  familyId?: string | null
  childId?: string | null
}

const Shell = styled.div<{ $isRecordRoute: boolean }>`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  min-height: 100vh;
  padding: ${({ theme, $isRecordRoute }) =>
    `${$isRecordRoute ? '0' : theme.space.x3} ${theme.space.x3} calc(${theme.layout.bottomNavHeight} + ${theme.space.x4} + env(safe-area-inset-bottom, 0px))`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme, $isRecordRoute }) => ($isRecordRoute ? '0' : theme.space.x3)};
  overflow-x: hidden;
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.x1};
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
  font-size: 1.72rem;
  color: currentColor;
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-weight: 400;
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
  min-width: 0;
  width: 100%;
`

const NavDock = styled.div`
  position: fixed;
  left: ${({ theme }) => theme.space.x3};
  right: ${({ theme }) => theme.space.x3};
  bottom: calc(${({ theme }) => theme.space.x3} + env(safe-area-inset-bottom, 0px));
  width: auto;
  max-width: calc(${({ theme }) => theme.layout.maxWidth} - (${({ theme }) => theme.space.x3} * 2));
  margin: 0 auto;
  z-index: 12;
`

const NavigationHint = styled.div`
  position: fixed;
  left: ${({ theme }) => theme.space.x3};
  right: ${({ theme }) => theme.space.x3};
  bottom: calc(
    ${({ theme }) => theme.layout.bottomNavHeight} + ${({ theme }) => theme.space.x4} + env(safe-area-inset-bottom, 0px)
  );
  width: auto;
  max-width: calc(${({ theme }) => theme.layout.maxWidth} - (${({ theme }) => theme.space.x3} * 2));
  margin: 0 auto;
  background: ${({ theme }) => theme.colors.surfaceStrong};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.card};
  z-index: 13;
`

export function AppShell({
  children,
  pathname,
  navigate,
  canRecord = false,
  navigationLocked = false,
  showNavigationHint = false,
  onLockedNavigationAttempt,
  showNavigation = false,
  familyId,
  childId,
}: AppShellProps) {
  const isRecordRoute = pathname?.startsWith(APP_ROUTES.record) ?? false

  return (
    <Shell data-family-id={familyId ?? undefined} data-child-id={childId ?? undefined} $isRecordRoute={isRecordRoute}>
      {!isRecordRoute && (
        <Header>
          <Brand>
            <BrandLogo animate="stopped" />
            <Title>Little Moments</Title>
          </Brand>
          <Divider />
        </Header>
      )}
      <Content>{children}</Content>
      {showNavigationHint && <NavigationHint>Please stop the recording first.</NavigationHint>}
      {showNavigation && pathname && navigate && (
        <NavDock>
          <TopNav
            pathname={pathname}
            navigate={navigate}
            canRecord={canRecord}
            navigationLocked={navigationLocked}
            onLockedNavigationAttempt={onLockedNavigationAttempt}
            items={BOTTOM_NAVIGATION_ITEMS}
          />
        </NavDock>
      )}
    </Shell>
  )
}
