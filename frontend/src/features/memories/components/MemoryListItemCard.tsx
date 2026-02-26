import styled from 'styled-components'
import { formatMonthDay } from '../../../lib/utils'
import type { MemoryListItem } from '../types'

interface MemoryListItemCardProps {
  item: MemoryListItem
  isLastInGroup: boolean
  onOpen: (id: string) => void
}

const RowButton = styled.button`
  width: 100%;
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-columns: 26px 1fr;
  column-gap: ${({ theme }) => theme.space.x3};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.md};
  }
`

const MarkerColumn = styled.div`
  position: relative;
  min-height: 92px;
`

const MarkerDot = styled.span`
  position: absolute;
  top: 9px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => theme.colors.background};
`

const MarkerLine = styled.span<{ $hidden: boolean }>`
  position: absolute;
  top: 24px;
  left: 8px;
  width: 1px;
  bottom: 0;
  background: ${({ theme, $hidden }) => ($hidden ? 'transparent' : theme.colors.border)};
`

const Content = styled.div`
  min-height: 92px;
  padding-bottom: ${({ theme }) => theme.space.x2};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x3};
`

const DateText = styled.span`
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
`

const Chevron = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 1.35rem;
  line-height: 1;
`

const Title = styled.div`
  font-family: ${({ theme }) => theme.typography.headingFamily};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.15rem;
  line-height: 1.35;
  font-weight: 600;
`

const Tags = styled.div`
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

export function MemoryListItemCard({ item, isLastInGroup, onOpen }: MemoryListItemCardProps) {
  const eventDate = item.recordedAt || item.createdAt
  const title = item.transcriptSnippet || (item.status === 'FAILED' ? 'Transcription failed' : 'Processing...')

  return (
    <RowButton onClick={() => onOpen(item.id)}>
      <MarkerColumn>
        <MarkerDot />
        <MarkerLine $hidden={isLastInGroup} />
      </MarkerColumn>
      <Content>
        <MetaRow>
          <DateText>{formatMonthDay(eventDate)}</DateText>
          <Chevron>›</Chevron>
        </MetaRow>
        <Title>{title}</Title>
        {item.tags.length > 0 && (
          <Tags>
            {item.tags.map((tag) => (
              <TagChip key={`${item.id}-${tag}`}>{tag}</TagChip>
            ))}
          </Tags>
        )}
      </Content>
    </RowButton>
  )
}
