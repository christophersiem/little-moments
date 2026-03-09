import { useMemo, useState } from 'react'
import type { MemoryTag } from '../types'

export interface UseMemoriesFilterResult {
  filterSheetOpen: boolean
  monthPickerOpen: boolean
  selectedMonth: string
  selectedTags: MemoryTag[]
  highlightsOnly: boolean
  draftMonth: string
  draftTags: MemoryTag[]
  draftHighlightsOnly: boolean
  hasActiveFilters: boolean
  activeFilterCount: number
  openFilters: () => void
  closeFilters: () => void
  applyFilters: () => void
  clearFilters: () => void
  openMonthPicker: () => void
  closeMonthPickerToFilters: () => void
  selectDraftMonth: (nextMonth: string) => void
  toggleDraftTag: (tag: MemoryTag) => void
  toggleDraftHighlightsOnly: () => void
}

export function useMemoriesFilter(): UseMemoriesFilterResult {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedTags, setSelectedTags] = useState<MemoryTag[]>([])
  const [highlightsOnly, setHighlightsOnly] = useState(false)
  const [draftMonth, setDraftMonth] = useState('all')
  const [draftTags, setDraftTags] = useState<MemoryTag[]>([])
  const [draftHighlightsOnly, setDraftHighlightsOnly] = useState(false)

  const hasActiveFilters = selectedMonth !== 'all' || selectedTags.length > 0 || highlightsOnly
  const activeFilterCount = useMemo(
    () => (selectedMonth !== 'all' ? 1 : 0) + (selectedTags.length > 0 ? 1 : 0) + (highlightsOnly ? 1 : 0),
    [highlightsOnly, selectedMonth, selectedTags],
  )

  const openFilters = () => {
    setDraftMonth(selectedMonth)
    setDraftTags(selectedTags)
    setDraftHighlightsOnly(highlightsOnly)
    setFilterSheetOpen(true)
  }

  const closeFilters = () => setFilterSheetOpen(false)

  const applyFilters = () => {
    setSelectedMonth(draftMonth)
    setSelectedTags(draftTags)
    setHighlightsOnly(draftHighlightsOnly)
    setFilterSheetOpen(false)
  }

  const openMonthPicker = () => {
    setFilterSheetOpen(false)
    setMonthPickerOpen(true)
  }

  const closeMonthPickerToFilters = () => {
    setMonthPickerOpen(false)
    setFilterSheetOpen(true)
  }

  const selectDraftMonth = (nextMonth: string) => {
    setDraftMonth(nextMonth)
    closeMonthPickerToFilters()
  }

  const clearFilters = () => {
    setDraftMonth('all')
    setDraftTags([])
    setDraftHighlightsOnly(false)
  }

  const toggleDraftTag = (tag: MemoryTag) => {
    setDraftTags((current) => (current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]))
  }

  const toggleDraftHighlightsOnly = () => {
    setDraftHighlightsOnly((current) => !current)
  }

  return {
    filterSheetOpen,
    monthPickerOpen,
    selectedMonth,
    selectedTags,
    highlightsOnly,
    draftMonth,
    draftTags,
    draftHighlightsOnly,
    hasActiveFilters,
    activeFilterCount,
    openFilters,
    closeFilters,
    applyFilters,
    clearFilters,
    openMonthPicker,
    closeMonthPickerToFilters,
    selectDraftMonth,
    toggleDraftTag,
    toggleDraftHighlightsOnly,
  }
}
