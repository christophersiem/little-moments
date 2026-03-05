import { supabase } from './supabase'
import { SupabaseRequestError } from './supabaseErrors'

interface ApiErrorResponse {
  message?: string
  error?: string
  details?: string
}

const API_BASE_URL = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/+$/, '')

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

export async function backendRequestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = mergeHeaders(new Headers(), init.headers)
  headers.set('Authorization', await getAuthorizationHeader())
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    await throwApiError(response)
  }

  return (await response.json()) as T
}

export async function backendRequestVoid(path: string, init: RequestInit = {}): Promise<void> {
  const headers = mergeHeaders(new Headers(), init.headers)
  headers.set('Authorization', await getAuthorizationHeader())
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    await throwApiError(response)
  }
}
