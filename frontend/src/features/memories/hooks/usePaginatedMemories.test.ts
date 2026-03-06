import type { MemoriesListResponse, MemoryListItem } from '../types'
import { appendMemoriesPage, hasMoreMemories } from './paginationState'

function test(name: string, fn: () => void): void {
  try {
    fn()
    // eslint-disable-next-line no-console
    console.log(`PASS ${name}`)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`FAIL ${name}`)
    throw error
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

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

test('hasMoreMemories is true while there are still pages', () => {
  const payload = makePayload([makeItem('m1'), makeItem('m2')], 0, 2, 5, 3)
  assert(hasMoreMemories(payload, 2), 'Expected hasMoreMemories to be true for first page')
})

test('appendMemoriesPage appends items and computes hasMore=false on last page', () => {
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

  assert(firstState.items.length === 2, 'Expected first page items to be appended')
  assert(firstState.hasMore, 'Expected hasMore after the first page')
  assert(firstState.nextPage === 1, 'Expected nextPage to advance to 1')

  const secondPayload = makePayload([makeItem('m3')], 1, 2, 3, 2)
  const secondState = appendMemoriesPage(firstState, secondPayload)

  assert(secondState.items.length === 3, 'Expected second page item to be appended')
  assert(!secondState.hasMore, 'Expected hasMore to be false after the final page')
  assert(secondState.nextPage === 2, 'Expected nextPage to advance after append')
})
