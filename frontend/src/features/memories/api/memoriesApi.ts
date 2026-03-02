import { API_BASE, getApiErrorMessage, parseJsonSafe } from '../../../lib/apiClient'
import type {
  CreateMemoryResponse,
  MemoriesListResponse,
  Memory,
  MemoryTag,
  UpdateMemoryRequest,
} from '../types'

interface ListMemoriesParams {
  page?: number
  size?: number
  month?: string
  tags?: MemoryTag[]
}

function buildListMemoriesQuery({ page = 0, size = 5, month, tags = [] }: ListMemoriesParams): string {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (month && month.trim().length > 0) {
    query.set('month', month)
  }

  for (const tag of tags) {
    query.append('tags', tag)
  }

  return query.toString()
}

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
  const ids = Array.isArray(payload.ids) && payload.ids.length > 0 ? payload.ids : payload.id ? [payload.id] : []
  return {
    ...payload,
    id: payload.id ?? ids[0] ?? '',
    ids,
    count: typeof payload.count === 'number' ? payload.count : ids.length,
  }
}

export async function listMemories({
  page = 0,
  size = 5,
  month,
  tags = [],
}: ListMemoriesParams = {}): Promise<MemoriesListResponse> {
  const query = buildListMemoriesQuery({ page, size, month, tags })
  const response = await fetch(`${API_BASE}/memories?${query}`)
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

export async function deleteMemory(memoryId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
    method: 'DELETE',
  })

  const payload = await parseJsonSafe<unknown>(response)
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload) ?? `Delete failed (${response.status})`)
  }
}
