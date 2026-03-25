import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoriesPage } from './MemoriesPage'
import { renderWithProviders } from '../test/renderWithProviders'
import type { MemoryListItem, MemoryTag } from '../features/memories/types'
import { PROCESSING_BANNER_DETAIL, PROCESSING_BANNER_TITLE } from '../features/memories/constants'

const {
  useMemoriesMock,
  useMemoriesFilterMock,
  useMemoriesProcessingMock,
  useMemoriesInfiniteScrollMock,
  useMemoryHighlightsMock,
} = vi.hoisted(() => ({
  useMemoriesMock: vi.fn(),
  useMemoriesFilterMock: vi.fn(),
  useMemoriesProcessingMock: vi.fn(),
  useMemoriesInfiniteScrollMock: vi.fn(),
  useMemoryHighlightsMock: vi.fn(),
}))

vi.mock('../features/memories/hooks/useMemories', () => ({
  useMemories: useMemoriesMock,
}))

vi.mock('../features/memories/hooks/useMemoriesFilter', () => ({
  useMemoriesFilter: useMemoriesFilterMock,
}))

vi.mock('../features/memories/hooks/useMemoriesProcessing', () => ({
  useMemoriesProcessing: useMemoriesProcessingMock,
}))

vi.mock('../features/memories/hooks/useMemoriesInfiniteScroll', () => ({
  useMemoriesInfiniteScroll: useMemoriesInfiniteScrollMock,
}))

vi.mock('../features/memories/hooks/useMemoryHighlights', () => ({
  useMemoryHighlights: useMemoryHighlightsMock,
}))

function buildItem(overrides: Partial<MemoryListItem>): MemoryListItem {
  return {
    id: overrides.id ?? 'memory-1',
    createdAt: overrides.createdAt ?? '2026-02-20T12:00:00Z',
    recordedAt: overrides.recordedAt ?? '2026-02-20T12:00:00Z',
    status: overrides.status ?? 'READY',
    isHighlight: overrides.isHighlight ?? false,
    title: overrides.title ?? 'Memory title',
    transcriptSnippet: overrides.transcriptSnippet ?? 'Snippet',
    tags: overrides.tags ?? [],
  }
}

function buildFilterState(overrides: Partial<ReturnType<typeof defaultFilterState>> = {}) {
  return {
    ...defaultFilterState(),
    ...overrides,
  }
}

function defaultFilterState() {
  return {
    filterSheetOpen: false,
    monthPickerOpen: false,
    selectedMonth: 'all',
    selectedTags: [] as MemoryTag[],
    highlightsOnly: false,
    draftMonth: 'all',
    draftTags: [] as MemoryTag[],
    draftHighlightsOnly: false,
    hasActiveFilters: false,
    activeFilterCount: 0,
    openFilters: vi.fn(),
    closeFilters: vi.fn(),
    applyFilters: vi.fn(),
    clearFilters: vi.fn(),
    openMonthPicker: vi.fn(),
    closeMonthPickerToFilters: vi.fn(),
    selectDraftMonth: vi.fn(),
    toggleDraftTag: vi.fn(),
    toggleDraftHighlightsOnly: vi.fn(),
  }
}

function setDefaultHookState(items: MemoryListItem[] = []) {
  useMemoriesFilterMock.mockReturnValue(buildFilterState())
  useMemoriesMock.mockReturnValue({
    memories: items,
    loading: false,
    loadingMore: false,
    error: '',
    loadMoreError: '',
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    retryLoadMore: vi.fn(),
    reload: vi.fn(),
  })
  useMemoriesProcessingMock.mockReturnValue({
    activeUpload: null,
    processingStatus: 'IDLE',
    processingError: '',
    isProcessingPolling: false,
    onRetryProcessing: vi.fn(),
  })
  useMemoriesInfiniteScrollMock.mockReturnValue({
    loadMoreSentinelRef: { current: null },
    showLoadMoreHint: false,
  })
  useMemoryHighlightsMock.mockImplementation(({ items: effectiveItems }) => ({
    effectiveItems,
    highlightPendingById: {},
    highlightError: '',
    onToggleHighlight: vi.fn(),
  }))
}

