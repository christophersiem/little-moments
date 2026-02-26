import { useEffect, useState } from 'react'
import { getMemory, listMemories } from './api'
import type { Memory, MemoryListItem } from './types'

export interface MemoriesListState {
  loading: boolean
  error: string
  items: MemoryListItem[]
}

export interface MemoryDetailState {
  loading: boolean
  error: string
  memory: Memory | null
}

export function useMemoriesList(): MemoriesListState {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState<MemoryListItem[]>([])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const payload = await listMemories(0, 50)
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
  }, [])

  return { loading, error, items }
}

export function useMemoryDetail(memoryId: string): MemoryDetailState {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memory, setMemory] = useState<Memory | null>(null)

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
  }, [memoryId])

  return { loading, error, memory }
}
