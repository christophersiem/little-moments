import { useCallback, useEffect, useState } from 'react'
import { getMemory } from './api'
import type { Memory } from './types'

interface CachedMemoryDetail {
  memory: Memory
  cachedAt: number
}

const MEMORY_DETAIL_CACHE_TTL_MS = 300_000
const memoryDetailCache = new Map<string, CachedMemoryDetail>()

export interface MemoryDetailState {
  loading: boolean
  error: string
  memory: Memory | null
  reload: () => void
}

export function useMemoryDetail(memoryId: string): MemoryDetailState {
  const cachedDetail = memoryDetailCache.get(memoryId)
  const hasFreshCache =
    Boolean(cachedDetail) && Date.now() - (cachedDetail?.cachedAt ?? 0) < MEMORY_DETAIL_CACHE_TTL_MS
  const [loading, setLoading] = useState(!hasFreshCache)
  const [error, setError] = useState('')
  const [memory, setMemory] = useState<Memory | null>(hasFreshCache ? (cachedDetail?.memory ?? null) : null)
  const [reloadIndex, setReloadIndex] = useState(0)

  const reload = useCallback(() => {
    setReloadIndex((current) => current + 1)
  }, [])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      const shouldForceRefresh = reloadIndex > 0
      const currentCached = memoryDetailCache.get(memoryId)
      const canUseCached =
        Boolean(currentCached) &&
        !shouldForceRefresh &&
        Date.now() - (currentCached?.cachedAt ?? 0) < MEMORY_DETAIL_CACHE_TTL_MS

      if (canUseCached && currentCached) {
        setMemory(currentCached.memory)
        setLoading(false)
        setError('')
        return
      }

      if (!currentCached || shouldForceRefresh) {
        setLoading(true)
      }
      setError('')
      try {
        const payload = await getMemory(memoryId)
        if (isMounted) {
          memoryDetailCache.set(memoryId, {
            memory: payload,
            cachedAt: Date.now(),
          })
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
