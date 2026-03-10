import { useEffect, useMemo, useState } from 'react'
import { updateMemory } from '../api'
import { updateMemoryHighlightInCache } from './usePaginatedMemories'
import type { MemoryListItem } from '../types'

interface UseMemoryHighlightsOptions {
  items: MemoryListItem[]
  pendingMemoryPrefix: string
}

export function useMemoryHighlights({ items, pendingMemoryPrefix }: UseMemoryHighlightsOptions) {
  const [highlightOverrides, setHighlightOverrides] = useState<Record<string, boolean>>({})
  const [highlightPendingById, setHighlightPendingById] = useState<Record<string, boolean>>({})
  const [highlightError, setHighlightError] = useState('')

  const effectiveItems = useMemo(
    () =>
      items.map((item) => {
        const override = highlightOverrides[item.id]
        if (typeof override !== 'boolean' || override === item.isHighlight) {
          return item
        }
        return { ...item, isHighlight: override }
      }),
    [highlightOverrides, items],
  )

  useEffect(() => {
    const baseById = new Map(items.map((item) => [item.id, item.isHighlight]))
    setHighlightOverrides((current) => {
      const next: Record<string, boolean> = {}
      for (const [memoryId, value] of Object.entries(current)) {
        const baseValue = baseById.get(memoryId)
        if (typeof baseValue !== 'boolean') {
          continue
        }
        if (baseValue !== value) {
          next[memoryId] = value
        }
      }
      const currentEntries = Object.entries(current)
      const nextEntries = Object.entries(next)
      if (currentEntries.length !== nextEntries.length) {
        return next
      }
      for (const [memoryId, value] of currentEntries) {
        if (next[memoryId] !== value) {
          return next
        }
      }
      return current
    })
  }, [items])

  const onToggleHighlight = async (memoryId: string, nextValue: boolean) => {
    if (memoryId.startsWith(pendingMemoryPrefix)) {
      return
    }

    setHighlightError('')
    setHighlightOverrides((current) => ({ ...current, [memoryId]: nextValue }))
    setHighlightPendingById((current) => ({ ...current, [memoryId]: true }))

    try {
      await updateMemory(memoryId, { isHighlight: nextValue })
      updateMemoryHighlightInCache(memoryId, nextValue)
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : 'Could not update highlight.'
      setHighlightError(message)
      setHighlightOverrides((current) => {
        const next = { ...current }
        delete next[memoryId]
        return next
      })
    } finally {
      setHighlightPendingById((current) => {
        const next = { ...current }
        delete next[memoryId]
        return next
      })
    }
  }

  return {
    effectiveItems,
    highlightPendingById,
    highlightError,
    onToggleHighlight,
  }
}
