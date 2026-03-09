import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { BottomSheet } from '../components/BottomSheet'
import { PageContainer } from '../components/PageContainer'
import { StatusBanner } from '../components/StatusBanner'
import { updateMemory } from '../features/memories/api'
import { MemoryListItemCard } from '../features/memories/components/MemoryListItemCard'
import { setActiveUploadStatusFromPolling, retryActiveMemoryUpload, useActiveMemoryUpload } from '../features/memories/hooks/uploadSessionStore'
import { updateMemoryHighlightInCache, usePaginatedMemories } from '../features/memories/hooks/usePaginatedMemories'
import { useProcessingMemory } from '../features/memories/hooks/useProcessingMemory'
import { MEMORY_TAG_OPTIONS, type MemoryListItem, type MemoryTag } from '../features/memories/types'
import { formatMonthYear } from '../lib/utils'

interface MemoriesPageProps {
  navigate: (nextPath: string) => void
  familyId: string | null
}

interface MonthOption {
  key: string
  label: string
}

interface MonthGroup {
  key: string
  label: string
  items: MemoryListItem[]
}

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const PageShell = styled.div`
  min-height: 100vh;
`

const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 7;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.background} 94%, transparent);
  backdrop-filter: blur(4px);
  padding: ${({ theme }) => `${theme.space.x1} 0 ${theme.space.x2}`};
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.border} 45%, transparent);
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
`

const Heading = styled.h2`
  margin: 0;
  font-size: 1.45rem;
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const FilterButton = styled.button<{ $active: boolean }>`
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  min-width: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.textMuted)};
  padding: ${({ theme }) => `0 ${theme.space.x2}`};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const FilterIcon = styled.svg`
  width: 17px;
  height: 17px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
`

const FilterBadge = styled.span`
  position: absolute;
  top: 7px;
  right: 7px;
  min-width: 14px;
  height: 14px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.accentStrong};
  color: ${({ theme }) => theme.colors.surfaceStrong};
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
  padding: 0 4px;
`

const FilterSummary = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: calc(${({ theme }) => theme.typography.secondarySize} - 1px);
  line-height: 1.3;
`

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

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
`

const LoadingSkeleton = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  min-height: 96px;
  opacity: 0.7;
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

const SheetSection = styled.section`
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x4}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const SheetHeading = styled.h3`
  margin: 0;
  font-size: calc(${({ theme }) => theme.typography.secondarySize} - 1px);
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 600;
`

const SheetRow = styled.button<{ $selected?: boolean }>`
  width: 100%;
  min-height: 46px;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.accentStrong : `color-mix(in srgb, ${theme.colors.border} 60%, transparent)`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $selected }) => ($selected ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $selected }) => ($selected ? theme.colors.accentStrong : theme.colors.text)};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `0 ${theme.space.x3}`};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.bodySize};
`

const SheetTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.x2};
`

const SheetTag = styled.button<{ $selected: boolean }>`
  min-height: 34px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.accentStrong : `color-mix(in srgb, ${theme.colors.border} 70%, transparent)`};
  background: ${({ theme, $selected }) => ($selected ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $selected }) => ($selected ? theme.colors.accentStrong : theme.colors.textMuted)};
  padding: 0 ${({ theme }) => theme.space.x2};
  font-size: calc(${({ theme }) => theme.typography.secondarySize} - 1px);
  cursor: pointer;
`

const SheetFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
  padding: ${({ theme }) => theme.space.x3};
`

const SheetSubtleText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: calc(${({ theme }) => theme.typography.secondarySize} - 1px);
`

const ScrollSentinel = styled.div`
  width: 100%;
  height: 1px;
