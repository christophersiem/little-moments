import styled from 'styled-components'

interface MemorySummaryProps {
  summary: string | null
}

const Card = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const CardLabel = styled.div`
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 600;
`

const CardHint = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const CardText = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
`

export function MemorySummary({ summary }: MemorySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardLabel>Summary</CardLabel>
      </CardHeader>
      <CardHint>Auto-generated from the transcript.</CardHint>
      <CardText>{summary || 'Summary will appear after transcription.'}</CardText>
    </Card>
  )
}
