import styled from 'styled-components'
import { Button } from '../components/Button'

interface AccountPageProps {
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

const FieldCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
`

const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
`

const Value = styled.span`
  font-size: ${({ theme }) => theme.typography.bodySize};
  color: ${({ theme }) => theme.colors.text};
`

export function AccountPage({ navigate }: AccountPageProps) {
  return (
    <Section>
      <Heading>Account</Heading>

      <FieldCard>
        <Label>Name</Label>
        <Value>Little Moments User</Value>
      </FieldCard>

      <FieldCard>
        <Label>Email</Label>
        <Value>you@example.com</Value>
      </FieldCard>

      <FieldCard>
        <Label>Password</Label>
        <Value>••••••••</Value>
      </FieldCard>

      <Button onClick={() => navigate('/settings')}>Back to Settings</Button>
    </Section>
  )
}
