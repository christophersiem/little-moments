import { backendRequestJson, backendRequestVoid } from '../../lib/backendApi'

/*
 * Security notes:
 * - The frontend never simulates authorization rules.
 * - Role/member writes run through backend RPC wrappers.
 * - Supabase RLS remains the source of truth for data visibility.
 */

interface FamilyIdResponse {
  familyId: string
}

interface ChildIdResponse {
  childId: string | null
}

interface TokenResponse {
  token: string
}

interface FamilyMemberApiResponse {
  userId: string
  displayName: string
  role: 'OWNER' | 'MEMBER' | string
  joinedAt: string
}

export async function createFamilyWithOwner(name: string): Promise<string> {
  const payload = await backendRequestJson<FamilyIdResponse>('/families/with-owner', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

  if (typeof payload.familyId !== 'string' || payload.familyId.length === 0) {
    throw new Error('Family onboarding did not return a family id.')
  }

  return payload.familyId
}

export interface FamilyMember {
  userId: string
  displayName: string
  role: 'OWNER' | 'MEMBER'
  joinedAt: string
}

export type FamilyMemberRole = 'OWNER' | 'MEMBER'

export async function getFirstChildIdForFamily(familyId: string): Promise<string | null> {
  const payload = await backendRequestJson<ChildIdResponse>(
    `/families/${encodeURIComponent(familyId)}/children/first`,
  )
  return payload.childId ?? null
}

export async function ensureDefaultChildForFamily(familyId: string): Promise<string> {
  const payload = await backendRequestJson<ChildIdResponse>(
    `/families/${encodeURIComponent(familyId)}/children/default`,
    {
      method: 'POST',
    },
  )

  if (typeof payload.childId !== 'string' || payload.childId.length === 0) {
    throw new Error('Could not ensure a child for this family.')
  }

  return payload.childId
}

function mapRole(role: string): FamilyMemberRole {
  return role === 'OWNER' ? 'OWNER' : 'MEMBER'
}

export async function listFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const rows = await backendRequestJson<FamilyMemberApiResponse[]>(
    `/families/${encodeURIComponent(familyId)}/members`,
  )

  return (rows ?? []).map((row) => ({
    userId: String(row.userId),
    displayName: typeof row.displayName === 'string' && row.displayName.trim() ? row.displayName : 'Member',
    role: mapRole(String(row.role)),
    joinedAt: String(row.joinedAt),
  }))
}

export async function createInvitation(
  familyId: string,
  email: string,
  role: 'OWNER' | 'MEMBER' = 'MEMBER',
): Promise<string> {
  const payload = await backendRequestJson<TokenResponse>(
    `/families/${encodeURIComponent(familyId)}/invitations`,
    {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        role,
      }),
    },
  )

  if (typeof payload.token !== 'string' || payload.token.length === 0) {
    throw new Error('Could not create invitation.')
  }

  return payload.token
}

export async function acceptInvitation(token: string): Promise<string> {
  const payload = await backendRequestJson<FamilyIdResponse>('/invitations/accept', {
    method: 'POST',
    body: JSON.stringify({
      token: token.trim(),
    }),
  })

  if (typeof payload.familyId !== 'string' || payload.familyId.length === 0) {
    throw new Error('Could not accept invitation.')
  }

  return payload.familyId
}

export async function removeMember(familyId: string, userId: string): Promise<void> {
  await backendRequestVoid(`/families/${encodeURIComponent(familyId)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}

export async function setMemberRole(
  familyId: string,
  userId: string,
  newRole: FamilyMemberRole,
): Promise<void> {
  await backendRequestVoid(
    `/families/${encodeURIComponent(familyId)}/members/${encodeURIComponent(userId)}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    },
  )
}
