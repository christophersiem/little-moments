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
  padding: ${({ theme }) => `${theme.space.x1} 0`};
  background: transparent;
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  column-gap: ${({ theme }) => theme.space.x3};
  opacity: ${({ $revealed }) => ($revealed ? 1 : 0)};
  transform: translateY(${({ $revealed }) => ($revealed ? '0' : '4px')});
  transition: opacity 220ms ease-out, transform 220ms ease-out;

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
  min-height: 92px;
`

const MarkerDot = styled.span`
  position: absolute;
  top: 14px;
  left: 1px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, ${({ theme }) => theme.colors.textMuted} 65%, ${({ theme }) => theme.colors.border});
  background: ${({ theme }) => theme.colors.backgroundAlt};
  opacity: 0.72;
`

const MarkerLine = styled.span<{ $hidden: boolean }>`
  position: absolute;
  top: 27px;
  left: 4.5px;
  width: 1.5px;
  bottom: 0;
  background: ${({ theme, $hidden }) =>
    $hidden ? 'transparent' : `color-mix(in srgb, ${theme.colors.textMuted} 45%, ${theme.colors.border})`};
  opacity: ${({ $hidden }) => ($hidden ? 0 : 0.28)};
`

const Content = styled.div`
  min-height: 92px;
  padding: ${({ theme }) => `${theme.space.x1} 0 ${theme.space.x2}`};
  padding-right: ${({ theme }) => theme.space.x1};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom-color: color-mix(in srgb, ${({ theme }) => theme.colors.border} 32%, transparent);
`

const Head = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: ${({ theme }) => theme.space.x1};
`

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.x1};
  min-width: 0;
`

const DateText = styled.span`
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
  opacity: 0.92;
`

const Title = styled.div`
  font-family: ${({ theme }) => theme.typography.headingFamily};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.14rem;
  line-height: 1.22;
  font-weight: 600;
`

const Tags = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.x1};
  flex-wrap: wrap;
`

const TagChip = styled.span`
  padding: 2px ${({ theme }) => theme.space.x2};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.border} 52%, transparent);
  font-size: calc(${({ theme }) => theme.typography.secondarySize} - 1px);
  line-height: 1.25;
  opacity: 0.9;
`

const HighlightButton = styled.button<{ $active: boolean }>`
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
  width: 17px;
  height: 17px;
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
      <RowButton ref={ref} onClick={() => onOpen(item.id)} $revealed={isInView}>
        <MarkerColumn>
          <MarkerDot />
          <MarkerLine $hidden={isLastInGroup} />
        </MarkerColumn>
        <Content>
          <Head>
            <Meta>
              <DateText>{formatMonthDay(eventDate)}</DateText>
              <Title>{title}</Title>
            </Meta>
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
                  d="M7 4.8h10c.7 0 1.2.6 1.2 1.2V20l-6.2-3.3L5.8 20V6c0-.6.6-1.2 1.2-1.2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </HeartIcon>
            </HighlightButton>
          </Head>
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
