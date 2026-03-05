import { useEffect, useMemo, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { OverflowMenuAction } from '../components/OverflowMenu'
import { FamilyMemberRow } from '../features/families/components/FamilyMemberRow'
import {
  createInvitation,
  listFamilyMembers,
  removeMember,
  setMemberRole,
  type FamilyMember,
  type FamilySummary,
} from '../features/families/api'
import { supabase } from '../lib/supabase'
import { isForbiddenError, isUnauthorizedError } from '../lib/supabaseErrors'

interface FamilyPageProps {
  familyId: string | null
  families: FamilySummary[]
  navigate: (nextPath: string) => void
  onActiveFamilyChange?: (nextFamilyId: string) => void
}

type ConfirmActionType = 'make-owner' | 'demote-owner' | 'remove'

interface ConfirmAction {
  type: ConfirmActionType
  member: FamilyMember
}

const familyMembersCache = new Map<string, FamilyMember[]>()

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x5};
`

const Heading = styled.h2`
  margin: 0;
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.text};
`

const Block = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const FamilySelector = styled.select`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `0 ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.bodySize};
`

const Subheading = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.h2Size};
  color: ${({ theme }) => theme.colors.text};
`

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const MemberList = styled.div`
  display: flex;
  flex-direction: column;
`

const RowDivider = styled.div`
  height: 1px;
  margin: 0 ${({ theme }) => theme.space.x2};
  background: ${({ theme }) => theme.colors.border};
`

const InviteForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const InviteInput = styled.input`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.bodySize};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const LinkWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const InviteLinkField = styled.input`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const SmallText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.bodyLineHeight};
`

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const SuccessText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.accentStrong};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

function displayName(member: FamilyMember): string {
  return member.displayName?.trim() || 'Member'
}