describe('MemoriesPage', () => {
  beforeEach(() => {
    setDefaultHookState()
  })

  it('renders loading state', () => {
    useMemoriesMock.mockReturnValue({
      memories: [],
      loading: true,
      loadingMore: false,
      error: '',
      loadMoreError: '',
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      retryLoadMore: vi.fn(),
      reload: vi.fn(),
    })

    renderWithProviders(<MemoriesPage navigate={vi.fn()} familyId="family-1" />)

    expect(screen.getByText('Loading your moments...')).toBeInTheDocument()
  })

  it('renders grouped memories when items are available', () => {
    setDefaultHookState([
      buildItem({ id: 'memory-feb', title: 'February memory', recordedAt: '2026-02-10T10:00:00Z' }),
      buildItem({ id: 'memory-jan', title: 'January memory', recordedAt: '2026-01-10T10:00:00Z' }),
    ])

    renderWithProviders(<MemoriesPage navigate={vi.fn()} familyId="family-1" />)

    expect(screen.getByText('February memory')).toBeInTheDocument()
    expect(screen.getByText('January memory')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThanOrEqual(2)
  })

  it('opens memory chat sheet from header action', async () => {
    const user = userEvent.setup()

    setDefaultHookState([buildItem({ id: 'memory-feb', title: 'February memory', recordedAt: '2026-02-10T10:00:00Z' })])

    renderWithProviders(<MemoriesPage navigate={vi.fn()} familyId="family-1" />)

    await user.click(screen.getByRole('button', { name: /ask your memories/i }))

    expect(screen.getByRole('textbox', { name: /ask your memories/i })).toBeInTheDocument()
  })

  it('renders empty state when no memories are returned', () => {
    setDefaultHookState([])

    renderWithProviders(<MemoriesPage navigate={vi.fn()} familyId="family-1" />)

    expect(screen.getByText('No moments match these filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record moment/i })).toBeInTheDocument()
  })

  it('renders error state and retries load', async () => {
    const user = userEvent.setup()
    const reload = vi.fn()

    useMemoriesMock.mockReturnValue({
      memories: [],
      loading: false,
      loadingMore: false,
      error: 'Could not load memories.',
      loadMoreError: '',
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      retryLoadMore: vi.fn(),
      reload,
    })

    renderWithProviders(<MemoriesPage navigate={vi.fn()} familyId="family-1" />)

    expect(screen.getByText('Could not load memories.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('renders processing banner when upload is in progress', () => {
    setDefaultHookState([])

    useMemoriesProcessingMock.mockReturnValue({
      activeUpload: {
        clientId: 'client-123',
        startedAt: '2026-02-10T10:00:00Z',
        recordedAt: '2026-02-10T10:00:00Z',
        childId: 'child-1',
        status: 'uploading',
        ids: [],
        count: 0,
      },
      processingStatus: 'IDLE',
      processingError: '',
      isProcessingPolling: false,
      onRetryProcessing: vi.fn(),
    })

    renderWithProviders(<MemoriesPage navigate={vi.fn()} familyId="family-1" />)

    const banner = screen.getByRole('status')
    expect(within(banner).getByText(PROCESSING_BANNER_TITLE)).toBeInTheDocument()
    expect(within(banner).getByText(PROCESSING_BANNER_DETAIL)).toBeInTheDocument()
  })

  it('navigates to memory detail when a memory row is opened', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    setDefaultHookState([
      buildItem({ id: 'memory-feb', title: 'February memory', recordedAt: '2026-02-10T10:00:00Z' }),
    ])

    renderWithProviders(<MemoriesPage navigate={navigate} familyId="family-1" />)

    await user.click(screen.getByRole('button', { name: /february memory/i }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/memories/memory-feb')
    })
  })
})
