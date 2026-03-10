import { useMemo } from 'react'
import styled from 'styled-components'
import { APP_ROUTES, toMemoryDetailPath } from '../app/routes'
import { Button } from '../components/Button'
import { PageContainer } from '../components/PageContainer'
import { MemoriesEmptyState } from '../features/memories/components/MemoriesEmptyState'
import { MemoriesFilterSheet } from '../features/memories/components/MemoriesFilterSheet'
import { MemoriesHeader } from '../features/memories/components/MemoriesHeader'
import { MemoriesTimeline } from '../features/memories/components/MemoriesTimeline'
import { ProcessingBanner } from '../features/memories/components/ProcessingBanner'
import { useMemories } from '../features/memories/hooks/useMemories'
import { useMemoriesFilter } from '../features/memories/hooks/useMemoriesFilter'
import { useMemoriesInfiniteScroll } from '../features/memories/hooks/useMemoriesInfiniteScroll'
import { useMemoriesProcessing } from '../features/memories/hooks/useMemoriesProcessing'
import { useMemoryHighlights } from '../features/memories/hooks/useMemoryHighlights'
import { collectMonthOptions, groupMemoriesByMonth } from '../features/memories/lib/groupMemoriesByMonth'
import type { MemoryListItem } from '../features/memories/types'

interface MemoriesPageProps {
  navigate: (nextPath: string) => void
  familyId: string | null
}

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
`

const ContentStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
  margin-top: ${({ theme }) => theme.space.x2};
`

const PageShell = styled.div`
  min-height: 100vh;
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

const PENDING_MEMORY_PREFIX = 'pending-memory-'

function toMonthLabel(month: string, monthOptions: Array<{ key: string; label: string }>) {
  if (month === 'all') {
    return 'All months'
  }
  return monthOptions.find((option) => option.key === month)?.label || month
}

export function MemoriesPage({ navigate, familyId }: MemoriesPageProps) {
  const filters = useMemoriesFilter()
  const {
    memories: items,
    loading,
    loadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    retryLoadMore,
    reload,
  } = useMemories({
    familyId,
    month: filters.selectedMonth,
    tags: filters.selectedTags,
    highlightsOnly: filters.highlightsOnly,
    pageSize: 5,
  })

  const { activeUpload, processingStatus, processingError, isProcessingPolling, onRetryProcessing } =
    useMemoriesProcessing({ reload })

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

  const { effectiveItems, highlightPendingById, highlightError, onToggleHighlight } = useMemoryHighlights({
    items: displayItems,
    pendingMemoryPrefix: PENDING_MEMORY_PREFIX,
  })

  const monthOptions = useMemo(() => collectMonthOptions(effectiveItems), [effectiveItems])
  const selectedMonthLabel = useMemo(
    () => toMonthLabel(filters.selectedMonth, monthOptions),
    [filters.selectedMonth, monthOptions],
  )
  const draftMonthLabel = useMemo(() => toMonthLabel(filters.draftMonth, monthOptions), [filters.draftMonth, monthOptions])

  const timelineItems = useMemo(
    () => (filters.highlightsOnly ? effectiveItems.filter((item) => item.isHighlight) : effectiveItems),
    [effectiveItems, filters.highlightsOnly],
  )
  const groups = useMemo(() => groupMemoriesByMonth(timelineItems), [timelineItems])

  const filterSummary = useMemo(() => {
    const monthPart = filters.selectedMonth === 'all' ? 'All months' : selectedMonthLabel
    const tagsPart =
      filters.selectedTags.length === 0
        ? 'No tags'
        : filters.selectedTags.length === 1
          ? filters.selectedTags[0]
          : `${filters.selectedTags[0]} +${filters.selectedTags.length - 1}`
    const highlightPart = filters.highlightsOnly ? 'Highlights only' : null
    return [monthPart, tagsPart, highlightPart].filter(Boolean).join(' · ')
  }, [filters.highlightsOnly, filters.selectedMonth, filters.selectedTags, selectedMonthLabel])

  const { loadMoreSentinelRef, showLoadMoreHint } = useMemoriesInfiniteScroll({
    hasMore,
    loading,
    loadingMore,
    loadMoreError,
    loadMore,
    groupsLength: groups.length,
    selectedMonth: filters.selectedMonth,
    selectedTags: filters.selectedTags,
    highlightsOnly: filters.highlightsOnly,
  })

  const headerBlock = (
    <MemoriesHeader
      hasActiveFilters={filters.hasActiveFilters}
      activeFilterCount={filters.activeFilterCount}
      filterSummary={filterSummary}
      onOpenFilters={filters.openFilters}
    />
  )

  const processingBanner = (
    <ProcessingBanner
      activeUpload={activeUpload}
      processingStatus={processingStatus}
      processingError={processingError}
      isProcessingPolling={isProcessingPolling}
      onRetry={onRetryProcessing}
    />
  )

  if (loading) {
    return (
      <PageContainer>
        <PageShell>
          <Section>
            {headerBlock}
            <ContentStack>
              {processingBanner}
              <EmptyText>Loading your moments...</EmptyText>
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </ContentStack>
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
            <ContentStack>
              {processingBanner}
              <ErrorText>{error}</ErrorText>
              <Button variant="primary" onClick={reload}>
                Try again
              </Button>
            </ContentStack>
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
          <ContentStack>
            {processingBanner}
            {highlightError ? <ErrorText>{highlightError}</ErrorText> : null}

            {groups.length === 0 ? (
              <MemoriesEmptyState highlightsOnly={filters.highlightsOnly} onRecordMoment={() => navigate(APP_ROUTES.record)} />
            ) : (
              <MemoriesTimeline
                groups={groups}
                pendingMemoryPrefix={PENDING_MEMORY_PREFIX}
                highlightPendingById={highlightPendingById}
                onOpenMemory={(id) => navigate(toMemoryDetailPath(id))}
                onToggleHighlight={onToggleHighlight}
                showLoadMoreHint={showLoadMoreHint}
                hasMore={hasMore}
                loadingMore={loadingMore}
                loadMoreError={loadMoreError}
                onRetryLoadMore={retryLoadMore}
                loadMoreSentinelRef={loadMoreSentinelRef}
              />
            )}
          </ContentStack>
        </Section>

        <MemoriesFilterSheet
          filterSheetOpen={filters.filterSheetOpen}
          monthPickerOpen={filters.monthPickerOpen}
          monthOptions={monthOptions}
          draftMonth={filters.draftMonth}
          draftMonthLabel={draftMonthLabel}
          draftTags={filters.draftTags}
          draftHighlightsOnly={filters.draftHighlightsOnly}
          onCloseFilters={filters.closeFilters}
          onClearFilters={filters.clearFilters}
          onApplyFilters={filters.applyFilters}
          onOpenMonthPicker={filters.openMonthPicker}
          onCloseMonthPicker={filters.closeMonthPickerToFilters}
          onSelectDraftMonth={filters.selectDraftMonth}
          onToggleDraftTag={filters.toggleDraftTag}
          onToggleDraftHighlightsOnly={filters.toggleDraftHighlightsOnly}
        />
      </PageShell>
    </PageContainer>
  )
}
