import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { PageContainer } from '../components/PageContainer'
import { StatusBanner } from '../components/StatusBanner'
import { FilterSheet } from '../features/memories/components/FilterSheet'
import { MemoryListItemCard } from '../features/memories/components/MemoryListItemCard'
import { buildFilterSummary, getActiveFilterCount } from '../features/memories/filterSummary'
import { setActiveUploadStatusFromPolling, retryActiveMemoryUpload, useActiveMemoryUpload } from '../features/memories/hooks/uploadSessionStore'
import { usePaginatedMemories } from '../features/memories/hooks/usePaginatedMemories'
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
  gap: ${({ theme }) => theme.space.x5};
`

const PageShell = styled.div`
  position: relative;
  min-height: 100vh;
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x3};
`

const Heading = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.h1Size};
  color: ${({ theme }) => theme.colors.text};
`

const FilterToggle = styled.button`
  position: relative;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  border-radius: 50%;
  cursor: pointer;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  min-width: ${({ theme }) => theme.layout.minTouchTarget};
  width: ${({ theme }) => theme.layout.minTouchTarget};
  height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const FilterIcon = styled.svg`
  width: 18px;
  height: 18px;
  display: block;
`

const FilterSummaryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
  margin-top: calc(${({ theme }) => theme.space.x2} * -1);
`

const FilterSummaryText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
`

const FilterToggleBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.accentStrong};
  color: ${({ theme }) => theme.colors.onAccent};
  font-size: 0.65rem;
  line-height: 1;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ClearFilters = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.accentStrong};
  cursor: pointer;
  min-height: 32px;
  padding: 0;
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
`

const GroupTitle = styled.h3`
  margin: 0;
  padding: ${({ theme }) => `${theme.space.x1} 0 ${theme.space.x2}`};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-size: ${({ theme }) => theme.typography.h2Size};
  font-weight: 500;
`

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x5};
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

export function MemoriesPage({ navigate, familyId }: MemoriesPageProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedTags, setSelectedTags] = useState<MemoryTag[]>([])
  const [filterAnchorTop, setFilterAnchorTop] = useState(0)
  const [filterAnchorRight, setFilterAnchorRight] = useState(0)
  const pageShellRef = useRef<HTMLDivElement | null>(null)
  const filterToggleRef = useRef<HTMLButtonElement | null>(null)
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
      title: null,
      transcriptSnippet: 'Saving your moment…',
      tags: [],
    }

    return [pendingItem, ...items]
  }, [activeUpload, items])

  const monthOptions = useMemo(() => collectMonthOptions(displayItems), [displayItems])

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') {
      return 'All months'
    }
    return monthOptions.find((option) => option.key === selectedMonth)?.label || selectedMonth
  }, [monthOptions, selectedMonth])

  const groups = useMemo(() => groupByMonth(displayItems), [displayItems])

  const hasActiveFilters = selectedMonth !== 'all' || selectedTags.length > 0
  const activeFilterCount = useMemo(
    () => getActiveFilterCount(selectedMonth, selectedTags),
    [selectedMonth, selectedTags],
  )
  const filterSummary = useMemo(
    () => buildFilterSummary(selectedMonth, selectedMonthLabel, selectedTags),
    [selectedMonth, selectedMonthLabel, selectedTags],
  )

  const clearFilters = () => {
    setSelectedMonth('all')
    setSelectedTags([])
  }

  const updateFilterAnchor = () => {
    const shell = pageShellRef.current
    const toggle = filterToggleRef.current
    if (!shell || !toggle) {
      return
    }
    const shellRect = shell.getBoundingClientRect()
    const toggleRect = toggle.getBoundingClientRect()
    const top = toggleRect.bottom - shellRect.top + 8
    const right = shellRect.right - toggleRect.right
    setFilterAnchorTop(Math.max(top, 0))
    setFilterAnchorRight(Math.max(right, 0))
  }

  useEffect(() => {
    if (!filtersOpen) {
      return
    }
    updateFilterAnchor()

    const handleViewportChange = () => updateFilterAnchor()
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
    }
  }, [filtersOpen])

  useEffect(() => {
    hasShownLoadMoreHintRef.current = false
    setShowLoadMoreHint(false)
  }, [monthFilter, selectedTags])

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

  if (loadingInitial) {
    return (
      <PageContainer>
        <Section>
          <Heading>Memories</Heading>
          {processingBanner}
          <EmptyText>Loading your moments...</EmptyText>
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </Section>
      </PageContainer>
    )
  }

  if (error && items.length === 0) {
    return (
      <PageContainer>
        <Section>
          <Heading>Memories</Heading>
          {processingBanner}
          <ErrorText>{error}</ErrorText>
          <Button variant="primary" onClick={reload}>
            Try again
          </Button>
        </Section>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageShell ref={pageShellRef}>
        <Section>
        <HeadingRow>
          <Heading>Memories</Heading>
          <FilterToggle
            ref={filterToggleRef}
            type="button"
            onClick={() => {
              updateFilterAnchor()
              setFiltersOpen(true)
            }}
            aria-label="Open filters"
            aria-expanded={filtersOpen}
          >
            <FilterIcon viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6H20L14 13V18L10 20V13L4 6Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </FilterIcon>
            {activeFilterCount > 0 && (
              <FilterToggleBadge aria-hidden>{activeFilterCount > 9 ? '9+' : activeFilterCount}</FilterToggleBadge>
            )}
          </FilterToggle>
        </HeadingRow>
        <FilterSummaryRow>
          <FilterSummaryText>{filterSummary}</FilterSummaryText>
          {hasActiveFilters && (
            <ClearFilters type="button" onClick={clearFilters}>
              Clear
            </ClearFilters>
          )}
        </FilterSummaryRow>

        {processingBanner}

        {groups.length === 0 ? (
          <EmptyState>
            <EmptyText>No moments match these filters.</EmptyText>
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
        <FilterSheet
          open={filtersOpen}
          monthOptions={monthOptions}
          selectedMonth={selectedMonth}
          selectedTags={selectedTags}
          anchorTop={filterAnchorTop}
          anchorRight={filterAnchorRight}
          onApply={(month, tags) => {
            setSelectedMonth(month)
            setSelectedTags(tags)
          }}
          onClose={() => setFiltersOpen(false)}
        />
      </PageShell>
    </PageContainer>
  )
}
