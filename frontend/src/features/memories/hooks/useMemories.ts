import { usePaginatedMemories } from './usePaginatedMemories'
import type { MemoryListItem, MemoryTag } from '../types'

const DEFAULT_PAGE_SIZE = 5

interface UseMemoriesOptions {
  familyId: string | null
  month: string
  tags: MemoryTag[]
  highlightsOnly: boolean
  pageSize?: number
}

export interface UseMemoriesResult {
  memories: MemoryListItem[]
  loading: boolean
  loadingMore: boolean
  error: string
  loadMoreError: string
  hasMore: boolean
  loadMore: () => Promise<void>
  retryLoadMore: () => void
  reload: () => void
}

export function useMemories({
  familyId,
  month,
  tags,
  highlightsOnly,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseMemoriesOptions): UseMemoriesResult {
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
    month: month !== 'all' ? month : undefined,
    tags,
    highlightsOnly,
    pageSize,
  })

  return {
    memories: items,
    loading: loadingInitial,
    loadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    retryLoadMore,
    reload,
  }
}
