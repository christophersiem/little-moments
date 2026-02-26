import { API_BASE, getApiErrorMessage, parseJsonSafe } from '../../lib/apiClient'
import type { CreateMemoryResponse, MemoriesListResponse, Memory, UpdateMemoryRequest } from './types'

export async function createMemory(audioBlob: Blob, recordedAtIso: string): Promise<CreateMemoryResponse> {
  const extension = audioBlob.type.includes('mp4') ? 'm4a' : 'webm'
  const formData = new FormData()
  formData.append('audio', audioBlob, `moment-${Date.now()}.${extension}`)
  formData.append('recordedAt', recordedAtIso)

  const response = await fetch(`${API_BASE}/memories`, {
    method: 'POST',
    body: formData,
  })

  const payload = await parseJsonSafe<CreateMemoryResponse>(response)
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload) ?? `Upload failed (${response.status})`)
  }
  if (!payload) {
    throw new Error('Upload completed without a response body.')
  }

  return payload
}

export async function listMemories(page = 0, size = 50): Promise<MemoriesListResponse> {
  const response = await fetch(`${API_BASE}/memories?page=${page}&size=${size}`)
  const payload = await parseJsonSafe<MemoriesListResponse>(response)

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload) ?? `Request failed (${response.status})`)
  }

  return payload ?? {
    items: [],
    page,
    size,
    totalElements: 0,
    totalPages: 0,
  }
}

export async function getMemory(memoryId: string): Promise<Memory> {
  const response = await fetch(`${API_BASE}/memories/${memoryId}`)
  const payload = await parseJsonSafe<Memory>(response)

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload) ?? `Request failed (${response.status})`)
  }
  if (!payload) {
    throw new Error('Memory details were empty.')
  }

  return payload
}

export async function updateMemory(memoryId: string, request: UpdateMemoryRequest): Promise<Memory> {
  const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const payload = await parseJsonSafe<Memory>(response)
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload) ?? `Update failed (${response.status})`)
  }
  if (!payload) {
    throw new Error('Memory update returned an empty response.')
  }

  return payload
}