export function FamilyPage({ familyId, families, navigate, onActiveFamilyChange }: FamilyPageProps) {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [membersError, setMembersError] = useState('')
  const [memberActionError, setMemberActionError] = useState('')
  const [memberActionMessage, setMemberActionMessage] = useState('')
  const [memberActionBusyKey, setMemberActionBusyKey] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [email, setEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [creatingInvite, setCreatingInvite] = useState(false)

  useEffect(() => {
    let disposed = false
    if (!supabase) {
      return
    }

    void supabase.auth.getUser().then(({ data, error }) => {
      if (disposed) {
        return
      }
      if (error || !data.user) {
        navigate('/record')
        return
      }
      setCurrentUserId(data.user.id)
    })

    return () => {
      disposed = true
    }
  }, [navigate])

  useEffect(() => {
    if (!familyId) {
      setMembers([])
      return
    }

    let disposed = false
    const cachedMembers = familyMembersCache.get(familyId)
    if (cachedMembers) {
      setMembers(cachedMembers)
      setLoadingMembers(false)
    } else {
      setLoadingMembers(true)
    }
    setMembersError('')

    void listFamilyMembers(familyId)
      .then((payload) => {
        if (!disposed) {
          familyMembersCache.set(familyId, payload)
          setMembers(payload)
        }
      })
      .catch((error) => {
        if (disposed) {
          return
        }
        if (isUnauthorizedError(error)) {
          setMembersError('Your session expired. Please sign in again.')
          void supabase?.auth.signOut()
          navigate('/record')
          return
        }
        if (isForbiddenError(error)) {
          setMembersError('You are not authorized to view family members.')
          return
        }
        setMembersError(error instanceof Error ? error.message : 'Could not load members.')
      })
      .finally(() => {
        if (!disposed) {
          setLoadingMembers(false)
        }
      })

    return () => {
      disposed = true
    }
  }, [familyId, navigate])

  const isCurrentUserOwner = useMemo(() => {
    if (!currentUserId) {
      return false
    }
    return members.some((member) => member.userId === currentUserId && member.role === 'OWNER')
  }, [currentUserId, members])

  const toMemberActionError = (error: unknown, fallback: string): string => {
    if (isForbiddenError(error)) {
      return 'Not authorized'
    }
    if (isUnauthorizedError(error)) {
      return 'Your session expired. Please sign in again.'
    }
    if (error instanceof Error) {
      const normalized = error.message.toLowerCase()
      if (normalized.includes('last owner')) {
        return 'Cannot remove the last owner'
      }
      if (normalized.includes('not authorized') || normalized.includes('only owners')) {
        return 'Not authorized'
      }
      return error.message
    }
    return fallback
  }

  const refreshMembers = async (): Promise<void> => {
    if (!familyId) {
      return
    }
    const payload = await listFamilyMembers(familyId)
    familyMembersCache.set(familyId, payload)
    setMembers(payload)
  }

  const runMemberAction = async (
    actionKey: string,
    run: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) => {
    setMemberActionError('')
    setMemberActionMessage('')
    setMemberActionBusyKey(actionKey)
    try {
      await run()
      await refreshMembers()
      setMemberActionMessage(successMessage)
    } catch (error) {
      if (isUnauthorizedError(error)) {
        void supabase?.auth.signOut()
        navigate('/record')
        return
      }
      setMemberActionError(toMemberActionError(error, fallbackErrorMessage))
    } finally {
      setMemberActionBusyKey(null)
    }
  }

  const onConfirmMemberAction = async () => {
    if (!confirmAction || !familyId) {
      return
    }

    const { member, type } = confirmAction
    if (type === 'make-owner') {
      await runMemberAction(
        `make-owner:${member.userId}`,
        () => setMemberRole(familyId, member.userId, 'OWNER'),
        'Owner updated.',
        'Could not update role.',
      )
      setConfirmAction(null)
      return
    }

    if (type === 'demote-owner') {
      await runMemberAction(
        `demote-owner:${member.userId}`,
        () => setMemberRole(familyId, member.userId, 'MEMBER'),
        'Owner access removed.',
        'Could not update role.',
      )
      setConfirmAction(null)
      return
    }

    await runMemberAction(
      `remove:${member.userId}`,
      () => removeMember(familyId, member.userId),
      'Member removed.',
      'Could not remove member.',
    )
    setConfirmAction(null)
  }

  const onCreateInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!familyId) {
      setInviteError('Family is not ready yet.')
      return
    }

    setInviteError('')
    setInviteMessage('')
    setInviteLink('')
    setCreatingInvite(true)

    try {
      const token = await createInvitation(familyId, email, 'MEMBER')
      const link = `${window.location.origin}/invite/accept?token=${encodeURIComponent(token)}`
      setInviteLink(link)
      setInviteMessage('Invite link created.')
      setEmail('')
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setInviteError('Your session expired. Please sign in again.')
        void supabase?.auth.signOut()
        navigate('/record')
      } else if (isForbiddenError(error)) {
        setInviteError('You are not authorized to create invites for this family.')
      } else {
        setInviteError(error instanceof Error ? error.message : 'Could not create invitation.')
      }
    } finally {
      setCreatingInvite(false)
    }
  }

  const onCopyInvite = async () => {
    if (!inviteLink) {
      return
    }
    try {
      await navigator.clipboard.writeText(inviteLink)
      setInviteMessage('Invite link copied.')
    } catch {
      setInviteMessage('Copy failed. Please copy the link manually.')
    }
  }

  const confirmDialogTitle = confirmAction
    ? confirmAction.type === 'make-owner'
      ? `Make ${displayName(confirmAction.member)} the owner?`
      : confirmAction.type === 'demote-owner'
        ? `Remove owner access for ${displayName(confirmAction.member)}?`
      : `Remove ${displayName(confirmAction.member)}?`
    : ''

  const confirmDialogBody = confirmAction
    ? confirmAction.type === 'make-owner'
      ? 'They will be able to manage members and invites, and record moments.'
      : confirmAction.type === 'demote-owner'
        ? 'They will remain in the family as a member.'
      : 'They will lose access to memories in this family.'
    : ''

  const memberRows = members.map((member, index) => {
    const isCurrentUser = member.userId === currentUserId
    const menuActions: OverflowMenuAction[] =
      isCurrentUserOwner && !isCurrentUser
        ? member.role === 'OWNER'
          ? [
              {
                id: `demote-owner:${member.userId}`,
                label: 'Remove owner access',
                onSelect: () => setConfirmAction({ type: 'demote-owner', member }),
              },
              {
                id: `remove:${member.userId}`,
                label: 'Remove from family',
                tone: 'destructive',
                onSelect: () => setConfirmAction({ type: 'remove', member }),
              },
            ]
          : [
            {
              id: `make-owner:${member.userId}`,
              label: 'Make owner',
              onSelect: () => setConfirmAction({ type: 'make-owner', member }),
            },
            {
              id: `remove:${member.userId}`,
              label: 'Remove from family',
              tone: 'destructive',
              onSelect: () => setConfirmAction({ type: 'remove', member }),
            },
          ]
        : []

    return (
      <div key={`${member.userId}-${member.joinedAt}`}>
        <FamilyMemberRow
          member={member}
          isCurrentUser={isCurrentUser}
          menuActions={menuActions}
          actionsDisabled={memberActionBusyKey !== null}
        />
        {index < members.length - 1 && <RowDivider />}
      </div>
    )
  })

  return (
    <>
      <Section>
        <Heading>Family</Heading>

        {families.length > 1 && (
          <Block>
            <Subheading>Active family</Subheading>
            <FamilySelector
              value={familyId ?? ''}
              onChange={(event) => onActiveFamilyChange?.(event.target.value)}
              aria-label="Active family"
            >
              {families.map((family) => (
                <option key={family.familyId} value={family.familyId}>
                  {family.familyName}
                </option>
              ))}
            </FamilySelector>
          </Block>
        )}

        <Block>
          <Subheading>Members</Subheading>
          <Card>
            {loadingMembers && <SmallText>Loading members...</SmallText>}
            {!loadingMembers && members.length === 0 && <SmallText>No members found.</SmallText>}
            {!loadingMembers && members.length > 0 && <MemberList>{memberRows}</MemberList>}
            {membersError && <ErrorText>{membersError}</ErrorText>}
            {memberActionError && <ErrorText>{memberActionError}</ErrorText>}
            {memberActionMessage && <SuccessText>{memberActionMessage}</SuccessText>}
          </Card>
        </Block>

        {isCurrentUserOwner ? (
          <Block>
            <Subheading>Invite another parent</Subheading>
            <Card>
              <SmallText>Share access so you can both capture memories.</SmallText>
              <InviteForm onSubmit={onCreateInvite}>
                <InviteInput
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  required
                />
                <Button type="submit" variant="primary" disabled={creatingInvite || !familyId} fullWidth>
                  {creatingInvite ? 'Creating invite link...' : 'Create invite link'}
                </Button>
              </InviteForm>

              {inviteError && <ErrorText>{inviteError}</ErrorText>}
              {inviteMessage && <SuccessText>{inviteMessage}</SuccessText>}

              {inviteLink && (
                <LinkWrap>
                  <InviteLinkField readOnly value={inviteLink} aria-label="Invite link" />
                  <Button type="button" onClick={() => void onCopyInvite()} fullWidth>
                    Copy link
                  </Button>
                </LinkWrap>
              )}

              <SmallText>No email is sent automatically. Share this link manually.</SmallText>
            </Card>
          </Block>
        ) : (
          <Block>
            <Subheading>Invite another parent</Subheading>
            <Card>
              <SmallText>Only owners can invite new members.</SmallText>
            </Card>
          </Block>
        )}
      </Section>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmDialogTitle}
        body={confirmDialogBody}
        cancelLabel="Cancel"
        confirmLabel={
          confirmAction?.type === 'make-owner'
            ? 'Make owner'
            : confirmAction?.type === 'demote-owner'
              ? 'Remove owner access'
              : 'Remove'
        }
        confirmVariant={confirmAction?.type === 'remove' ? 'danger' : 'primary'}
        busy={memberActionBusyKey !== null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void onConfirmMemberAction()}
      />
    </>
  )
}
