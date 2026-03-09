import styled from 'styled-components'
import { Button } from './Button'

interface TopNavProps {
  pathname: string
  navigate: (nextPath: string) => void
  canRecord?: boolean
  navigationLocked?: boolean
  onLockedNavigationAttempt?: () => void
}

const Nav = styled.nav`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.x1};
  padding: ${({ theme }) => theme.space.x1};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
`

const NavItem = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.x1};
`

const NavIcon = styled.svg`
  width: 18px;
  height: 18px;
  display: block;
`

const NavLabel = styled.span`
  font-size: 0.75rem;
`

function RecordIcon() {
  return (
    <NavIcon viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="6.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
    </NavIcon>
  )
}

function BookIcon() {
  return (
    <NavIcon viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6.5C5 5.67 5.67 5 6.5 5H11.5C12.33 5 13 5.67 13 6.5V19C13 18.17 12.33 17.5 11.5 17.5H6.5C5.67 17.5 5 18.17 5 19V6.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 6.5C19 5.67 18.33 5 17.5 5H12.5C11.67 5 11 5.67 11 6.5V19C11 18.17 11.67 17.5 12.5 17.5H17.5C18.33 17.5 19 18.17 19 19V6.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  )
}

function InsightsIcon() {
  return (
    <NavIcon viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 17.5h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 14V10.5M12 14V7.5M16.5 14V11.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  )
}

export function TopNav({
  pathname,
  navigate,
  canRecord = false,
  navigationLocked = false,
  onLockedNavigationAttempt,
}: TopNavProps) {
  const onNavigate = (nextPath: string) => {
    if (navigationLocked && pathname !== nextPath) {
      onLockedNavigationAttempt?.()
      return
    }
    if (nextPath === '/record' && !canRecord) {
      onLockedNavigationAttempt?.()
      return
    }
    navigate(nextPath)
  }

  return (
    <Nav>
      <Button
        variant="nav"
        active={pathname.startsWith('/memories')}
        onClick={() => onNavigate('/memories')}
        aria-disabled={navigationLocked && !pathname.startsWith('/memories')}
        style={{ opacity: navigationLocked && !pathname.startsWith('/memories') ? 0.62 : 1 }}
      >
        <NavItem>
          <BookIcon />
          <NavLabel>Memories</NavLabel>
        </NavItem>
      </Button>
      <Button
        variant="nav"
        active={pathname.startsWith('/record')}
        onClick={() => onNavigate('/record')}
        aria-disabled={navigationLocked && !pathname.startsWith('/record')}
        style={{ opacity: !canRecord || (navigationLocked && !pathname.startsWith('/record')) ? 0.62 : 1 }}
      >
        <NavItem>
          <RecordIcon />
          <NavLabel>Record</NavLabel>
        </NavItem>
      </Button>
      <Button
        variant="nav"
        active={pathname.startsWith('/insights')}
        onClick={() => onNavigate('/insights')}
        aria-disabled={navigationLocked && !pathname.startsWith('/insights')}
        style={{ opacity: navigationLocked && !pathname.startsWith('/insights') ? 0.62 : 1 }}
      >
        <NavItem>
          <InsightsIcon />
          <NavLabel>Insights</NavLabel>
        </NavItem>
      </Button>
    </Nav>
  )
}
