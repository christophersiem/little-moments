import assert from 'node:assert/strict'
import { buildFilterCountLabel, buildFilterSummary, getActiveFilterCount } from './filterSummary'

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

test('buildFilterSummary shows all months and no tags by default', () => {
  assert.equal(buildFilterSummary('all', 'All months', []), 'All months · No tags')
})

test('buildFilterSummary shows month and compact tag preview', () => {
  assert.equal(
    buildFilterSummary('2026-02', 'February 2026', ['Language', 'Growth', 'Play']),
    'February 2026 · Language +2',
  )
})

test('active filter count includes month and selected tags', () => {
  assert.equal(getActiveFilterCount('all', []), 0)
  assert.equal(getActiveFilterCount('2026-01', ['Funny', 'Family']), 3)
})

test('buildFilterCountLabel returns clear active filter sentence', () => {
  assert.equal(buildFilterCountLabel('all', []), 'No active filters')
  assert.equal(buildFilterCountLabel('2026-01', ['Social']), 'Active filters: 1 month, 1 tag')
})
