import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { PageContainer } from '../components/PageContainer'
import { acceptInvitation } from '../features/families/api'
import { clearPendingInviteToken, getPendingInviteToken, setPendingInviteToken } from '../features/families/localState'
import { supabase } from '../lib/supabase'
import { isForbiddenError, isUnauthorizedError } from '../lib/supabaseErrors'

interface AcceptInvitePageProps {
  navigate: (nextPath: string) => void
  onAccepted?: (familyId: string) => void
}

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
`

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.h1Size};
  color: ${({ theme }) => theme.colors.text};
`

const Body = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
`

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
`

const SuccessText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.accentStrong};
`

function getTokenFromSearch(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('token')?.trim() ?? ''
}

export function AcceptInvitePage({ navigate, onAccepted }: AcceptInvitePageProps) {
  const tokenFromUrl = useMemo(() => getTokenFromSearch(), [])
  const token = tokenFromUrl || getPendingInviteToken() || ''
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (tokenFromUrl) {
      setPendingInviteToken(tokenFromUrl)
    }
  }, [tokenFromUrl])

  const onAccept = async () => {
    if (!token) {
      setError('Invite token is missing from this link.')
      return
    }
    setIsSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const acceptedFamilyId = await acceptInvitation(token)
      clearPendingInviteToken()
      setSuccess('Invitation accepted. You are now a member of this family.')
      onAccepted?.(acceptedFamilyId)
      navigate('/memories')
    } catch (acceptError) {
      if (isUnauthorizedError(acceptError)) {
        setPendingInviteToken(token)
        setError('Your session expired. Please sign in again.')
        void supabase?.auth.signOut()
        navigate('/record')
      } else if (isForbiddenError(acceptError)) {
        setError('You are not authorized to accept this invitation.')
      } else {
        setError(acceptError instanceof Error ? acceptError.message : 'Could not accept invitation.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!token) {
      return
    }
    void onAccept()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <Section>
      <PageContainer>
        <Card>
          <Stack>
            <Title>Accept invitation</Title>
            <Body>Confirm this invitation to join the family.</Body>
            {error && <ErrorText>{error}</ErrorText>}
            {success && <SuccessText>{success}</SuccessText>}
            <Button type="button" variant="primary" onClick={() => void onAccept()} disabled={isSubmitting}>
              {isSubmitting ? 'Accepting...' : 'Accept invitation'}
            </Button>
            <Button type="button" onClick={() => navigate('/memories')}>
              Go to memories
            </Button>
          </Stack>
        </Card>
      </PageContainer>
    </Section>
  )
}
