import { useEffect, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { ensureOwnProfileForSession, getOwnProfile, updateOwnDisplayName } from '../features/profiles/api'
import { supabase } from '../lib/supabase'
import { isUnauthorizedError } from '../lib/supabaseErrors'

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

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const Subheading = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.h2Size};
  color: ${({ theme }) => theme.colors.text};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const Input = styled.input`
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

const HelperText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
`

const ErrorText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.danger};
`

const SuccessText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.accentStrong};
`

export function AccountPage({ navigate }: AccountPageProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatNewPassword, setRepeatNewPassword] = useState('')

  const [nameError, setNameError] = useState('')
  const [nameSuccess, setNameSuccess] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const [savingName, setSavingName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    let disposed = false

    const load = async () => {
      if (!supabase) {
        if (!disposed) {
          setLoadError('Supabase is not configured.')
          setLoading(false)
        }
        return
      }

      setLoadError('')
      setLoading(true)

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }
        if (!user) {
          navigate('/record')
          return
        }

        await ensureOwnProfileForSession(user)
        const profile = await getOwnProfile()

        if (disposed) {
          return
        }

        setEmail(user.email ?? '')
        setDisplayName(profile?.displayName ?? 'Member')
      } catch (error) {
        if (disposed) {
          return
        }
        if (isUnauthorizedError(error)) {
          await supabase.auth.signOut()
          navigate('/record')
          return
        }
        setLoadError(error instanceof Error ? error.message : 'Could not load account details.')
      } finally {
        if (!disposed) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      disposed = true
    }
  }, [navigate])

  const onSaveDisplayName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNameError('')
    setNameSuccess('')

    if (!displayName.trim()) {
      setNameError('Display name is required.')
      return
    }

    setSavingName(true)
    try {
      await updateOwnDisplayName(displayName)
      setNameSuccess('Display name saved.')
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await supabase?.auth.signOut()
        navigate('/record')
        return
      }
      setNameError(error instanceof Error ? error.message : 'Could not update display name.')
    } finally {
      setSavingName(false)
    }
  }

  const onSaveEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEmailError('')
    setEmailSuccess('')

    if (!supabase) {
      setEmailError('Supabase is not configured.')
      return
    }
    if (!email.trim()) {
      setEmailError('Email is required.')
      return
    }

    setSavingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() })
      if (error) {
        throw error
      }
      setEmailSuccess('Check your inbox to confirm the new email address.')
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Could not update email.')
    } finally {
      setSavingEmail(false)
    }
  }

  const onSavePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!supabase) {
      setPasswordError('Supabase is not configured.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== repeatNewPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        throw error
      }
      setNewPassword('')
      setRepeatNewPassword('')
      setPasswordSuccess('Password updated.')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Could not update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <Section>
        <Heading>Account</Heading>
        <HelperText>Loading account details...</HelperText>
      </Section>
    )
  }

  return (
    <Section>
      <Heading>Account</Heading>
      {loadError && <ErrorText>{loadError}</ErrorText>}

      <Card>
        <Subheading>Display name</Subheading>
        <Form onSubmit={onSaveDisplayName}>
          <FieldLabel>
            Display name
            <Input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              maxLength={80}
              required
            />
          </FieldLabel>
          {nameError && <ErrorText>{nameError}</ErrorText>}
          {nameSuccess && <SuccessText>{nameSuccess}</SuccessText>}
          <Button variant="primary" type="submit" disabled={savingName}>
            {savingName ? 'Saving...' : 'Save display name'}
          </Button>
        </Form>
      </Card>

      <Card>
        <Subheading>Email</Subheading>
        <Form onSubmit={onSaveEmail}>
          <FieldLabel>
            Email address
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </FieldLabel>
          <HelperText>Supabase may require confirmation for email changes.</HelperText>
          {emailError && <ErrorText>{emailError}</ErrorText>}
          {emailSuccess && <SuccessText>{emailSuccess}</SuccessText>}
          <Button variant="primary" type="submit" disabled={savingEmail}>
            {savingEmail ? 'Saving...' : 'Save email'}
          </Button>
        </Form>
      </Card>

      <Card>
        <Subheading>Password</Subheading>
        <Form onSubmit={onSavePassword}>
          <FieldLabel>
            New password
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </FieldLabel>
          <FieldLabel>
            Repeat new password
            <Input
              type="password"
              value={repeatNewPassword}
              onChange={(event) => setRepeatNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </FieldLabel>
          {passwordError && <ErrorText>{passwordError}</ErrorText>}
          {passwordSuccess && <SuccessText>{passwordSuccess}</SuccessText>}
          <Button variant="primary" type="submit" disabled={savingPassword}>
            {savingPassword ? 'Saving...' : 'Save password'}
          </Button>
        </Form>
      </Card>

      <Button onClick={() => navigate('/settings')}>Back to Settings</Button>
    </Section>
  )
}
