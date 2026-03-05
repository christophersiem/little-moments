import { useEffect, useMemo, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import {
  createInvitation,
  listFamilyMembers,
  removeMember,
  setMemberRole,
  type FamilyMember,
} from '../features/families/api'
import { supabase } from '../lib/supabase'
import { isForbiddenError, isUnauthorizedError } from '../lib/supabaseErrors'

interface FamilyPageProps {
  familyId: string | null
  navigate: (nextPath: string) => void
}

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const Heading = styled.h2`
  margin: 0;
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.text};
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
  gap: ${({ theme }) => theme.space.x2};
`

const MemberRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const MemberRole = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`

const MemberMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space.x1};
`

const SmallActionButton = styled.button`
  min-height: 34px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.space.x1} ${theme.space.x2}`};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const DangerActionButton = styled(SmallActionButton)`
  color: ${({ theme }) => theme.colors.danger};
  border-color: ${({ theme }) => theme.colors.danger};
`

const InviteForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const InviteInput = styled.input`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const InviteLink = styled.textarea`
  width: 100%;
  min-height: 84px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.space.x2};
  resize: vertical;
`

const SmallText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
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

export function FamilyPage({ familyId, navigate }: FamilyPageProps) {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [membersError, setMembersError] = useState('')
  const [memberActionError, setMemberActionError] = useState('')
  const [memberActionMessage, setMemberActionMessage] = useState('')
  const [memberActionBusyKey, setMemberActionBusyKey] = useState<string | null>(null)
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
    setLoadingMembers(true)
    setMembersError('')

    void listFamilyMembers(familyId)
      .then((payload) => {
        if (!disposed) {
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

  const ownerCount = useMemo(() => members.filter((member) => member.role === 'OWNER').length, [members])
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
      setInviteMessage('Invite link created. Share it with this email owner.')
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

  return (
    <Section>
      <Heading>Family</Heading>

      <Subheading>Members</Subheading>
      <Card>
        {loadingMembers && <SmallText>Loading members...</SmallText>}
        {!loadingMembers && members.length === 0 && <SmallText>No members found.</SmallText>}
        {!loadingMembers &&
          members.map((member) => (
            <MemberRow key={`${member.userId}-${member.joinedAt}`}>
              <MemberMeta>
                <span>{member.displayName || 'Member'}</span>
                <MemberRole>
                  {member.role}
                  {member.userId === currentUserId ? ' (You)' : ''}
                </MemberRole>
              </MemberMeta>
              {isCurrentUserOwner && member.userId !== currentUserId && (
                <ActionRow>
                  {member.role === 'MEMBER' ? (
                    <SmallActionButton
                      type="button"
                      disabled={memberActionBusyKey !== null}
                      onClick={() =>
                        void runMemberAction(
                          `promote:${member.userId}`,
                          () => setMemberRole(familyId ?? '', member.userId, 'OWNER'),
                          'Member promoted to owner.',
                          'Could not promote member.',
                        )
                      }
                    >
                      Promote to OWNER
                    </SmallActionButton>
                  ) : (
                    <SmallActionButton
                      type="button"
                      disabled={memberActionBusyKey !== null}
                      onClick={() =>
                        void runMemberAction(
                          `demote:${member.userId}`,
                          () => setMemberRole(familyId ?? '', member.userId, 'MEMBER'),
                          'Owner changed to member.',
                          'Could not demote owner.',
                        )
                      }
                    >
                      Demote to MEMBER
                    </SmallActionButton>
                  )}
                  <DangerActionButton
                    type="button"
                    disabled={memberActionBusyKey !== null}
                    onClick={() =>
                      void runMemberAction(
                        `remove:${member.userId}`,
                        () => removeMember(familyId ?? '', member.userId),
                        'Member removed.',
                        'Could not remove member.',
                      )
                    }
                  >
                    Remove
                  </DangerActionButton>
                </ActionRow>
              )}
            </MemberRow>
          ))}
        {!loadingMembers && members.length > 0 && (
          <SmallText>
            {members.length} member(s), {ownerCount} owner(s)
          </SmallText>
        )}
        {membersError && <ErrorText>{membersError}</ErrorText>}
        {memberActionError && <ErrorText>{memberActionError}</ErrorText>}
        {memberActionMessage && <SuccessText>{memberActionMessage}</SuccessText>}
      </Card>

      <Subheading>Invite member</Subheading>
      <Card>
        <InviteForm onSubmit={onCreateInvite}>
          <InviteInput
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            autoComplete="email"
            required
          />
          <Button type="submit" variant="primary" disabled={creatingInvite || !familyId}>
            {creatingInvite ? 'Creating...' : 'Create invite link'}
          </Button>
        </InviteForm>

        {inviteError && <ErrorText>{inviteError}</ErrorText>}
        {inviteMessage && <SuccessText>{inviteMessage}</SuccessText>}

        {inviteLink && (
          <>
            <InviteLink readOnly value={inviteLink} />
            <Button type="button" onClick={() => void onCopyInvite()}>
              Copy link
            </Button>
          </>
        )}
        <SmallText>No email is sent yet. Share this link manually.</SmallText>
      </Card>
    </Section>
  )
}
