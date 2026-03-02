import { useCallback, useEffect, useState } from 'react'
import { getMemory, listMemories } from './api'
import type { Memory, MemoryListItem } from './types'

export interface MemoriesListState {
  loading: boolean
  error: string
  items: MemoryListItem[]
  reload: () => void
}

export interface MemoryDetailState {
  loading: boolean
  error: string
  memory: Memory | null
  reload: () => void
}

export function useMemoriesList(): MemoriesListState {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState<MemoryListItem[]>([])
  const [reloadIndex, setReloadIndex] = useState(0)

  const reload = useCallback(() => {
    setReloadIndex((current) => current + 1)
  }, [])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const payload = await listMemories({ page: 0, size: 50 })
        if (isMounted) {
          setItems(payload.items)
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : 'Could not load memories.'
          setError(message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [reloadIndex])

  return { loading, error, items, reload }
}

export function useMemoryDetail(memoryId: string): MemoryDetailState {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memory, setMemory] = useState<Memory | null>(null)
  const [reloadIndex, setReloadIndex] = useState(0)

  const reload = useCallback(() => {
    setReloadIndex((current) => current + 1)
  }, [])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const payload = await getMemory(memoryId)
        if (isMounted) {
          setMemory(payload)
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : 'Could not load memory.'
          setError(message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [memoryId, reloadIndex])

  return { loading, error, memory, reload }
}
