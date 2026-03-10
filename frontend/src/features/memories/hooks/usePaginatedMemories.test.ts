import { describe, expect, it } from 'vitest'
import type { MemoriesListResponse, MemoryListItem } from '../types'
import { appendMemoriesPage, hasMoreMemories } from './paginationState'

function makeItem(id: string): MemoryListItem {
  return {
    id,
    createdAt: '2026-01-01T10:00:00Z',
    recordedAt: '2026-01-01T10:00:00Z',
    status: 'READY',
    isHighlight: false,
    title: id,
    transcriptSnippet: `${id} snippet`,
    tags: [],
  }
}

function makePayload(
  items: MemoryListItem[],
  page: number,
  size: number,
  totalElements: number,
  totalPages: number,
): MemoriesListResponse {
  return {
    items,
    page,
    size,
    totalElements,
    totalPages,
  }
}

describe('paginationState', () => {
  it('hasMoreMemories is true while there are still pages', () => {
    const payload = makePayload([makeItem('m1'), makeItem('m2')], 0, 2, 5, 3)
    expect(hasMoreMemories(payload, 2)).toBe(true)
  })

  it('appendMemoriesPage appends items and computes hasMore=false on last page', () => {
    const firstPayload = makePayload([makeItem('m1'), makeItem('m2')], 0, 2, 3, 2)
    const firstState = appendMemoriesPage(
      {
        items: [],
        nextPage: 0,
        hasMore: false,
        totalElements: 0,
      },
      firstPayload,
    )

    expect(firstState.items.length).toBe(2)
    expect(firstState.hasMore).toBe(true)
    expect(firstState.nextPage).toBe(1)

    const secondPayload = makePayload([makeItem('m3')], 1, 2, 3, 2)
    const secondState = appendMemoriesPage(firstState, secondPayload)

    expect(secondState.items.length).toBe(3)
    expect(secondState.hasMore).toBe(false)
    expect(secondState.nextPage).toBe(2)
  })
})
