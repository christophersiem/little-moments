import styled from 'styled-components'
import { formatMonthDay } from '../../../lib/utils'
import { useInViewOnce } from '../../../lib/useInViewOnce'
import type { MemoryListItem } from '../types'

interface MemoryListItemCardProps {
  item: MemoryListItem
  isLastInGroup: boolean
  onOpen: (id: string) => void
}

const RowButton = styled.button<{ $revealed: boolean }>`
  width: 100%;
  border: none;
  padding: ${({ theme }) => `${theme.space.x3} 0`};
  background: transparent;
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  column-gap: ${({ theme }) => theme.space.x3};
  opacity: ${({ $revealed }) => ($revealed ? 1 : 0)};
  transform: translateY(${({ $revealed }) => ($revealed ? '0' : '6px')});
  transition: opacity 280ms ease-out, transform 280ms ease-out;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.md};
  }

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    transform: none;
    transition: none;
  }
`

const MarkerColumn = styled.div`
  position: relative;
  min-height: 88px;
`

const MarkerDot = styled.span`
  position: absolute;
  top: 11px;
  left: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => theme.colors.background};
  opacity: 0.84;
`

const MarkerLine = styled.span<{ $hidden: boolean }>`
  position: absolute;
  top: 25px;
  left: 8px;
  width: 1px;
  bottom: 0;
  background: ${({ theme, $hidden }) => ($hidden ? 'transparent' : theme.colors.border)};
  opacity: ${({ $hidden }) => ($hidden ? 0 : 0.52)};
`

const Content = styled.div`
  min-height: 88px;
  padding-right: ${({ theme }) => theme.space.x1};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom-color: color-mix(in srgb, ${({ theme }) => theme.colors.border} 68%, transparent);
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
  font-size: 1.2rem;
  line-height: 1;
  padding-right: ${({ theme }) => theme.space.x1};
  opacity: 0.72;
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
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: calc(${({ theme }) => theme.typography.secondarySize} - 1px);
  line-height: 1.15;
`

export function MemoryListItemCard({ item, isLastInGroup, onOpen }: MemoryListItemCardProps) {
  const { ref, isInView } = useInViewOnce<HTMLButtonElement>()
  const eventDate = item.recordedAt || item.createdAt
  const title = item.title || item.transcriptSnippet || (item.status === 'FAILED' ? 'Transcription failed' : 'Processing...')
  const previewTags = item.tags.slice(0, 2)

  return (
    <RowButton ref={ref} onClick={() => onOpen(item.id)} $revealed={isInView}>
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
        {previewTags.length > 0 && (
          <Tags>
            {previewTags.map((tag) => (
              <TagChip key={`${item.id}-${tag}`}>{tag}</TagChip>
            ))}
          </Tags>
        )}
      </Content>
    </RowButton>
  )
}
