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

const NavTwoColumns = styled(Nav)`
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

function SettingsIcon() {
  return (
    <NavIcon viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8.75C10.21 8.75 8.75 10.21 8.75 12C8.75 13.79 10.21 15.25 12 15.25C13.79 15.25 15.25 13.79 15.25 12C15.25 10.21 13.79 8.75 12 8.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 12C19 11.48 18.95 10.98 18.84 10.5L20.5 9.21L18.79 6.29L16.77 7.03C16.02 6.39 15.13 5.92 14.16 5.67L13.85 3.5H10.15L9.84 5.67C8.87 5.92 7.98 6.39 7.23 7.03L5.21 6.29L3.5 9.21L5.16 10.5C5.05 10.98 5 11.48 5 12C5 12.52 5.05 13.02 5.16 13.5L3.5 14.79L5.21 17.71L7.23 16.97C7.98 17.61 8.87 18.08 9.84 18.33L10.15 20.5H13.85L14.16 18.33C15.13 18.08 16.02 17.61 16.77 16.97L18.79 17.71L20.5 14.79L18.84 13.5C18.95 13.02 19 12.52 19 12Z"
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
  canRecord = true,
  navigationLocked = false,
  onLockedNavigationAttempt,
}: TopNavProps) {
  const NavContainer = canRecord ? Nav : NavTwoColumns

  const onNavigate = (nextPath: string) => {
    if (navigationLocked && pathname !== nextPath) {
      onLockedNavigationAttempt?.()
      return
    }
    navigate(nextPath)
  }

  return (
    <NavContainer>
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
      {canRecord && (
        <Button
          variant="nav"
          active={pathname.startsWith('/record')}
          onClick={() => onNavigate('/record')}
          aria-disabled={navigationLocked && !pathname.startsWith('/record')}
          style={{ opacity: navigationLocked && !pathname.startsWith('/record') ? 0.62 : 1 }}
        >
          <NavItem>
            <RecordIcon />
            <NavLabel>Record</NavLabel>
          </NavItem>
        </Button>
      )}
      <Button
        variant="nav"
        active={pathname.startsWith('/settings')}
        onClick={() => onNavigate('/settings')}
        aria-disabled={navigationLocked && !pathname.startsWith('/settings')}
        style={{ opacity: navigationLocked && !pathname.startsWith('/settings') ? 0.62 : 1 }}
      >
        <NavItem>
          <SettingsIcon />
          <NavLabel>Settings</NavLabel>
        </NavItem>
      </Button>
    </NavContainer>
  )
}
