import styled from 'styled-components'
import type { FamilyMemberRole } from '../api'

interface RoleBadgeProps {
  role: FamilyMemberRole
}

const Badge = styled.span<{ $role: FamilyMemberRole }>`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, $role }) => ($role === 'OWNER' ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, $role }) => ($role === 'OWNER' ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $role }) => ($role === 'OWNER' ? theme.colors.accentStrong : theme.colors.textMuted)};
  font-size: 0.75rem;
  line-height: 1;
  padding: 0 ${({ theme }) => theme.space.x2};
`

export function RoleBadge({ role }: RoleBadgeProps) {
  return <Badge $role={role}>{role === 'OWNER' ? 'Owner' : 'Member'}</Badge>
}

