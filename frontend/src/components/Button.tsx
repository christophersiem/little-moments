import type { ButtonHTMLAttributes } from 'react'
import styled, { css } from 'styled-components'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'nav'

interface StyledButtonProps {
  $variant: ButtonVariant
  $active: boolean
  $fullWidth: boolean
}

const baseButtonStyles = css`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.textMuted};
  border-radius: ${({ theme }) => theme.radii.pill};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x4}`};
  font-size: ${({ theme }) => theme.typography.bodySize};
  font-weight: 500;
  line-height: 1.1;
  cursor: pointer;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  transition: transform 150ms ease, background-color 150ms ease, border-color 150ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.accentStrong};
    color: ${({ theme }) => theme.colors.accentStrong};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
    transform: none;
  }
`

const primaryButtonStyles = css`
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.accent};
  border-color: ${({ theme }) => theme.colors.accent};
  min-height: ${({ theme }) => theme.layout.primaryButtonHeight};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.accentStrong};
    border-color: ${({ theme }) => theme.colors.accentStrong};
  }
`

const dangerButtonStyles = css`
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.danger};
  border-color: ${({ theme }) => theme.colors.danger};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surface};
    border-color: ${({ theme }) => theme.colors.danger};
  }
`

const navButtonStyles = css<StyledButtonProps>`
  border: none;
  background: transparent;
  width: 100%;
  padding: ${({ theme }) => `${theme.space.x1} ${theme.space.x2}`};
  border-radius: ${({ theme }) => theme.radii.md};
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.x1};
  font-size: 0.6875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textMuted};

  &:hover:not(:disabled) {
    transform: none;
    border-color: transparent;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.accentStrong};
  }

  ${({ $active }) =>
    $active &&
    css`
      color: ${({ theme }) => theme.colors.accentStrong};
      background: ${({ theme }) => theme.colors.surface};
    `}
`

const StyledButton = styled.button<StyledButtonProps>`
  ${baseButtonStyles}

  ${({ $variant }) => $variant === 'primary' && primaryButtonStyles}
  ${({ $variant }) => $variant === 'danger' && dangerButtonStyles}
  ${({ $variant }) => $variant === 'nav' && navButtonStyles}
`

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  active?: boolean
  fullWidth?: boolean
}

export function Button({ variant = 'secondary', active = false, fullWidth = false, ...props }: ButtonProps) {
  return <StyledButton $variant={variant} $active={active} $fullWidth={fullWidth} {...props} />
}
