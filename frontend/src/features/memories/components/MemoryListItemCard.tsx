import styled from 'styled-components'
import { formatMonthDay } from '../../../lib/utils'
import { useInViewOnce } from '../../../lib/useInViewOnce'
import type { MemoryListItem } from '../types'

interface MemoryListItemCardProps {
  item: MemoryListItem
  isLastInGroup: boolean
  onOpen: (id: string) => void
  onToggleHighlight?: (id: string, nextValue: boolean) => void
  highlightBusy?: boolean
}

const CardShell = styled.div`
  position: relative;
`

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
  padding-right: ${({ theme }) => theme.space.x6};
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

const HighlightButton = styled.button<{ $active: boolean }>`
  position: absolute;
  top: ${({ theme }) => theme.space.x3};
  right: 0;
  width: ${({ theme }) => theme.layout.minTouchTarget};
  height: ${({ theme }) => theme.layout.minTouchTarget};
  border: none;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: transparent;
  color: ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.textMuted)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.58;
    cursor: default;
  }
`

const HeartIcon = styled.svg`
  width: 18px;
  height: 18px;
`

export function MemoryListItemCard({
  item,
  isLastInGroup,
  onOpen,
  onToggleHighlight,
  highlightBusy = false,
}: MemoryListItemCardProps) {
  const { ref, isInView } = useInViewOnce<HTMLButtonElement>()
  const eventDate = item.recordedAt || item.createdAt
  const title = item.title || item.transcriptSnippet || (item.status === 'FAILED' ? 'Transcription failed' : 'Processing...')
  const previewTags = item.tags.slice(0, 2)
  const canToggleHighlight = typeof onToggleHighlight === 'function'

  return (
    <CardShell>
      <HighlightButton
        type="button"
        $active={item.isHighlight}
        disabled={highlightBusy || !canToggleHighlight}
        aria-label={item.isHighlight ? 'Remove highlight' : 'Mark as highlight'}
        onClick={(event) => {
          event.stopPropagation()
          if (!canToggleHighlight || highlightBusy) {
            return
          }
          onToggleHighlight(item.id, !item.isHighlight)
        }}
      >
        <HeartIcon viewBox="0 0 24 24" fill={item.isHighlight ? 'currentColor' : 'none'} aria-hidden>
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </HeartIcon>
      </HighlightButton>

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
    </CardShell>
  )
}
