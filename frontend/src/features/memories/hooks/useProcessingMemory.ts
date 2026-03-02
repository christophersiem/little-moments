import { useCallback, useEffect, useRef, useState } from 'react'
import { getMemory } from '../api'
import type { MemoryStatus } from '../types'

const DEFAULT_POLL_INTERVAL_MS = 2500
const DEFAULT_TIMEOUT_MS = 60000

type ProcessingState = MemoryStatus | 'IDLE' | 'TIMEOUT'

interface UseProcessingMemoryOptions {
  memoryId?: string
  pollIntervalMs?: number
  timeoutMs?: number
}

interface UseProcessingMemoryResult {
  status: ProcessingState
  error: string
  isPolling: boolean
  startPolling: (nextMemoryId?: string) => void
  stopPolling: () => void
  refreshNow: () => Promise<void>
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not refresh processing status.'
}

export function useProcessingMemory({
  memoryId,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseProcessingMemoryOptions): UseProcessingMemoryResult {
  const [activeMemoryId, setActiveMemoryId] = useState(memoryId ?? '')
  const [status, setStatus] = useState<ProcessingState>('IDLE')
  const [error, setError] = useState('')
  const [isPolling, setIsPolling] = useState(false)

  const startedAtRef = useRef(0)
  const activeMemoryIdRef = useRef(activeMemoryId)

  useEffect(() => {
    setActiveMemoryId(memoryId ?? '')
  }, [memoryId])

  useEffect(() => {
    activeMemoryIdRef.current = activeMemoryId
  }, [activeMemoryId])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
  }, [])

  const refreshNow = useCallback(async () => {
    if (!activeMemoryId) {
      setStatus('IDLE')
      return
    }

    try {
      const memory = await getMemory(activeMemoryId)
      setStatus(memory.status)
      setError('')
    } catch (refreshError) {
      setError(toErrorMessage(refreshError))
    }
  }, [activeMemoryId])

  const startPolling = useCallback((nextMemoryId?: string) => {
    const resolvedMemoryId = nextMemoryId ?? activeMemoryIdRef.current
    if (!resolvedMemoryId) {
      return
    }

    setActiveMemoryId(resolvedMemoryId)
    startedAtRef.current = Date.now()
    setStatus('PROCESSING')
    setError('')
    setIsPolling(true)
  }, [])

  useEffect(() => {
    if (!isPolling || !activeMemoryId) {
      return
    }

    let disposed = false

    const poll = async () => {
      if (disposed) {
        return
      }

      const elapsedMs = Date.now() - startedAtRef.current
      if (elapsedMs >= timeoutMs) {
        if (!disposed) {
          setStatus('TIMEOUT')
          setIsPolling(false)
        }
        return
      }

      try {
        const memory = await getMemory(activeMemoryId)
        if (disposed) {
          return
        }

        setStatus(memory.status)
        setError('')

        if (memory.status === 'READY' || memory.status === 'FAILED') {
          setIsPolling(false)
        }
      } catch (pollError) {
        if (disposed) {
          return
        }
        setError(toErrorMessage(pollError))
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), pollIntervalMs)

    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [activeMemoryId, isPolling, pollIntervalMs, timeoutMs])

  return {
    status,
    error,
    isPolling,
    startPolling,
    stopPolling,
    refreshNow,
  }
}
