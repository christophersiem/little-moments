import { supabase } from './supabase'
import { SupabaseRequestError } from './supabaseErrors'

interface ApiErrorResponse {
  message?: string
  error?: string
  details?: string
}

const API_BASE_URL = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/+$/, '')
const DEFAULT_GET_CACHE_TTL_MS = 300_000

interface CachedJsonPayload {
  expiresAt: number
  payload: unknown
}

interface BackendRequestOptions extends RequestInit {
  bypassCache?: boolean
  cacheTtlMs?: number
}

const backendJsonCache = new Map<string, CachedJsonPayload>()

function mergeHeaders(base: Headers, headers?: HeadersInit): Headers {
  if (!headers) {
    return base
  }
  const next = new Headers(headers)
  next.forEach((value, key) => base.set(key, value))
  return base
}

async function getAuthorizationHeader(): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw new SupabaseRequestError(error.message, 401)
  }
  const token = data.session?.access_token
  if (!token) {
    throw new SupabaseRequestError('Not authenticated.', 401)
  }
  return `Bearer ${token}`
}

async function parseError(response: Response): Promise<string> {
  const rawBody = await response.text()

  try {
    const payload = JSON.parse(rawBody) as ApiErrorResponse
    if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
      return payload.message
    }
    if (typeof payload?.error === 'string' && payload.error.trim().length > 0) {
      return payload.error
    }
    if (typeof payload?.details === 'string' && payload.details.trim().length > 0) {
      return payload.details
    }
  } catch {
    if (rawBody.trim().length > 0) {
      return rawBody.trim()
    }
  }
  return `Request failed with status ${response.status}.`
}

async function throwApiError(response: Response): Promise<never> {
  const message = await parseError(response)
  throw new SupabaseRequestError(message, response.status)
}

function resolveMethod(method?: string): string {
  return (method?.trim().toUpperCase() || 'GET')
}

function clonePayload<T>(payload: T): T {
  try {
    return structuredClone(payload)
  } catch {
    return JSON.parse(JSON.stringify(payload)) as T
  }
}

function makeCacheKey(url: string, authorizationHeader: string): string {
  return `${authorizationHeader}::${url}`
}

function invalidateBackendCache(): void {
  backendJsonCache.clear()
}

export async function backendRequestJson<T>(path: string, init: BackendRequestOptions = {}): Promise<T> {
  const method = resolveMethod(init.method)
  const isGet = method === 'GET'
  const cacheTtlMs = init.cacheTtlMs ?? DEFAULT_GET_CACHE_TTL_MS

  const headers = mergeHeaders(new Headers(), init.headers)
  const authorizationHeader = await getAuthorizationHeader()
  headers.set('Authorization', authorizationHeader)
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const url = `${API_BASE_URL}${path}`

  if (isGet && !init.bypassCache && cacheTtlMs > 0) {
    const cacheKey = makeCacheKey(url, authorizationHeader)
    const cached = backendJsonCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return clonePayload(cached.payload as T)
    }
    if (cached) {
      backendJsonCache.delete(cacheKey)
    }
  }

  const response = await fetch(url, {
    ...init,
    method,
    headers,
  })

  if (!response.ok) {
    await throwApiError(response)
  }

  const payload = (await response.json()) as T

  if (isGet && !init.bypassCache && cacheTtlMs > 0) {
    backendJsonCache.set(makeCacheKey(url, authorizationHeader), {
      payload: clonePayload(payload),
      expiresAt: Date.now() + cacheTtlMs,
    })
  } else if (!isGet) {
    invalidateBackendCache()
  }

  return payload
}

export async function backendRequestVoid(path: string, init: BackendRequestOptions = {}): Promise<void> {
  const method = resolveMethod(init.method)
  const headers = mergeHeaders(new Headers(), init.headers)
  headers.set('Authorization', await getAuthorizationHeader())
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
  })

  if (!response.ok) {
    await throwApiError(response)
  }

  if (method !== 'GET') {
    invalidateBackendCache()
  }
}
