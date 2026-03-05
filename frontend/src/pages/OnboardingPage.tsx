import { useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { PageContainer } from '../components/PageContainer'

interface OnboardingPageProps {
  hasPendingInvite: boolean
  onCreateFamily: (name: string) => Promise<void>
  onJoinPendingInvite: () => Promise<void>
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

const Field = styled.input`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.bodySize};
`

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
`

const SuccessText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.accentStrong};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

export function OnboardingPage({
  hasPendingInvite,
  onCreateFamily,
  onJoinPendingInvite,
}: OnboardingPageProps) {
  const [familyName, setFamilyName] = useState('My Family')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setCreating(true)
    try {
      await onCreateFamily(familyName.trim() || 'My Family')
      setMessage('Family created.')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create family.')
    } finally {
      setCreating(false)
    }
  }

  const onJoin = async () => {
    setError('')
    setMessage('')
    setJoining(true)
    try {
      await onJoinPendingInvite()
      setMessage('Invitation accepted.')
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Could not join via invite.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <Section>
      <PageContainer>
        <Card>
          <Stack>
            <Title>Welcome</Title>
            <Body>Create your family to start capturing moments.</Body>
            <Form onSubmit={onSubmit}>
              <Field
                type="text"
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                maxLength={80}
                aria-label="Family name"
              />
              <Button type="submit" variant="primary" fullWidth disabled={creating || joining}>
                {creating ? 'Creating family...' : 'Create family'}
              </Button>
            </Form>

            {hasPendingInvite && (
              <Button type="button" fullWidth disabled={creating || joining} onClick={() => void onJoin()}>
                {joining ? 'Joining family...' : 'Join family'}
              </Button>
            )}

            {error && <ErrorText>{error}</ErrorText>}
            {message && <SuccessText>{message}</SuccessText>}
          </Stack>
        </Card>
      </PageContainer>
    </Section>
  )
}
