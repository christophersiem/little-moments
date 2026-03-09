import { useEffect, useRef } from 'react'
import {
  setActiveUploadStatusFromPolling,
  retryActiveMemoryUpload,
  useActiveMemoryUpload,
} from './uploadSessionStore'
import { useProcessingMemory } from './useProcessingMemory'

interface UseMemoriesProcessingOptions {
  reload: () => void
}

export function useMemoriesProcessing({ reload }: UseMemoriesProcessingOptions) {
  const lastSettledUploadRef = useRef('')
  const activeUpload = useActiveMemoryUpload()
  const processingMemoryId = activeUpload?.status === 'processing' ? activeUpload.memoryId : undefined
  const {
    status: processingStatus,
    error: processingError,
    isPolling: isProcessingPolling,
    startPolling,
    stopPolling,
  } = useProcessingMemory({ memoryId: processingMemoryId, pollIntervalMs: 2500, timeoutMs: 60000 })

  useEffect(() => {
    if (!activeUpload || activeUpload.status !== 'processing' || !activeUpload.memoryId) {
      stopPolling()
      return
    }

    startPolling(activeUpload.memoryId)
    return () => stopPolling()
  }, [activeUpload, startPolling, stopPolling])

  useEffect(() => {
    if (!activeUpload || activeUpload.status !== 'processing') {
      return
    }

    if (processingStatus === 'READY') {
      setActiveUploadStatusFromPolling('READY')
      reload()
      return
    }

    if (processingStatus === 'FAILED') {
      setActiveUploadStatusFromPolling('FAILED', processingError)
      reload()
    }
  }, [activeUpload, processingError, processingStatus, reload])

  useEffect(() => {
    if (!activeUpload) {
      return
    }
    if (activeUpload.status !== 'ready' && activeUpload.status !== 'failed') {
      return
    }

    const marker = `${activeUpload.clientId}:${activeUpload.status}`
    if (lastSettledUploadRef.current === marker) {
      return
    }
    lastSettledUploadRef.current = marker
    reload()
  }, [activeUpload, reload])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('pending')) {
      return
    }

    if (activeUpload && (activeUpload.status === 'uploading' || activeUpload.status === 'processing')) {
      return
    }

    window.history.replaceState({}, '', '/memories')
  }, [activeUpload])

  const onRetryProcessing = () => {
    if (activeUpload?.status === 'failed' && retryActiveMemoryUpload()) {
      return
    }

    if (activeUpload?.memoryId) {
      startPolling(activeUpload.memoryId)
    }
    reload()
  }

  return {
    activeUpload,
    processingStatus,
    processingError,
    isProcessingPolling,
    onRetryProcessing,
  }
}
