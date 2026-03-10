export const FAMILY_ROLE_OWNER = 'OWNER'
export const FAMILY_ROLE_MEMBER = 'MEMBER'

export const FAMILY_MEMBER_LABEL_OWNER = 'Owner'
export const FAMILY_MEMBER_LABEL_VIEWER = 'Viewer'
export const FAMILY_MEMBER_FALLBACK_NAME = FAMILY_MEMBER_LABEL_VIEWER

export type FamilyMemberRole = typeof FAMILY_ROLE_OWNER | typeof FAMILY_ROLE_MEMBER

export function normalizeFamilyMemberRole(role: string): FamilyMemberRole {
  return role === FAMILY_ROLE_OWNER ? FAMILY_ROLE_OWNER : FAMILY_ROLE_MEMBER
}

export function toFamilyMemberRoleLabel(role: FamilyMemberRole): string {
  return role === FAMILY_ROLE_OWNER ? FAMILY_MEMBER_LABEL_OWNER : FAMILY_MEMBER_LABEL_VIEWER
}
