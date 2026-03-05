import { supabase } from '../../lib/supabase'
import { toSupabaseRequestError } from '../../lib/supabaseErrors'
import { getDisplayNamesByUserIds } from '../profiles/api'

/*
 * Security notes:
 * - The frontend never simulates authorization rules.
 * - RLS is the source of truth for row visibility and write permissions.
 * - Sensitive writes (family creation, invitations, acceptance, member removal)
 *   run through SECURITY DEFINER RPCs with explicit server-side role checks.
 */

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

export async function createFamilyWithOwner(name: string): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('rpc_create_family_with_owner', { name })

  if (error) {
    throw toSupabaseRequestError(error, 'Could not create family.')
  }

  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Family onboarding did not return a family id.')
  }

  return data
}

export interface FamilyMember {
  userId: string
  displayName: string
  role: 'OWNER' | 'MEMBER'
  joinedAt: string
}

export type FamilyMemberRole = 'OWNER' | 'MEMBER'

export async function getFirstChildIdForFamily(familyId: string): Promise<string | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('children')
    .select('id')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) {
    throw toSupabaseRequestError(error, 'Could not load child.')
  }

  return data?.[0]?.id ?? null
}

export async function ensureDefaultChildForFamily(familyId: string): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('rpc_ensure_default_child_for_family', {
    p_family_id: familyId,
    p_child_name: 'My Child',
  })

  if (error) {
    throw toSupabaseRequestError(error, 'Could not ensure default child.')
  }

  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Could not ensure a child for this family.')
  }

  return data
}

export async function listFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('family_members')
    .select('user_id,role,joined_at')
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true })

  if (error) {
    throw toSupabaseRequestError(error, 'Could not load family members.')
  }

  const rows = data ?? []
  const userIds = rows.map((row) => String(row.user_id))
  const namesByUserId = await getDisplayNamesByUserIds(userIds)

  return rows.map((row) => {
    const userId = String(row.user_id)
    return {
      userId,
      displayName: namesByUserId[userId] ?? 'Member',
      role: row.role === 'OWNER' ? 'OWNER' : 'MEMBER',
      joinedAt: String(row.joined_at),
    }
  })
}

export async function createInvitation(
  familyId: string,
  email: string,
  role: 'OWNER' | 'MEMBER' = 'MEMBER',
): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('rpc_create_invitation', {
    p_family_id: familyId,
    p_email: email.trim().toLowerCase(),
    p_role: role,
  })

  if (error) {
    throw toSupabaseRequestError(error, 'Could not create invitation.')
  }
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Could not create invitation.')
  }

  return data
}

export async function acceptInvitation(token: string): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('rpc_accept_invitation', {
    p_token: token.trim(),
  })

  if (error) {
    throw toSupabaseRequestError(error, 'Could not accept invitation.')
  }
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Could not accept invitation.')
  }
  return data
}

export async function removeMember(familyId: string, userId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('rpc_remove_member', {
    p_family_id: familyId,
    p_user_id: userId,
  })

  if (error) {
    throw toSupabaseRequestError(error, 'Could not remove member.')
  }
}

export async function setMemberRole(
  familyId: string,
  userId: string,
  newRole: FamilyMemberRole,
): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('rpc_set_member_role', {
    p_family_id: familyId,
    p_target_user_id: userId,
    p_new_role: newRole,
  })

  if (error) {
    throw toSupabaseRequestError(error, 'Could not update member role.')
  }
}
