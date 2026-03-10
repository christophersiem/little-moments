import type { RefObject } from 'react'
import styled from 'styled-components'
import type { MonthGroup } from '../lib/groupMemoriesByMonth'
import { MemoryListItem } from './MemoryListItem'

interface MemoriesTimelineProps {
  groups: MonthGroup[]
  pendingMemoryPrefix: string
  highlightPendingById: Record<string, boolean>
  onOpenMemory: (id: string) => void
  onToggleHighlight: (id: string, nextValue: boolean) => void
  showLoadMoreHint: boolean
  hasMore: boolean
  loadingMore: boolean
  loadMoreError: string
  onRetryLoadMore: () => void
  loadMoreSentinelRef: RefObject<HTMLDivElement | null>
}

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
`

const GroupTitle = styled.h3`
  margin: 0;
  padding: ${({ theme }) => `${theme.space.x2} 0 ${theme.space.x1}`};
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-size: 1.05rem;
  font-weight: 400;
`

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const FooterArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
  padding: ${({ theme }) => `${theme.space.x2} 0 ${theme.space.x3}`};
`

const FooterText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const RetryLoadMoreButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.accentStrong};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: ${({ theme }) => `0 ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  cursor: pointer;
`

const ScrollSentinel = styled.div`
  width: 100%;
  height: 1px;
`

export function MemoriesTimeline({
  groups,
  pendingMemoryPrefix,
  highlightPendingById,
  onOpenMemory,
  onToggleHighlight,
  showLoadMoreHint,
  hasMore,
  loadingMore,
  loadMoreError,
  onRetryLoadMore,
  loadMoreSentinelRef,
}: MemoriesTimelineProps) {
  return (
    <>
      <Groups>
        {groups.map((group) => (
          <Group key={group.key}>
            <GroupTitle>{group.label}</GroupTitle>
            {group.items.map((item, index) => (
              <MemoryListItem
                key={item.id}
                item={item}
                isLastInGroup={index === group.items.length - 1}
                onOpen={(id) => {
                  if (id.startsWith(pendingMemoryPrefix)) {
                    return
                  }
                  onOpenMemory(id)
                }}
                onToggleHighlight={onToggleHighlight}
                highlightBusy={Boolean(highlightPendingById[item.id]) || item.id.startsWith(pendingMemoryPrefix)}
              />
            ))}
          </Group>
        ))}
      </Groups>

      <FooterArea aria-live="polite">
        {showLoadMoreHint && hasMore && !loadingMore && !loadMoreError && <FooterText>Scroll to load more</FooterText>}

        {loadingMore && <FooterText>Loading more...</FooterText>}

        {!loadingMore && loadMoreError && (
          <>
            <FooterText>{loadMoreError}</FooterText>
            <RetryLoadMoreButton type="button" onClick={onRetryLoadMore}>
              Retry
            </RetryLoadMoreButton>
          </>
        )}

        {!hasMore && !loadingMore && <FooterText>You&apos;re all caught up.</FooterText>}

        <ScrollSentinel ref={loadMoreSentinelRef} aria-hidden />
      </FooterArea>
    </>
  )
}
