import styled from 'styled-components'
import { Button } from './Button'

interface TopNavProps {
  pathname: string
  navigate: (nextPath: string) => void
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

const NavGlyph = styled.span`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  line-height: 1;
`

const NavLabel = styled.span`
  font-size: 0.6875rem;
`

export function TopNav({ pathname, navigate }: TopNavProps) {
  return (
    <Nav>
      <Button variant="nav" active={pathname.startsWith('/record')} onClick={() => navigate('/record')}>
        <NavItem>
          <NavGlyph>R</NavGlyph>
          <NavLabel>Home</NavLabel>
        </NavItem>
      </Button>
      <Button variant="nav" active={pathname.startsWith('/memories')} onClick={() => navigate('/memories')}>
        <NavItem>
          <NavGlyph>M</NavGlyph>
          <NavLabel>Memories</NavLabel>
        </NavItem>
      </Button>
      <Button variant="nav" disabled>
        <NavItem>
          <NavGlyph>S</NavGlyph>
          <NavLabel>Settings</NavLabel>
        </NavItem>
      </Button>
    </Nav>
  )
}
