import { useSyncExternalStore } from 'react'
import { createMemory } from '../api'
import type { CreateMemoryResponse, MemoryStatus } from '../types'

export type ActiveUploadStatus = 'uploading' | 'processing' | 'ready' | 'failed'

export interface ActiveUploadSession {
  clientId: string
  startedAt: string
  recordedAt: string
  status: ActiveUploadStatus
  memoryId?: string
  ids: string[]
  count: number
  errorMessage?: string
}

let activeSession: ActiveUploadSession | null = null
let activeBlob: Blob | null = null
let activeRecordedAt = ''
let requestVersion = 0

const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ActiveUploadSession | null {
  return activeSession
}

function makeClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `upload-${Date.now()}`
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not save this moment.'
}

function mapStatus(status: MemoryStatus): ActiveUploadStatus {
  if (status === 'PROCESSING') {
    return 'processing'
  }
  if (status === 'FAILED') {
    return 'failed'
  }
  return 'ready'
}

function applyResponseToSession(
  currentSession: ActiveUploadSession,
  response: CreateMemoryResponse,
): ActiveUploadSession {
  const ids = Array.isArray(response.ids) ? response.ids : []
  const memoryId = response.id || ids[0]
  const nextStatus = mapStatus(response.status)

  return {
    ...currentSession,
    status: nextStatus,
    memoryId,
    ids,
    count: typeof response.count === 'number' ? response.count : ids.length,
    errorMessage: response.errorMessage || undefined,
  }
}

function runUpload(version: number, audioBlob: Blob, recordedAtIso: string): void {
  void createMemory(audioBlob, recordedAtIso)
    .then((response) => {
      if (version !== requestVersion || !activeSession) {
        return
      }
      activeSession = applyResponseToSession(activeSession, response)
      if (activeSession.status === 'ready') {
        activeBlob = null
      }
      emit()
    })
    .catch((error) => {
      if (version !== requestVersion || !activeSession) {
        return
      }
      activeSession = {
        ...activeSession,
        status: 'failed',
        errorMessage: toErrorMessage(error),
      }
      emit()
    })
}

export function startMemoryUpload(audioBlob: Blob, recordedAtIso: string): ActiveUploadSession {
  requestVersion += 1
  const nextSession: ActiveUploadSession = {
    clientId: makeClientId(),
    startedAt: new Date().toISOString(),
    recordedAt: recordedAtIso,
    status: 'uploading',
    ids: [],
    count: 0,
  }

  activeSession = nextSession
  activeBlob = audioBlob
  activeRecordedAt = recordedAtIso
  emit()
  runUpload(requestVersion, audioBlob, recordedAtIso)

  return nextSession
}

export function retryActiveMemoryUpload(): boolean {
  if (!activeSession || !activeBlob || !activeRecordedAt) {
    return false
  }
  if (activeSession.status === 'uploading') {
    return false
  }

  requestVersion += 1
  activeSession = {
    ...activeSession,
    startedAt: new Date().toISOString(),
    status: 'uploading',
    errorMessage: undefined,
    memoryId: undefined,
    ids: [],
    count: 0,
  }
  emit()
  runUpload(requestVersion, activeBlob, activeRecordedAt)
  return true
}

export function setActiveUploadStatusFromPolling(status: MemoryStatus, errorMessage?: string): void {
  if (!activeSession) {
    return
  }

  if (status === 'READY') {
    activeSession = {
      ...activeSession,
      status: 'ready',
      errorMessage: undefined,
    }
    activeBlob = null
    emit()
    return
  }

  if (status === 'FAILED') {
    activeSession = {
      ...activeSession,
      status: 'failed',
      errorMessage: errorMessage || activeSession.errorMessage,
    }
    emit()
  }
}

export function clearActiveUploadSession(): void {
  activeSession = null
  activeBlob = null
  activeRecordedAt = ''
  emit()
}

export function useActiveMemoryUpload(): ActiveUploadSession | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

