export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '')

type ErrorPayload = {
  detail?: string
  message?: string
  title?: string
}

export async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export function getApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as ErrorPayload
  return candidate.detail ?? candidate.message ?? candidate.title ?? null
}
