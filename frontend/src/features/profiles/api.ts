import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { toSupabaseRequestError } from '../../lib/supabaseErrors'

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
  const client = requireSupabase()
  const fallbackDisplayName =
    normalizeDisplayName(preferredDisplayName) ??
    readPendingDisplayName(user.id) ??
    displayNameFromMetadata(user) ??
    'Member'

  const { error } = await client.from('profiles').upsert(
    {
      user_id: user.id,
      display_name: fallbackDisplayName,
    },
    {
      onConflict: 'user_id',
      ignoreDuplicates: true,
    },
  )

  if (error) {
    throw toSupabaseRequestError(error, 'Could not ensure profile.')
  }

  clearPendingDisplayName(user.id)
}

export async function getOwnProfile(): Promise<Profile | null> {
  const client = requireSupabase()
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser()

  if (authError) {
    throw toSupabaseRequestError(authError, 'Could not load account.')
  }
  if (!user) {
    return null
  }

  const { data, error } = await client
    .from('profiles')
    .select('user_id,display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw toSupabaseRequestError(error, 'Could not load profile.')
  }
  if (!data) {
    return null
  }

  return {
    userId: String(data.user_id),
    displayName: String(data.display_name),
  }
}

export async function updateOwnDisplayName(displayName: string): Promise<void> {
  const client = requireSupabase()
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser()

  if (authError) {
    throw toSupabaseRequestError(authError, 'Could not update profile.')
  }
  if (!user) {
    throw new Error('Not authenticated.')
  }

  const normalizedDisplayName = normalizeDisplayName(displayName)
  if (!normalizedDisplayName) {
    throw new Error('Display name is required.')
  }

  const { error } = await client
    .from('profiles')
    .update({
      display_name: normalizedDisplayName,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) {
    throw toSupabaseRequestError(error, 'Could not update display name.')
  }
}

export async function getDisplayNamesByUserIds(userIds: string[]): Promise<Record<string, string>> {
  const client = requireSupabase()
  if (userIds.length === 0) {
    return {}
  }

  const { data, error } = await client
    .from('profiles')
    .select('user_id,display_name')
    .in('user_id', userIds)

  if (error) {
    throw toSupabaseRequestError(error, 'Could not load member profiles.')
  }

  const displayNames: Record<string, string> = {}
  for (const row of data ?? []) {
    const userId = String(row.user_id)
    const displayName = normalizeDisplayName(String(row.display_name))
    if (displayName) {
      displayNames[userId] = displayName
    }
  }
  return displayNames
}
