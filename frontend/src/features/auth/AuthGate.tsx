import { useState, type FormEvent } from 'react'
import styled from 'styled-components'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageContainer } from '../../components/PageContainer'
import { ensureOwnProfileForSession, rememberPendingDisplayName } from '../profiles/api'
import { supabase } from '../../lib/supabase'

type AuthMode = 'login' | 'register'

interface AuthGateProps {
  configurationError?: string
}

interface ValidationErrors {
  displayName?: string
  password?: string
  repeatPassword?: string
}

const AuthWrap = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.space.x6} 0`};
`

const Form = styled.form`
  width: 100%;
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

const FieldWrap = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const Input = styled.input`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.bodySize};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
`

const SuccessText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.accentStrong};
`

const FieldError = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const Toggle = styled.button`
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.accentStrong};
  text-decoration: underline;
  text-underline-offset: 2px;
  padding: 0;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

export function AuthGate({ configurationError }: AuthGateProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setValidationErrors({})

    if (!supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    if (mode === 'register') {
      const nextValidationErrors: ValidationErrors = {}
      if (!displayName.trim()) {
        nextValidationErrors.displayName = 'Please add a display name.'
      }
      if (password.length < 8) {
        nextValidationErrors.password = 'Password must be at least 8 characters.'
      }
      if (password !== repeatPassword) {
        nextValidationErrors.repeatPassword = 'Passwords do not match.'
      }
      if (Object.keys(nextValidationErrors).length > 0) {
        setValidationErrors(nextValidationErrors)
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (loginError) {
          setError(loginError.message)
        }
      } else {
        const { data, error: registerError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        })
        if (registerError) {
          setError(registerError.message)
        } else if (data.session?.user) {
          await ensureOwnProfileForSession(data.session.user, displayName)
          setMessage('Account created. You are now signed in.')
        } else if (data.user?.id) {
          rememberPendingDisplayName(data.user.id, displayName)
          setMessage('Account created. Please check your email to confirm your account.')
        } else if (!data.session) {
          setMessage('Account created. Please check your email to confirm your account.')
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode((current) => (current === 'login' ? 'register' : 'login'))
    setError('')
    setMessage('')
    setValidationErrors({})
    setPassword('')
    setRepeatPassword('')
  }

  return (
    <AuthWrap>
      <PageContainer>
        <Card>
          <Title>{mode === 'login' ? 'Sign in' : 'Create account'}</Title>
          <Body>
            {mode === 'login'
              ? 'Sign in to continue.'
              : 'Create your account to start saving memories.'}
          </Body>
          {configurationError && <ErrorText>{configurationError}</ErrorText>}
          <Form onSubmit={onSubmit}>
            <FieldWrap>
              Email
              <Input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </FieldWrap>
            {mode === 'register' && (
              <FieldWrap>
                Display name
                <Input
                  type="text"
                  name="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  required
                />
                {validationErrors.displayName && <FieldError>{validationErrors.displayName}</FieldError>}
              </FieldWrap>
            )}
            <FieldWrap>
              Password
              <Input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
              {validationErrors.password && <FieldError>{validationErrors.password}</FieldError>}
            </FieldWrap>
            {mode === 'register' && (
              <FieldWrap>
                Repeat password
                <Input
                  type="password"
                  name="repeatPassword"
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                {validationErrors.repeatPassword && (
                  <FieldError>{validationErrors.repeatPassword}</FieldError>
                )}
              </FieldWrap>
            )}

            {error && <ErrorText>{error}</ErrorText>}
            {message && <SuccessText>{message}</SuccessText>}

            <Button variant="primary" fullWidth disabled={isSubmitting || !!configurationError} type="submit">
              {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </Form>

          <Toggle type="button" onClick={toggleMode} disabled={isSubmitting}>
            {mode === 'login' ? 'New here? Create an account.' : 'Already have an account? Sign in.'}
          </Toggle>
        </Card>
      </PageContainer>
    </AuthWrap>
  )
}
