import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listMemories } from '../api'
import type { MemoryListItem, MemoryTag } from '../types'
import { appendMemoriesPage, type PaginationState } from './paginationState'

const DEFAULT_PAGE_SIZE = 5

interface PaginatedMemoriesQuery {
  familyId?: string
  month?: string
  tags?: MemoryTag[]
  pageSize?: number
}

export interface PaginatedMemoriesState {
  items: MemoryListItem[]
  loadingInitial: boolean
  loadingMore: boolean
  error: string
  loadMoreError: string
  hasMore: boolean
  loadMore: () => Promise<void>
  retryLoadMore: () => void
  reload: () => void
}

function normalizeTags(tags: MemoryTag[]): MemoryTag[] {
  return Array.from(new Set(tags)).sort((left, right) => left.localeCompare(right))
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not load memories.'
}

export function usePaginatedMemories({
  familyId,
  month,
  tags = [],
  pageSize = DEFAULT_PAGE_SIZE,
}: PaginatedMemoriesQuery = {}): PaginatedMemoriesState {
  const [items, setItems] = useState<MemoryListItem[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [reloadIndex, setReloadIndex] = useState(0)

  const requestVersionRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const nextPageRef = useRef(0)
  const hasMoreRef = useRef(false)
  const itemsRef = useRef<MemoryListItem[]>([])

  const normalizedTags = useMemo(() => normalizeTags(tags), [tags])
  const normalizedFamilyId = familyId?.trim() || undefined
  const normalizedMonth = month && month !== 'all' ? month : undefined
  const queryKey = useMemo(
    () => `${normalizedFamilyId ?? ''}::${normalizedMonth ?? ''}::${normalizedTags.join('|')}::${pageSize}`,
    [normalizedFamilyId, normalizedMonth, normalizedTags, pageSize],
  )

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const reload = useCallback(() => {
    setReloadIndex((current) => current + 1)
  }, [])

  const loadInitial = useCallback(async () => {
    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion

    setLoadingInitial(true)
    setError('')
    setLoadMoreError('')
    setLoadingMore(false)
    loadingMoreRef.current = false

    const initialState: PaginationState = {
      items: [],
      nextPage: 0,
      hasMore: false,
      totalElements: 0,
    }

    try {
      const payload = await listMemories({
        page: 0,
        size: pageSize,
        familyId: normalizedFamilyId,
        month: normalizedMonth,
        tags: normalizedTags,
      })
      if (requestVersion !== requestVersionRef.current) {
        return
      }

      const nextState = appendMemoriesPage(initialState, payload)
      itemsRef.current = nextState.items
      nextPageRef.current = nextState.nextPage
      hasMoreRef.current = nextState.hasMore
      setItems(nextState.items)
      setHasMore(nextState.hasMore)
    } catch (loadError) {
      if (requestVersion !== requestVersionRef.current) {
        return
      }
      itemsRef.current = []
      nextPageRef.current = 0
      hasMoreRef.current = false
      setItems([])
      setHasMore(false)
      setError(toErrorMessage(loadError))
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoadingInitial(false)
      }
    }
  }, [normalizedFamilyId, normalizedMonth, normalizedTags, pageSize])

  const loadMore = useCallback(async () => {
    if (loadingInitial || loadingMoreRef.current || !hasMoreRef.current) {
      return
    }

    const requestVersion = requestVersionRef.current
    loadingMoreRef.current = true
    setLoadingMore(true)
    setLoadMoreError('')

    try {
      const payload = await listMemories({
        page: nextPageRef.current,
        size: pageSize,
        familyId: normalizedFamilyId,
        month: normalizedMonth,
        tags: normalizedTags,
      })
      if (requestVersion !== requestVersionRef.current) {
        return
      }

      const nextState = appendMemoriesPage(
        {
          items: itemsRef.current,
          nextPage: nextPageRef.current,
          hasMore: hasMoreRef.current,
          totalElements: 0,
        },
        payload,
      )

      itemsRef.current = nextState.items
      nextPageRef.current = nextState.nextPage
      hasMoreRef.current = nextState.hasMore
      setItems(nextState.items)
      setHasMore(nextState.hasMore)
    } catch (loadError) {
      if (requestVersion === requestVersionRef.current) {
        setLoadMoreError(toErrorMessage(loadError))
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    }
  }, [loadingInitial, normalizedFamilyId, normalizedMonth, normalizedTags, pageSize])

  const retryLoadMore = useCallback(() => {
    void loadMore()
  }, [loadMore])

  useEffect(() => {
    void loadInitial()
  }, [loadInitial, reloadIndex, queryKey])

  return {
    items,
    loadingInitial,
    loadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    retryLoadMore,
    reload,
  }
}
