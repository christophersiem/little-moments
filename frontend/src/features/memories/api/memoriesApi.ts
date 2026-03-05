import { supabase } from '../../../lib/supabase'
import type {
  CreateMemoryResponse,
  MemoriesListResponse,
  Memory,
  MemoryListItem,
  MemoryTag,
  UpdateMemoryRequest,
} from '../types'
import { MEMORY_TAG_OPTIONS } from '../types'

interface ListMemoriesParams {
  page?: number
  size?: number
  month?: string
  tags?: MemoryTag[]
}

interface MemoryRow {
  id: string
  created_at: string
  recorded_at: string
  status: 'PROCESSING' | 'READY' | 'FAILED'
  title: string | null
  summary: string | null
  transcript: string | null
  error_message: string | null
  tags: string[] | null
}

const DEFAULT_TRANSCRIPT = 'Moment captured. Transcript processing is pending in this environment.'
const MEMORY_SELECT = 'id,created_at,recorded_at,status,title,summary,transcript,error_message,tags'

const VALID_TAGS = new Set<string>(MEMORY_TAG_OPTIONS)

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}

function normalizeTags(tags: unknown): MemoryTag[] {
  if (!Array.isArray(tags)) {
    return []
  }
  return tags.filter((tag): tag is MemoryTag => typeof tag === 'string' && VALID_TAGS.has(tag))
}

function createSnippet(transcript: string | null): string {
  if (!transcript || transcript.trim().length === 0) {
    return ''
  }
  const trimmed = transcript.trim()
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed
}

function mapRowToListItem(row: MemoryRow): MemoryListItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    recordedAt: row.recorded_at || row.created_at,
    status: row.status,
    title: row.title,
    transcriptSnippet: createSnippet(row.transcript),
    tags: normalizeTags(row.tags),
  }
}

function mapRowToMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    createdAt: row.created_at,
    recordedAt: row.recorded_at || row.created_at,
    status: row.status,
    title: row.title,
    summary: row.summary,
    transcript: row.transcript,
    errorMessage: row.error_message,
    tags: normalizeTags(row.tags),
  }
}

function getMonthRange(month?: string): { startIso: string; endIso: string } | null {
  if (!month) {
    return null
  }
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim())
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null
  }

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0))

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function finalizeMemoryInBackground(memoryId: string): Promise<void> {
  const client = requireSupabase()
  try {
    await sleep(1400)
    const { error } = await client
      .from('memories')
      .update({
        status: 'READY',
        transcript: DEFAULT_TRANSCRIPT,
        error_message: null,
      })
      .eq('id', memoryId)

    if (error) {
      throw error
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed.'
    await client
      .from('memories')
      .update({
        status: 'FAILED',
        error_message: message,
      })
      .eq('id', memoryId)
  }
}

export async function createMemory(audioBlob: Blob, recordedAtIso: string, childId: string): Promise<CreateMemoryResponse> {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) {
    throw new Error(userError.message)
  }
  const userId = userData.user?.id
  if (!userId) {
    throw new Error('You must be signed in to save memories.')
  }

  const { data, error } = await client
    .from('memories')
    .insert({
      child_id: childId,
      created_by: userId,
      recorded_at: recordedAtIso,
      status: 'PROCESSING',
      transcript: null,
      error_message: null,
      tags: [],
      title: null,
      summary: null,
    })
    .select(MEMORY_SELECT)
    .single<MemoryRow>()

  if (error) {
    throw new Error(error.message)
  }
  if (!data?.id) {
    throw new Error('Could not create memory.')
  }

  // Keep Reduced MVP behavior (PROCESSING -> READY) without Spring Boot in the request path.
  void finalizeMemoryInBackground(data.id)

  void audioBlob
  const ids = [data.id]
  return {
    id: data.id,
    ids,
    count: 1,
    status: data.status,
    errorMessage: data.error_message,
    transcriptPreview: null,
    title: data.title,
    summary: data.summary,
    tags: normalizeTags(data.tags),
  }
}

export async function listMemories({
  page = 0,
  size = 5,
  month,
  tags = [],
}: ListMemoriesParams = {}): Promise<MemoriesListResponse> {
  const client = requireSupabase()
  const from = Math.max(page, 0) * Math.max(size, 1)
  const to = from + Math.max(size, 1) - 1

  let query = client
    .from('memories')
    .select(MEMORY_SELECT, { count: 'exact' })
    .order('recorded_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  const monthRange = getMonthRange(month)
  if (monthRange) {
    query = query.gte('recorded_at', monthRange.startIso).lt('recorded_at', monthRange.endIso)
  }
  if (tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  const { data, error, count } = await query.returns<MemoryRow[]>()
  if (error) {
    throw new Error(error.message)
  }

  const rows = data ?? []
  const totalElements = count ?? rows.length
  const safeSize = Math.max(size, 1)
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / safeSize)

  return {
    items: rows.map(mapRowToListItem),
    page,
    size: safeSize,
    totalElements,
    totalPages,
  }
}

export async function getMemory(memoryId: string): Promise<Memory> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('memories')
    .select(MEMORY_SELECT)
    .eq('id', memoryId)
    .single<MemoryRow>()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('Memory details were empty.')
  }

  return mapRowToMemory(data)
}

export async function updateMemory(memoryId: string, request: UpdateMemoryRequest): Promise<Memory> {
  const client = requireSupabase()
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

  const { data, error } = await client
    .from('memories')
    .update(patch)
    .eq('id', memoryId)
    .select(MEMORY_SELECT)
    .single<MemoryRow>()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('Memory update returned an empty response.')
  }

  return mapRowToMemory(data)
}

export async function deleteMemory(memoryId: string): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('memories')
    .delete()
    .eq('id', memoryId)
    .select('id')
    .returns<Array<{ id: string }>>()

  if (error) {
    throw new Error(error.message)
  }
  if (!data || data.length === 0) {
    throw new Error('Delete not permitted for this memory.')
  }
}
