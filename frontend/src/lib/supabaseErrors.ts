export class SupabaseRequestError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'SupabaseRequestError'
    this.status = status
    this.code = code
  }
}

interface SupabaseLikeError {
  message?: unknown
  code?: unknown
  status?: unknown
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getStatus(error: SupabaseLikeError): number {
  if (typeof error.status === 'number' && Number.isFinite(error.status)) {
    return error.status
  }

  const code = toStringValue(error.code)
  const message = toStringValue(error.message).toLowerCase()

  if (code === '42501') {
    return 403
  }
  if (code === 'PGRST301' || code === '401') {
    return 401
  }
  if (message.includes('jwt') && message.includes('expired')) {
    return 401
  }
  if (message.includes('not authenticated') || message.includes('invalid login credentials')) {
    return 401
  }

  return 500
}

export function toSupabaseRequestError(
  error: unknown,
  fallbackMessage: string,
): SupabaseRequestError {
  if (error instanceof SupabaseRequestError) {
    return error
  }

  const maybeError = (error ?? {}) as SupabaseLikeError
  const message = toStringValue(maybeError.message) || fallbackMessage
  const code = toStringValue(maybeError.code) || undefined
  const status = getStatus(maybeError)
  return new SupabaseRequestError(message, status, code)
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof SupabaseRequestError && error.status === 401
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof SupabaseRequestError && error.status === 403
}