`

const PENDING_MEMORY_PREFIX = 'pending-memory-'

function getEventDate(item: MemoryListItem): string {
  return item.recordedAt || item.createdAt
}

function monthKey(dateIso: string): string {
  const date = new Date(dateIso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function collectMonthOptions(items: MemoryListItem[]): MonthOption[] {
  const seen = new Set<string>()
  const options: MonthOption[] = []

  for (const item of items) {
    const eventDate = getEventDate(item)
    const key = monthKey(eventDate)
    if (!seen.has(key)) {
      seen.add(key)
      options.push({ key, label: formatMonthYear(eventDate) })
    }
  }

  return options
}

function groupByMonth(items: MemoryListItem[]): MonthGroup[] {
  const groups: MonthGroup[] = []

  for (const item of items) {
    const eventDate = getEventDate(item)
    const key = monthKey(eventDate)
    const current = groups[groups.length - 1]
    if (!current || current.key !== key) {
      groups.push({ key, label: formatMonthYear(eventDate), items: [item] })
      continue
    }
    current.items.push(item)
  }

  return groups
}

function FilterGlyph() {
  return (
    <FilterIcon viewBox="0 0 24 24" aria-hidden>
      <path d="M4 6h16l-6.2 6.8v5.4L10.2 20v-7.2L4 6Z" />
    </FilterIcon>
  )
}

function CheckGlyph() {
  return (
    <FilterIcon viewBox="0 0 24 24" aria-hidden>
      <path d="M6 12.5l4 4 8-9" />
    </FilterIcon>
  )
}

export function MemoriesPage({ navigate, familyId }: MemoriesPageProps) {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedTags, setSelectedTags] = useState<MemoryTag[]>([])
  const [highlightsOnly, setHighlightsOnly] = useState(false)
  const [draftMonth, setDraftMonth] = useState('all')
  const [draftTags, setDraftTags] = useState<MemoryTag[]>([])
  const [draftHighlightsOnly, setDraftHighlightsOnly] = useState(false)
  const [highlightOverrides, setHighlightOverrides] = useState<Record<string, boolean>>({})
  const [highlightPendingById, setHighlightPendingById] = useState<Record<string, boolean>>({})
  const [highlightError, setHighlightError] = useState('')
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)
  const hasShownLoadMoreHintRef = useRef(false)
  const [nearListEnd, setNearListEnd] = useState(false)
  const [showLoadMoreHint, setShowLoadMoreHint] = useState(false)
  const lastSettledUploadRef = useRef('')
  const activeUpload = useActiveMemoryUpload()
  const processingMemoryId = activeUpload?.status === 'processing' ? activeUpload.memoryId : undefined
  const {
    status: processingStatus,
    error: processingError,
    isPolling: isProcessingPolling,
    startPolling,
    stopPolling,
  } = useProcessingMemory({ memoryId: processingMemoryId, pollIntervalMs: 2500, timeoutMs: 60000 })

  const monthFilter = selectedMonth !== 'all' ? selectedMonth : undefined
  const {
    items,
    loadingInitial,
    loadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    retryLoadMore,
    reload,
  } = usePaginatedMemories({
    familyId: familyId ?? undefined,
    month: monthFilter,
    tags: selectedTags,
    highlightsOnly,
    pageSize: 5,
  })

  const displayItems = useMemo(() => {
    if (!activeUpload || (activeUpload.status !== 'uploading' && activeUpload.status !== 'processing')) {
      return items
    }

    const existingById = new Set(items.map((item) => item.id))
    if (activeUpload.memoryId && existingById.has(activeUpload.memoryId)) {
      return items
    }

    const pendingItem: MemoryListItem = {
      id: activeUpload.memoryId ?? `${PENDING_MEMORY_PREFIX}${activeUpload.clientId}`,
      createdAt: activeUpload.startedAt,
      recordedAt: activeUpload.recordedAt,
      status: 'PROCESSING',
      isHighlight: false,
      title: null,
      transcriptSnippet: 'Saving your moment…',
      tags: [],
    }

    return [pendingItem, ...items]
  }, [activeUpload, items])

  const effectiveItems = useMemo(
    () =>
      displayItems.map((item) => {
        const override = highlightOverrides[item.id]
        if (typeof override !== 'boolean' || override === item.isHighlight) {
          return item
        }
        return { ...item, isHighlight: override }
      }),
    [displayItems, highlightOverrides],
  )

  const monthOptions = useMemo(() => collectMonthOptions(effectiveItems), [effectiveItems])

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') {
      return 'All months'
    }
    return monthOptions.find((option) => option.key === selectedMonth)?.label || selectedMonth
  }, [monthOptions, selectedMonth])

  const timelineItems = useMemo(
    () => (highlightsOnly ? effectiveItems.filter((item) => item.isHighlight) : effectiveItems),
    [effectiveItems, highlightsOnly],
  )

  const groups = useMemo(() => groupByMonth(timelineItems), [timelineItems])

  const hasActiveFilters = selectedMonth !== 'all' || selectedTags.length > 0 || highlightsOnly
  const activeFilterCount = (selectedMonth !== 'all' ? 1 : 0) + (selectedTags.length > 0 ? 1 : 0) + (highlightsOnly ? 1 : 0)
  const filterSummary = useMemo(() => {
    const monthPart = selectedMonth === 'all' ? 'All months' : selectedMonthLabel
    const tagsPart =
      selectedTags.length === 0
        ? 'No tags'
        : selectedTags.length === 1
          ? selectedTags[0]
          : `${selectedTags[0]} +${selectedTags.length - 1}`
    const highlightPart = highlightsOnly ? 'Highlights only' : null
    return [monthPart, tagsPart, highlightPart].filter(Boolean).join(' · ')
  }, [highlightsOnly, selectedMonth, selectedMonthLabel, selectedTags])

  const openFilters = () => {
    setDraftMonth(selectedMonth)
    setDraftTags(selectedTags)
    setDraftHighlightsOnly(highlightsOnly)
    setFilterSheetOpen(true)
  }

  const applyFilters = () => {
    setSelectedMonth(draftMonth)
    setSelectedTags(draftTags)
    setHighlightsOnly(draftHighlightsOnly)
    setFilterSheetOpen(false)
  }

  const clearFilters = () => {
    setDraftMonth('all')
    setDraftTags([])
    setDraftHighlightsOnly(false)
  }

  const toggleDraftTag = (tag: MemoryTag) => {
    setDraftTags((current) => (current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]))
  }

  useEffect(() => {
    hasShownLoadMoreHintRef.current = false
    setShowLoadMoreHint(false)
  }, [highlightsOnly, monthFilter, selectedTags])

  useEffect(() => {
    const baseById = new Map(displayItems.map((item) => [item.id, item.isHighlight]))
    setHighlightOverrides((current) => {
      const next: Record<string, boolean> = {}
      for (const [memoryId, value] of Object.entries(current)) {
        const baseValue = baseById.get(memoryId)
        if (typeof baseValue !== 'boolean') {
          continue
        }
        if (baseValue !== value) {
          next[memoryId] = value
        }
      }
      const currentEntries = Object.entries(current)
      const nextEntries = Object.entries(next)
      if (currentEntries.length !== nextEntries.length) {
        return next
      }
      for (const [memoryId, value] of currentEntries) {
        if (next[memoryId] !== value) {
          return next
        }
      }
      return current
    })
  }, [displayItems])

  useEffect(() => {
    if (!activeUpload || activeUpload.status !== 'processing' || !activeUpload.memoryId) {
      stopPolling()
      return
    }

    startPolling(activeUpload.memoryId)
    return () => stopPolling()
  }, [activeUpload, startPolling, stopPolling])

  useEffect(() => {
    if (!activeUpload || activeUpload.status !== 'processing') {
      return
    }

    if (processingStatus === 'READY') {
      setActiveUploadStatusFromPolling('READY')
      void reload()
      return
    }

    if (processingStatus === 'FAILED') {
      setActiveUploadStatusFromPolling('FAILED', processingError)
      void reload()
    }
  }, [activeUpload, processingError, processingStatus, reload])

  useEffect(() => {
    if (!activeUpload) {
      return
    }
    if (activeUpload.status !== 'ready' && activeUpload.status !== 'failed') {
      return
    }

    const marker = `${activeUpload.clientId}:${activeUpload.status}`
    if (lastSettledUploadRef.current === marker) {
      return
    }
    lastSettledUploadRef.current = marker
    void reload()
  }, [activeUpload, reload])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('pending')) {
      return
    }

    if (activeUpload && (activeUpload.status === 'uploading' || activeUpload.status === 'processing')) {
      return
    }

    window.history.replaceState({}, '', '/memories')
  }, [activeUpload])

  useEffect(() => {
    const node = loadMoreSentinelRef.current
    if (!node) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setNearListEnd(Boolean(entries[0]?.isIntersecting))
      },
      {
        root: null,
        rootMargin: '0px 0px 220px 0px',
        threshold: 0,
      },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [groups.length, hasMore])

  useEffect(() => {
    if (!nearListEnd || !hasMore || loadingInitial || loadingMore || loadMoreError) {
      return
    }
    void loadMore()
  }, [hasMore, loadMore, loadMoreError, loadingInitial, loadingMore, nearListEnd])

  useEffect(() => {
    if (!nearListEnd || !hasMore || loadingInitial || loadingMore || hasShownLoadMoreHintRef.current) {
      return
    }
    hasShownLoadMoreHintRef.current = true
    setShowLoadMoreHint(true)
    const timer = window.setTimeout(() => setShowLoadMoreHint(false), 2200)
    return () => window.clearTimeout(timer)
  }, [hasMore, loadingInitial, loadingMore, nearListEnd])

  const onRetryProcessing = () => {
    if (activeUpload?.status === 'failed' && retryActiveMemoryUpload()) {
      return
    }

    if (activeUpload?.memoryId) {
      startPolling(activeUpload.memoryId)
    }
    void reload()
  }

  const onToggleHighlight = async (memoryId: string, nextValue: boolean) => {
    if (memoryId.startsWith(PENDING_MEMORY_PREFIX)) {
      return
    }

    setHighlightError('')
    setHighlightOverrides((current) => ({ ...current, [memoryId]: nextValue }))
    setHighlightPendingById((current) => ({ ...current, [memoryId]: true }))

    try {
      await updateMemory(memoryId, { isHighlight: nextValue })
      updateMemoryHighlightInCache(memoryId, nextValue)
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : 'Could not update highlight.'
      setHighlightError(message)
      setHighlightOverrides((current) => {
        const next = { ...current }
        delete next[memoryId]
        return next
      })
    } finally {
      setHighlightPendingById((current) => {
        const next = { ...current }
        delete next[memoryId]
        return next
      })
    }
  }

  const processingBanner = (() => {
    if (!activeUpload) {
      return null
    }

    if (activeUpload.status === 'uploading') {
      return (
        <StatusBanner
          title="Saving your moment… It will appear here shortly."
          detail="You can keep scrolling."
        />
      )
    }

    if (activeUpload.status === 'processing') {
      if (processingStatus === 'TIMEOUT') {
        return (
          <StatusBanner
            title="Still saving your moment."
            detail="This is taking longer than usual. You can keep using the app."
            actionLabel="Refresh"
            onAction={onRetryProcessing}
          />
        )
      }

      return (
        <StatusBanner
          title="Saving your moment… It will appear here shortly."
          detail={isProcessingPolling ? 'You can keep scrolling.' : undefined}
        />
      )
    }

    if (activeUpload.status === 'failed') {
      return (
        <StatusBanner
          tone="error"
          title="We couldn’t finish saving this moment."
          detail={activeUpload.errorMessage || processingError || 'Please try again.'}
          actionLabel="Try again"
          onAction={onRetryProcessing}
        />
      )
    }

    return null
  })()

  const headerBlock = (
    <StickyHeader>
      <HeadingRow>
        <Heading>Memories</Heading>
        <FilterButton type="button" $active={hasActiveFilters} onClick={openFilters} aria-label="Open filters">
          <FilterGlyph />
          {activeFilterCount > 0 ? <FilterBadge>{activeFilterCount}</FilterBadge> : null}
        </FilterButton>
      </HeadingRow>
      <FilterSummary>{filterSummary}</FilterSummary>
    </StickyHeader>
  )

  if (loadingInitial) {
    return (
      <PageContainer>
        <PageShell>
        <Section>
          {headerBlock}
          {processingBanner}
          <EmptyText>Loading your moments...</EmptyText>
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </Section>
        </PageShell>
      </PageContainer>
    )
  }

  if (error && items.length === 0) {
    return (
      <PageContainer>
        <PageShell>
        <Section>
          {headerBlock}
          {processingBanner}
          <ErrorText>{error}</ErrorText>
            <Button variant="primary" onClick={reload}>
              Try again
            </Button>
          </Section>
        </PageShell>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageShell>
        <Section>
          {headerBlock}
          {processingBanner}
          {highlightError ? <ErrorText>{highlightError}</ErrorText> : null}

          {groups.length === 0 ? (
            <EmptyState>
              {highlightsOnly ? (
                <>
                  <EmptyTitle>No highlights yet</EmptyTitle>
                  <EmptyText>Mark meaningful memories with the bookmark icon to find them here later.</EmptyText>
                </>
              ) : (
                <EmptyText>No moments match these filters.</EmptyText>
              )}
              <Button variant="primary" onClick={() => navigate('/record')}>
                Record moment
              </Button>
            </EmptyState>
          ) : (
            <>
              <Groups>
                {groups.map((group) => (
                  <Group key={group.key}>
                    <GroupTitle>{group.label}</GroupTitle>
                    {group.items.map((item, index) => (
                      <MemoryListItemCard
                        key={item.id}
                        item={item}
                        isLastInGroup={index === group.items.length - 1}
                        onOpen={(id) => {
                          if (id.startsWith(PENDING_MEMORY_PREFIX)) {
                            return
                          }
                          navigate(`/memories/${id}`)
                        }}
                        onToggleHighlight={onToggleHighlight}
                        highlightBusy={
                          Boolean(highlightPendingById[item.id]) || item.id.startsWith(PENDING_MEMORY_PREFIX)
                        }
                      />
                    ))}
                  </Group>
                ))}
              </Groups>

              <FooterArea aria-live="polite">
                {showLoadMoreHint && hasMore && !loadingMore && !loadMoreError && (
                  <FooterText>Scroll to load more</FooterText>
                )}

                {loadingMore && <FooterText>Loading more...</FooterText>}

                {!loadingMore && loadMoreError && (
                  <>
                    <FooterText>{loadMoreError}</FooterText>
                    <RetryLoadMoreButton type="button" onClick={retryLoadMore}>
                      Retry
                    </RetryLoadMoreButton>
                  </>
                )}

                {!hasMore && !loadingMore && <FooterText>You&apos;re all caught up.</FooterText>}

                <ScrollSentinel ref={loadMoreSentinelRef} aria-hidden />
              </FooterArea>
            </>
          )}
        </Section>
        <BottomSheet
          open={filterSheetOpen}
          title="Filters"
          onClose={() => setFilterSheetOpen(false)}
          footer={
            <SheetFooter>
              <Button type="button" onClick={clearFilters}>
                Clear
              </Button>
              <Button variant="primary" type="button" onClick={applyFilters}>
                Apply
              </Button>
            </SheetFooter>
          }
        >
          <SheetSection>
            <SheetHeading>Month</SheetHeading>
            <SheetRow
              type="button"
              $selected={draftMonth === 'all'}
              onClick={() => setDraftMonth('all')}
              aria-pressed={draftMonth === 'all'}
            >
              All months
              {draftMonth === 'all' ? <CheckGlyph /> : null}
            </SheetRow>
            {monthOptions.map((option) => (
              <SheetRow
                key={option.key}
                type="button"
                $selected={draftMonth === option.key}
                onClick={() => setDraftMonth(option.key)}
                aria-pressed={draftMonth === option.key}
              >
                {option.label}
                {draftMonth === option.key ? <CheckGlyph /> : null}
              </SheetRow>
            ))}
          </SheetSection>

          <SheetSection>
            <SheetHeading>Tags</SheetHeading>
            <SheetSubtleText>Pick up to two tags for a cleaner timeline.</SheetSubtleText>
            <SheetTags>
              {MEMORY_TAG_OPTIONS.map((tag) => (
                <SheetTag
                  key={tag}
                  type="button"
                  $selected={draftTags.includes(tag)}
                  onClick={() => toggleDraftTag(tag)}
                  aria-pressed={draftTags.includes(tag)}
                >
                  {tag}
                </SheetTag>
              ))}
            </SheetTags>
          </SheetSection>

          <SheetSection>
            <SheetHeading>Highlights</SheetHeading>
            <SheetRow
              type="button"
              $selected={draftHighlightsOnly}
              onClick={() => setDraftHighlightsOnly((current) => !current)}
              aria-pressed={draftHighlightsOnly}
            >
              Show highlights only
              {draftHighlightsOnly ? <CheckGlyph /> : null}
            </SheetRow>
          </SheetSection>
        </BottomSheet>
      </PageShell>
    </PageContainer>
  )
}
