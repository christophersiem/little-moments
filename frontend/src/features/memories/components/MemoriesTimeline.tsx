import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
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

const Group = styled.section`
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  column-gap: ${({ theme }) => theme.space.x2};
  align-items: start;
  scroll-margin-top: ${({ theme }) => `calc(${theme.space.x6} + ${theme.space.x5})`};

  @media (max-width: 389px) {
    grid-template-columns: 60px minmax(0, 1fr);
    column-gap: ${({ theme }) => theme.space.x2};
  }
`

const MonthRail = styled.div<{ $active: boolean }>`
  position: sticky;
  top: calc(env(safe-area-inset-top, 0px) + 88px);
  align-self: start;
  padding-top: ${({ theme }) => theme.space.x2};
  opacity: ${({ $active }) => ($active ? 0.96 : 0.58)};
  transition: opacity 180ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const GroupTitle = styled.h3<{ $active: boolean }>`
  margin: 0;
  padding: 0;
  color: ${({ theme, $active }) =>
    $active
      ? `color-mix(in srgb, ${theme.colors.text} 72%, ${theme.colors.textMuted})`
      : `color-mix(in srgb, ${theme.colors.textMuted} 88%, ${theme.colors.border})`};
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-size: 0.87rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.35;
  transition: color 180ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
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

const ItemsColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
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
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(groups[0]?.key ?? null)
  const groupRefs = useRef<Record<string, HTMLElement | null>>({})

  const groupKeys = useMemo(() => groups.map((group) => group.key), [groups])

  useEffect(() => {
    if (groupKeys.length === 0) {
      setActiveGroupKey(null)
      return
    }
    if (!activeGroupKey || !groupKeys.includes(activeGroupKey)) {
      setActiveGroupKey(groupKeys[0])
    }
  }, [activeGroupKey, groupKeys])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      return
    }

    const elements = groupKeys
      .map((key) => groupRefs.current[key])
      .filter((element): element is HTMLElement => Boolean(element))

    if (elements.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        if (visibleEntries.length === 0) {
          return
        }

        const strongest = visibleEntries.reduce((current, candidate) => {
          return candidate.intersectionRatio > current.intersectionRatio ? candidate : current
        })

        const nextKey = strongest.target.getAttribute('data-month-key')
        if (nextKey) {
          setActiveGroupKey(nextKey)
        }
      },
      {
        root: null,
        rootMargin: '-110px 0px -45% 0px',
        threshold: [0.1, 0.25, 0.45, 0.7],
      },
    )

    elements.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
    }
  }, [groupKeys])

  return (
    <>
      <Groups>
        {groups.map((group) => (
          <Group
            key={group.key}
            ref={(element) => {
              groupRefs.current[group.key] = element
            }}
            data-month-key={group.key}
          >
            <MonthRail $active={activeGroupKey === group.key}>
              <GroupTitle $active={activeGroupKey === group.key}>{group.label}</GroupTitle>
            </MonthRail>
            <ItemsColumn>
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
            </ItemsColumn>
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
