import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { backendRequestJson, backendRequestVoid } from '../../lib/backendApi'

const PENDING_DISPLAY_NAME_PREFIX = 'lm_pending_display_name_'

export interface Profile {
  userId: string
  displayName: string
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

function normalizeDisplayName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getPendingDisplayNameKey(userId: string): string {
  return `${PENDING_DISPLAY_NAME_PREFIX}${userId}`
}

function readPendingDisplayName(userId: string): string | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null
  }
  return normalizeDisplayName(window.localStorage.getItem(getPendingDisplayNameKey(userId)))
}

function clearPendingDisplayName(userId: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return
  }
  window.localStorage.removeItem(getPendingDisplayNameKey(userId))
}

function displayNameFromMetadata(user: User): string | null {
  return normalizeDisplayName(user.user_metadata?.display_name)
}

export function rememberPendingDisplayName(userId: string, displayName: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return
  }
  const normalized = normalizeDisplayName(displayName)
  if (!normalized) {
    return
  }
  window.localStorage.setItem(getPendingDisplayNameKey(userId), normalized)
}

export async function ensureOwnProfileForSession(
  user: User,
  preferredDisplayName?: string,
): Promise<void> {
  requireSupabase()
  const fallbackDisplayName =
    normalizeDisplayName(preferredDisplayName) ??
    readPendingDisplayName(user.id) ??
    displayNameFromMetadata(user) ??
    'Member'

  await backendRequestVoid('/profiles/ensure', {
    method: 'POST',
    body: JSON.stringify({
      displayName: fallbackDisplayName,
    }),
  })

  clearPendingDisplayName(user.id)
}

export async function getOwnProfile(): Promise<Profile | null> {
  const client = requireSupabase()
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error) {
    throw error
  }
  if (!user) {
    return null
  }

  const data = await backendRequestJson<{ userId: string; displayName: string }>('/profiles/me')

  return {
    userId: String(data.userId),
    displayName: String(data.displayName),
  }
}

export async function updateOwnDisplayName(displayName: string): Promise<void> {
  requireSupabase()

  const normalizedDisplayName = normalizeDisplayName(displayName)
  if (!normalizedDisplayName) {
    throw new Error('Display name is required.')
  }

  await backendRequestVoid('/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify({
      displayName: normalizedDisplayName,
    }),
  })
}
