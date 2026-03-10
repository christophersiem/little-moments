import styled from 'styled-components'
import { Button } from '../../../components/Button'

interface MemoryDetailErrorProps {
  error: string
  onRetry: () => void
  onBackToMemories: () => void
}

const Title = styled.h2`
  margin: 0;
  font-size: 1.95rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.25;
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.x2};
`

export function MemoryDetailError({ error, onRetry, onBackToMemories }: MemoryDetailErrorProps) {
  return (
    <>
      <Title>Memory</Title>
      <ErrorText>{error || 'Could not load memory.'}</ErrorText>
      <ActionRow>
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
        <Button onClick={onBackToMemories}>Back to memories</Button>
      </ActionRow>
    </>
  )
}
