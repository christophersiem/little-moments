import styled from 'styled-components'
import { Button } from '../../../components/Button'

interface MemoriesEmptyStateProps {
  highlightsOnly: boolean
  onRecordMoment: () => void
}

const EmptyState = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const EmptyText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`

const EmptyTitle = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.headingFamily};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.h2Size};
`

export function MemoriesEmptyState({ highlightsOnly, onRecordMoment }: MemoriesEmptyStateProps) {
  return (
    <EmptyState>
      {highlightsOnly ? (
        <>
          <EmptyTitle>No highlights yet</EmptyTitle>
          <EmptyText>Mark meaningful memories with the bookmark icon to find them here later.</EmptyText>
        </>
      ) : (
        <EmptyText>No moments match these filters.</EmptyText>
      )}
      <Button variant="primary" onClick={onRecordMoment}>
        Record moment
      </Button>
    </EmptyState>
  )
}
