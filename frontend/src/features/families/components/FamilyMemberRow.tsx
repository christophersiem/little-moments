import styled from 'styled-components'
import { OverflowMenu, type OverflowMenuAction } from '../../../components/OverflowMenu'
import type { FamilyMember } from '../api'
import { RoleBadge } from './RoleBadge'

interface FamilyMemberRowProps {
  member: FamilyMember
  isCurrentUser: boolean
  menuActions: OverflowMenuAction[]
  actionsDisabled?: boolean
}

const Row = styled.div`
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x3};
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x2}`};
`

const Leading = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x3};
  min-width: 0;
  flex: 1;
`

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const TextWrap = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
`

const Name = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.bodySize};
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const YouText = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) {
    return 'M'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function FamilyMemberRow({
  member,
  isCurrentUser,
  menuActions,
  actionsDisabled = false,
}: FamilyMemberRowProps) {
  const safeName = member.displayName?.trim() || 'Member'

  return (
    <Row>
      <Leading>
        <Avatar aria-hidden>{initialsFromName(safeName)}</Avatar>
        <TextWrap>
          <Name>
            {safeName} {isCurrentUser && <YouText>(You)</YouText>}
          </Name>
          <MetaRow>
            <RoleBadge role={member.role} />
          </MetaRow>
        </TextWrap>
      </Leading>
      <OverflowMenu actions={menuActions} ariaLabel="Member actions" disabled={actionsDisabled} />
    </Row>
  )
}

