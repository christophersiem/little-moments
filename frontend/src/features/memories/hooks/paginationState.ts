import type { MemoriesListResponse, MemoryListItem } from '../types'

export interface PaginationState {
  items: MemoryListItem[]
  nextPage: number
  hasMore: boolean
  totalElements: number
}

function mergeMemoryItems(current: MemoryListItem[], next: MemoryListItem[]): MemoryListItem[] {
  const merged = [...current]
  const knownIds = new Set(current.map((item) => item.id))

  for (const item of next) {
    if (!knownIds.has(item.id)) {
      merged.push(item)
      knownIds.add(item.id)
    }
  }

  return merged
}

export function hasMoreMemories(payload: MemoriesListResponse, loadedCount: number): boolean {
  const hasMoreByTotalPages = payload.page + 1 < payload.totalPages
  const hasMoreByTotalElements = loadedCount < payload.totalElements
  return hasMoreByTotalPages || hasMoreByTotalElements
}

export function appendMemoriesPage(
  currentState: PaginationState,
  payload: MemoriesListResponse,
): PaginationState {
  const mergedItems = mergeMemoryItems(currentState.items, payload.items)
  return {
    items: mergedItems,
    nextPage: payload.page + 1,
    hasMore: hasMoreMemories(payload, mergedItems.length),
    totalElements: payload.totalElements,
  }
}
