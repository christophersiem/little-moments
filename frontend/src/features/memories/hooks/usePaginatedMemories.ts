import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listMemories } from '../api'
import type { Memory, MemoryListItem, MemoryTag } from '../types'
import { appendMemoriesPage, type PaginationState } from './paginationState'

const DEFAULT_PAGE_SIZE = 5
const MEMORY_CACHE_TTL_MS = 60_000

interface CachedMemoriesState {
  items: MemoryListItem[]
  hasMore: boolean
  nextPage: number
  cachedAt: number
}

interface CachedMemoriesLookup {
  state: CachedMemoriesState
  isStale: boolean
}

const memoriesCache = new Map<string, CachedMemoriesState>()

function toListSnippet(transcript: string | null): string {
  if (!transcript) {
    return ''
  }
  const normalized = transcript.trim().replace(/\s+/g, ' ')
  if (normalized.length <= 180) {
    return normalized
  }
  return `${normalized.slice(0, 177).trimEnd()}...`
}

export function updateMemoryHighlightInCache(memoryId: string, isHighlight: boolean): void {
  for (const [queryKey, cached] of memoriesCache.entries()) {
    let hasChanged = false
    const nextItems = cached.items.map((item) => {
      if (item.id !== memoryId || item.isHighlight === isHighlight) {
        return item
      }
      hasChanged = true
      return {
        ...item,
        isHighlight,
      }
    })

    if (!hasChanged) {
      continue
    }

    memoriesCache.set(queryKey, {
      ...cached,
      items: nextItems,
      cachedAt: Date.now(),
    })
  }
}

export function updateMemoryInCache(memory: Memory): void {
  for (const [queryKey, cached] of memoriesCache.entries()) {
    let hasChanged = false
    const nextItems = cached.items.map((item) => {
      if (item.id !== memory.id) {
        return item
      }

      hasChanged = true
      return {
        ...item,
        title: memory.title,
        transcriptSnippet: toListSnippet(memory.transcript),
        tags: memory.tags,
        isHighlight: memory.isHighlight,
        recordedAt: memory.recordedAt,
        status: memory.status,
      }
    })

    if (!hasChanged) {
      continue
    }

    memoriesCache.set(queryKey, {
      ...cached,
      items: nextItems,
      cachedAt: Date.now(),
    })
  }
}

export function removeMemoryFromCache(memoryId: string): void {
  for (const [queryKey, cached] of memoriesCache.entries()) {
    const nextItems = cached.items.filter((item) => item.id !== memoryId)
    if (nextItems.length === cached.items.length) {
      continue
    }

    memoriesCache.set(queryKey, {
      ...cached,
      items: nextItems,
      cachedAt: Date.now(),
    })
  }
}

interface PaginatedMemoriesQuery {
  familyId?: string
  month?: string
  tags?: MemoryTag[]
  highlightsOnly?: boolean
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

function readCachedState(queryKey: string, includeStale = false): CachedMemoriesLookup | null {
  const cached = memoriesCache.get(queryKey)
  if (!cached) {
    return null
  }

  const isStale = Date.now() - cached.cachedAt > MEMORY_CACHE_TTL_MS
  if (isStale && !includeStale) {
    memoriesCache.delete(queryKey)
    return null
  }

  return {
    state: cached,
    isStale,
  }
}

function writeCachedState(queryKey: string, state: Omit<CachedMemoriesState, 'cachedAt'>): void {
  memoriesCache.set(queryKey, {
    ...state,
    cachedAt: Date.now(),
  })
}

export function usePaginatedMemories({
  familyId,
  month,
  tags = [],
  highlightsOnly = false,
  pageSize = DEFAULT_PAGE_SIZE,
}: PaginatedMemoriesQuery = {}): PaginatedMemoriesState {
  const normalizedTags = useMemo(() => normalizeTags(tags), [tags])
  const normalizedFamilyId = familyId?.trim() || undefined
  const normalizedMonth = month && month !== 'all' ? month : undefined
  const queryKey = useMemo(
    () =>
      `${normalizedFamilyId ?? ''}::${normalizedMonth ?? ''}::${normalizedTags.join('|')}::${highlightsOnly}::${pageSize}`,
    [highlightsOnly, normalizedFamilyId, normalizedMonth, normalizedTags, pageSize],
  )
  const cachedLookup = useMemo(() => readCachedState(queryKey, true), [queryKey])

  const [items, setItems] = useState<MemoryListItem[]>(() => cachedLookup?.state.items ?? [])
  const [loadingInitial, setLoadingInitial] = useState(() => !cachedLookup)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const [hasMore, setHasMore] = useState(() => cachedLookup?.state.hasMore ?? false)
  const [reloadIndex, setReloadIndex] = useState(0)

  const requestVersionRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const nextPageRef = useRef(cachedLookup?.state.nextPage ?? 0)
  const hasMoreRef = useRef(cachedLookup?.state.hasMore ?? false)
  const itemsRef = useRef<MemoryListItem[]>(cachedLookup?.state.items ?? [])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    const cached = readCachedState(queryKey, true)
    if (!cached) {
      return
    }
    itemsRef.current = cached.state.items
    nextPageRef.current = cached.state.nextPage
    hasMoreRef.current = cached.state.hasMore
    setItems(cached.state.items)
    setHasMore(cached.state.hasMore)
    setLoadingInitial(false)
    setError('')
  }, [queryKey])

  const reload = useCallback(() => {
    setReloadIndex((current) => current + 1)
  }, [])

  const loadInitial = useCallback(async (forceRefresh = false) => {
    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion

    if (!forceRefresh) {
      const cached = readCachedState(queryKey, true)
      if (cached && !cached.isStale) {
        itemsRef.current = cached.state.items
        nextPageRef.current = cached.state.nextPage
        hasMoreRef.current = cached.state.hasMore
        setItems(cached.state.items)
        setHasMore(cached.state.hasMore)
        setLoadingInitial(false)
        setError('')
        setLoadMoreError('')
        return
      }
    }

    const hasVisibleItems = itemsRef.current.length > 0
    setLoadingInitial(!hasVisibleItems)
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
        highlights: highlightsOnly,
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
      writeCachedState(queryKey, {
        items: nextState.items,
        hasMore: nextState.hasMore,
        nextPage: nextState.nextPage,
      })
    } catch (loadError) {
      if (requestVersion !== requestVersionRef.current) {
        return
      }
      if (!hasVisibleItems) {
        itemsRef.current = []
        nextPageRef.current = 0
        hasMoreRef.current = false
        setItems([])
        setHasMore(false)
      }
      setError(toErrorMessage(loadError))
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoadingInitial(false)
      }
    }
  }, [highlightsOnly, normalizedFamilyId, normalizedMonth, normalizedTags, pageSize, queryKey])

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
        highlights: highlightsOnly,
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
      writeCachedState(queryKey, {
        items: nextState.items,
        hasMore: nextState.hasMore,
        nextPage: nextState.nextPage,
      })
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
  }, [highlightsOnly, loadingInitial, normalizedFamilyId, normalizedMonth, normalizedTags, pageSize, queryKey])

  const retryLoadMore = useCallback(() => {
    void loadMore()
  }, [loadMore])

  useEffect(() => {
    void loadInitial(reloadIndex > 0)
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
