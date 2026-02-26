import styled from 'styled-components'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useMemoryDetail } from '../features/memories/hooks'
import { formatDateTime } from '../lib/utils'

interface MemoryDetailPageProps {
  memoryId: string
  navigate: (nextPath: string) => void
}

const CenterCard = styled(Card)`
  align-items: center;
  justify-content: center;
  text-align: center;
`

const DateText = styled.p`
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
`

const StatusText = styled.div`
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
`

const Transcript = styled.p`
  white-space: pre-wrap;
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
`

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.x2};
`

const TagChip = styled.span`
  padding: ${({ theme }) => `${theme.space.x1} ${theme.space.x2}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.accentStrong};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.75rem;
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
  line-height: ${({ theme }) => theme.typography.bodyLineHeight};
`

export function MemoryDetailPage({ memoryId, navigate }: MemoryDetailPageProps) {
  const { loading, error, memory } = useMemoryDetail(memoryId)

  if (loading) {
    return (
      <CenterCard centered>
        <h1>Memory</h1>
        <p>Loading...</p>
      </CenterCard>
    )
  }

  if (error || !memory) {
    return (
      <Card>
        <h1>Memory</h1>
        <ErrorText>{error || 'Could not load memory.'}</ErrorText>
        <Button onClick={() => navigate('/memories')}>Back to List</Button>
      </Card>
    )
  }

  return (
    <Card>
      <h1>Memory</h1>
      <DateText>{formatDateTime(memory.recordedAt || memory.createdAt)}</DateText>
      <StatusText>Status: {memory.status}</StatusText>
      {memory.tags.length > 0 && (
        <TagRow>
          {memory.tags.map((tag) => (
            <TagChip key={`${memory.id}-${tag}`}>{tag}</TagChip>
          ))}
        </TagRow>
      )}
      {memory.status === 'FAILED' ? (
        <ErrorText>{memory.errorMessage || 'Transcription failed.'}</ErrorText>
      ) : (
        <Transcript>{memory.transcript || 'Transcription still processing.'}</Transcript>
      )}
      <Button onClick={() => navigate('/memories')}>Back to List</Button>
    </Card>
  )
}
