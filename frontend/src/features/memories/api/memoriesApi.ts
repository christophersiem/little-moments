import type {
  CreateMemoryResponse,
  MemoryChatResponse,
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
  audioAvailable: boolean
}

interface MemoryChatSourceApiResponse {
  id: string
  recordedAt: string
  title: string
  snippet: string
  tags: string[] | null
}

interface MemoryChatApiResponse {
  answer: string
  confidence: 'low' | 'medium' | 'high'
  status: 'success' | 'insufficient_evidence' | 'out_of_scope' | 'unsafe'
  notes: string | null
  sourceMemoryIds: string[] | null
  sources: MemoryChatSourceApiResponse[] | null
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
    audioAvailable: payload.audioAvailable === true,
  }
}

function mapMemoryChatResponse(payload: MemoryChatApiResponse): MemoryChatResponse {
  return {
    answer: typeof payload.answer === 'string' ? payload.answer : '',
    confidence: payload.confidence === 'high' || payload.confidence === 'low' ? payload.confidence : 'medium',
    status:
      payload.status === 'success' ||
      payload.status === 'insufficient_evidence' ||
      payload.status === 'out_of_scope' ||
      payload.status === 'unsafe'
        ? payload.status
        : 'insufficient_evidence',
    notes: typeof payload.notes === 'string' && payload.notes.trim().length > 0 ? payload.notes.trim() : null,
    sourceMemoryIds: Array.isArray(payload.sourceMemoryIds) ? payload.sourceMemoryIds.map((id) => String(id)) : [],
    sources: Array.isArray(payload.sources)
      ? payload.sources.map((source) => ({
          id: String(source.id),
          recordedAt: String(source.recordedAt),
          title: typeof source.title === 'string' && source.title.trim().length > 0 ? source.title.trim() : 'Memory',
          snippet: typeof source.snippet === 'string' ? source.snippet : '',
          tags: Array.isArray(source.tags) ? source.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        }))
      : [],
  }
}

function inferAudioFileName(mimeType: string): string {
  const normalized = mimeType.toLowerCase()
  if (normalized.includes('audio/mp4')) {
    return 'recording.mp4'
  }
  if (normalized.includes('audio/m4a')) {
    return 'recording.m4a'
  }
  if (normalized.includes('audio/ogg') || normalized.includes('audio/opus')) {
    return 'recording.ogg'
  }
  if (normalized.includes('audio/wav') || normalized.includes('audio/x-wav')) {
    return 'recording.wav'
  }
  if (normalized.includes('audio/webm')) {
    return 'recording.webm'
  }
  return 'recording.bin'
}

export async function createMemory(
  audioBlob: Blob,
  recordedAtIso: string,
  childId: string,
  keepAudio: boolean,
  durationSeconds: number,
): Promise<CreateMemoryResponse> {
  const formData = new FormData()
  formData.append('audio', audioBlob, inferAudioFileName(audioBlob.type || ''))
  formData.append('recordedAt', recordedAtIso)
  formData.append('childId', childId)
  formData.append('keepAudio', keepAudio ? 'true' : 'false')
  formData.append('durationSeconds', String(Math.max(1, Math.round(durationSeconds))))

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

export async function askMemories(question: string, familyId?: string | null): Promise<MemoryChatResponse> {
  const payload = await backendRequestJson<MemoryChatApiResponse>('/memories/chat', {
    method: 'POST',
    body: JSON.stringify({
      question: question.trim(),
      familyId: familyId && familyId.trim().length > 0 ? familyId.trim() : null,
    }),
  })
  return mapMemoryChatResponse(payload)
}

export async function getMemoryAudioUrl(memoryId: string): Promise<string> {
  const payload = await backendRequestJson<{ audioSignedUrl?: string | null }>(
    `/memories/${encodeURIComponent(memoryId)}/audio-url`,
  )
  const value = typeof payload.audioSignedUrl === 'string' ? payload.audioSignedUrl.trim() : ''
  if (!value) {
    throw new Error('Audio URL is not available.')
  }
  return value
}
