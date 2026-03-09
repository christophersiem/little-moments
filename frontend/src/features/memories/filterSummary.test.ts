import { describe, expect, it } from 'vitest'
import { buildFilterCountLabel, buildFilterSummary, getActiveFilterCount } from './filterSummary'

describe('filterSummary', () => {
  it('buildFilterSummary shows all months and no tags by default', () => {
    expect(buildFilterSummary('all', 'All months', [])).toBe('All months · No tags')
  })

  it('buildFilterSummary shows month and compact tag preview', () => {
    expect(buildFilterSummary('2026-02', 'February 2026', ['Language', 'Growth', 'Play'])).toBe(
      'February 2026 · Language +2',
    )
  })

  it('active filter count includes month and selected tags', () => {
    expect(getActiveFilterCount('all', [])).toBe(0)
    expect(getActiveFilterCount('2026-01', ['Funny', 'Family'])).toBe(3)
  })

  it('buildFilterCountLabel returns clear active filter sentence', () => {
    expect(buildFilterCountLabel('all', [])).toBe('No active filters')
    expect(buildFilterCountLabel('2026-01', ['Social'])).toBe('Active filters: 1 month, 1 tag')
  })
})
