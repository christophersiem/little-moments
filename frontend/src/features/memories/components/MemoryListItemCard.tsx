import styled from 'styled-components'
import { formatDateTime } from '../../../lib/utils'
import type { MemoryListItem } from '../types'

interface MemoryListItemCardProps {
  item: MemoryListItem
  onOpen: (id: string) => void
}

const CardButton = styled.button`
  width: 100%;
  text-align: left;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.card};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const MemoryDate = styled.div`
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
`

const MemorySnippet = styled.div`
  font-size: ${({ theme }) => theme.typography.bodySize};
  line-height: ${({ theme }) => theme.typography.bodyLineHeight};
`

export function MemoryListItemCard({ item, onOpen }: MemoryListItemCardProps) {
  return (
    <CardButton key={item.id} onClick={() => onOpen(item.id)}>
      <MemoryDate>{formatDateTime(item.recordedAt || item.createdAt)}</MemoryDate>
      <MemorySnippet>
        {item.transcriptSnippet || (item.status === 'FAILED' ? 'Transcription failed. Open for details.' : 'Processing...')}
      </MemorySnippet>
    </CardButton>
  )
}
