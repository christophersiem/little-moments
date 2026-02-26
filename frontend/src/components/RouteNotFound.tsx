import styled from 'styled-components'
import { Button } from './Button'
import { Card } from './Card'

interface RouteNotFoundProps {
  navigate: (nextPath: string) => void
}

const BodyText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`

export function RouteNotFound({ navigate }: RouteNotFoundProps) {
  return (
    <Card>
      <h2>Route not found</h2>
      <BodyText>The path does not match the reduced MVP routes.</BodyText>
      <Button variant="primary" onClick={() => navigate('/record')}>
        Back to Record
      </Button>
    </Card>
  )
}
