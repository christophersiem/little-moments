import type { MemoryTag } from './types'

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export function getActiveFilterCount(selectedMonth: string, selectedTags: MemoryTag[]): number {
  const monthCount = selectedMonth !== 'all' ? 1 : 0
  return monthCount + selectedTags.length
}

export function buildFilterSummary(
  selectedMonth: string,
  selectedMonthLabel: string,
  selectedTags: MemoryTag[],
): string {
  const monthLabel = selectedMonth === 'all' ? 'All months' : selectedMonthLabel || selectedMonth
  if (selectedTags.length === 0) {
    return `${monthLabel} · No tags`
  }
  if (selectedTags.length === 1) {
    return `${monthLabel} · ${selectedTags[0]}`
  }
  return `${monthLabel} · ${selectedTags[0]} +${selectedTags.length - 1}`
}

export function buildFilterCountLabel(selectedMonth: string, selectedTags: MemoryTag[]): string {
  const monthCount = selectedMonth !== 'all' ? 1 : 0
  const tagCount = selectedTags.length
  const parts: string[] = []
  if (monthCount > 0) {
    parts.push('1 month')
  }
  if (tagCount > 0) {
    parts.push(`${tagCount} ${pluralize(tagCount, 'tag', 'tags')}`)
  }
  if (parts.length === 0) {
    return 'No active filters'
  }
  return `Active filters: ${parts.join(', ')}`
}
