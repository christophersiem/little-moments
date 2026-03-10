import { formatMonthYear, formatMonthYearShort } from '../../../lib/utils'
import type { MemoryListItem } from '../types'

export interface MonthOption {
  key: string
  label: string
}

export interface MonthGroup {
  key: string
  label: string
  items: MemoryListItem[]
}

function getEventDate(item: MemoryListItem): string {
  return item.recordedAt || item.createdAt
}

function monthKey(dateIso: string): string {
  const date = new Date(dateIso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function collectMonthOptions(items: MemoryListItem[]): MonthOption[] {
  const seen = new Set<string>()
  const options: MonthOption[] = []

  for (const item of items) {
    const eventDate = getEventDate(item)
    const key = monthKey(eventDate)
    if (!seen.has(key)) {
      seen.add(key)
      options.push({ key, label: formatMonthYearShort(eventDate) })
    }
  }

  return options
}

export function groupMemoriesByMonth(items: MemoryListItem[]): MonthGroup[] {
  const groups: MonthGroup[] = []

  for (const item of items) {
    const eventDate = getEventDate(item)
    const key = monthKey(eventDate)
    const current = groups[groups.length - 1]
    if (!current || current.key !== key) {
      groups.push({ key, label: formatMonthYear(eventDate), items: [item] })
      continue
    }
    current.items.push(item)
  }

  return groups
}
