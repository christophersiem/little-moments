import type {
  CreateMemoryResponse,
  MemoriesListResponse,
  Memory,
  MemoryListItem,
  MemoryStatus,
  MemoryTag,
  UpdateMemoryRequest,
} from '../types'
import { MEMORY_TAG_OPTIONS } from '../types'
import { backendRequestJson, backendRequestVoid } from '../../../lib/backendApi'

interface ListMemoriesParams {
  page?: number
  size?: number
  familyId?: string
  month?: string
  tags?: MemoryTag[]
  highlights?: boolean
}

interface CreateMemoryApiResponse {
  id: string
  ids: string[]
  count: number
  status: MemoryStatus
  errorMessage: string | null
  transcriptPreview: string | null
  title: string | null
  summary: string | null
  tags: string[] | null
}

interface MemoryListItemApiResponse {
  id: string
  createdAt: string
  recordedAt: string
  status: MemoryStatus
  isHighlight?: boolean
  title: string | null
  transcriptSnippet: string | null
  tags: string[] | null
}

interface MemoriesListApiResponse {
  items: MemoryListItemApiResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

interface MemoryApiResponse {
  id: string
  createdAt: string
  recordedAt: string
  status: MemoryStatus
  isHighlight?: boolean
  title: string | null
  summary: string | null
  transcript: string | null
  errorMessage: string | null
  tags: string[] | null
}

const VALID_TAGS = new Set<string>(MEMORY_TAG_OPTIONS)

function normalizeTags(tags: unknown): MemoryTag[] {
  if (!Array.isArray(tags)) {
    return []
  }
  return tags.filter((tag): tag is MemoryTag => typeof tag === 'string' && VALID_TAGS.has(tag))
}

function toMemoryStatus(value: unknown): MemoryStatus {
  if (value === 'PROCESSING' || value === 'READY' || value === 'FAILED') {
    return value
  }
  return 'FAILED'
}

function mapCreateResponse(payload: CreateMemoryApiResponse): CreateMemoryResponse {
  return {
    id: String(payload.id),
    ids: Array.isArray(payload.ids) ? payload.ids.map((id) => String(id)) : [],
    count: typeof payload.count === 'number' ? payload.count : 0,
    status: toMemoryStatus(payload.status),
    errorMessage: payload.errorMessage ?? null,
    transcriptPreview: payload.transcriptPreview ?? null,
    title: payload.title ?? null,
    summary: payload.summary ?? null,
    tags: normalizeTags(payload.tags),
  }
}

function mapListItem(payload: MemoryListItemApiResponse): MemoryListItem {
  return {
    id: String(payload.id),
    createdAt: String(payload.createdAt),
    recordedAt: String(payload.recordedAt || payload.createdAt),
    status: toMemoryStatus(payload.status),
    isHighlight: payload.isHighlight === true,
    title: payload.title ?? null,
    transcriptSnippet: payload.transcriptSnippet || '',
    tags: normalizeTags(payload.tags),
  }
}

function mapMemory(payload: MemoryApiResponse): Memory {
  return {
    id: String(payload.id),
    createdAt: String(payload.createdAt),
    recordedAt: String(payload.recordedAt || payload.createdAt),
    status: toMemoryStatus(payload.status),
    isHighlight: payload.isHighlight === true,
    title: payload.title ?? null,
    summary: payload.summary ?? null,
    transcript: payload.transcript ?? null,
    errorMessage: payload.errorMessage ?? null,
    tags: normalizeTags(payload.tags),
  }
}

export async function createMemory(
  audioBlob: Blob,
  recordedAtIso: string,
  childId: string,
): Promise<CreateMemoryResponse> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  formData.append('recordedAt', recordedAtIso)
  formData.append('childId', childId)

  const payload = await backendRequestJson<CreateMemoryApiResponse>('/memories', {
    method: 'POST',
    body: formData,
  })

  return mapCreateResponse(payload)
}

export async function listMemories({
  page = 0,
  size = 5,
  familyId,
  month,
  tags = [],
  highlights = false,
}: ListMemoriesParams = {}): Promise<MemoriesListResponse> {
  const query = new URLSearchParams()
  query.set('page', String(Math.max(page, 0)))
  query.set('size', String(Math.max(size, 1)))
  if (familyId && familyId.trim().length > 0) {
    query.set('familyId', familyId.trim())
  }
  if (month && month !== 'all') {
    query.set('month', month)
  }
  for (const tag of tags) {
    query.append('tags', tag)
  }
  if (highlights) {
    query.set('highlights', 'true')
  }

  const payload = await backendRequestJson<MemoriesListApiResponse>(`/memories?${query.toString()}`)
  return {
    items: Array.isArray(payload.items) ? payload.items.map(mapListItem) : [],
    page: typeof payload.page === 'number' ? payload.page : 0,
    size: typeof payload.size === 'number' ? payload.size : Math.max(size, 1),
    totalElements: typeof payload.totalElements === 'number' ? payload.totalElements : 0,
    totalPages: typeof payload.totalPages === 'number' ? payload.totalPages : 0,
  }
}

interface GetMemoryOptions {
  bypassCache?: boolean
}

export async function getMemory(memoryId: string, options: GetMemoryOptions = {}): Promise<Memory> {
  const payload = await backendRequestJson<MemoryApiResponse>(`/memories/${encodeURIComponent(memoryId)}`, {
    bypassCache: options.bypassCache,
  })
  return mapMemory(payload)
}

export async function updateMemory(memoryId: string, request: UpdateMemoryRequest): Promise<Memory> {
  const patch: Record<string, unknown> = {}
  if (typeof request.title === 'string') {
    patch.title = request.title.trim()
  }
  if (typeof request.transcript === 'string') {
    patch.transcript = request.transcript.trim()
  }
  if (Array.isArray(request.tags)) {
    patch.tags = request.tags
  }
  if (typeof request.recordedAt === 'string' && request.recordedAt.trim().length > 0) {
    patch.recordedAt = request.recordedAt.trim()
  }
  if (typeof request.isHighlight === 'boolean') {
    patch.isHighlight = request.isHighlight
  }

  const payload = await backendRequestJson<MemoryApiResponse>(`/memories/${encodeURIComponent(memoryId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })

  return mapMemory(payload)
}

export async function deleteMemory(memoryId: string): Promise<void> {
  await backendRequestVoid(`/memories/${encodeURIComponent(memoryId)}`, {
    method: 'DELETE',
  })
}
