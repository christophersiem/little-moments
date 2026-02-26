import styled from 'styled-components'
import { Button } from './Button'

interface TopNavProps {
  pathname: string
  navigate: (nextPath: string) => void
}

const Nav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.space.x2};
`

export function TopNav({ pathname, navigate }: TopNavProps) {
  return (
    <Nav>
      <Button variant="nav" active={pathname.startsWith('/record')} onClick={() => navigate('/record')}>
        Record
      </Button>
      <Button variant="nav" active={pathname.startsWith('/memories')} onClick={() => navigate('/memories')}>
        Memories
      </Button>
    </Nav>
  )
}
