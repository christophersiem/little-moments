import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoriesPage } from './MemoriesPage'
import { renderWithProviders } from '../test/renderWithProviders'
import type { MemoryListItem } from '../features/memories/types'

const { usePaginatedMemoriesMock, useActiveMemoryUploadMock, useProcessingMemoryMock } = vi.hoisted(() => ({
  usePaginatedMemoriesMock: vi.fn(),
  useActiveMemoryUploadMock: vi.fn(),
  useProcessingMemoryMock: vi.fn(),
}))

vi.mock('../features/memories/hooks/usePaginatedMemories', () => ({
  usePaginatedMemories: usePaginatedMemoriesMock,
  updateMemoryHighlightInCache: vi.fn(),
}))

vi.mock('../features/memories/hooks/uploadSessionStore', () => ({
  useActiveMemoryUpload: useActiveMemoryUploadMock,
  retryActiveMemoryUpload: vi.fn(() => false),
  setActiveUploadStatusFromPolling: vi.fn(),
}))

vi.mock('../features/memories/hooks/useProcessingMemory', () => ({
  useProcessingMemory: useProcessingMemoryMock,
}))

vi.mock('../features/memories/api', () => ({
  updateMemory: vi.fn(),
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

function setDefaultHookState(items: MemoryListItem[] = []) {
  usePaginatedMemoriesMock.mockReturnValue({
    items,
    loadingInitial: false,
    loadingMore: false,
    error: '',
    loadMoreError: '',
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    retryLoadMore: vi.fn(),
    reload: vi.fn(async () => undefined),
  })
  useActiveMemoryUploadMock.mockReturnValue(null)
  useProcessingMemoryMock.mockReturnValue({
    status: 'IDLE',
    error: '',
    isPolling: false,
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    refreshNow: vi.fn(async () => undefined),
  })
}

describe('MemoriesPage', () => {
  it('renders loading state', () => {
    setDefaultHookState()
    usePaginatedMemoriesMock.mockReturnValue({
      items: [],
      loadingInitial: true,
      loadingMore: false,
      error: '',
      loadMoreError: '',
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      retryLoadMore: vi.fn(),
      reload: vi.fn(async () => undefined),
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

  it('renders empty state when no memories are returned', () => {
    setDefaultHookState([])

    renderWithProviders(<MemoriesPage navigate={vi.fn()} familyId="family-1" />)

    expect(screen.getByText('No moments match these filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record moment/i })).toBeInTheDocument()
  })

  it('renders processing banner when upload is in progress', () => {
    setDefaultHookState([])
    useActiveMemoryUploadMock.mockReturnValue({
      clientId: 'client-123',
      startedAt: '2026-02-10T10:00:00Z',
      recordedAt: '2026-02-10T10:00:00Z',
      childId: 'child-1',
      status: 'uploading',
      ids: [],
      count: 0,
    })

    renderWithProviders(<MemoriesPage navigate={vi.fn()} familyId="family-1" />)

    const banner = screen.getByRole('status')
    expect(within(banner).getByText('Saving your moment… It will appear here shortly.')).toBeInTheDocument()
    expect(within(banner).getByText('You can keep scrolling.')).toBeInTheDocument()
  })
})
