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
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radii.pill};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x4}`};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  line-height: 1.1;
  cursor: pointer;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  transition: transform 150ms ease, background-color 150ms ease, border-color 150ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.accent};
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
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.onAccent};
  border-color: transparent;
  min-height: ${({ theme }) => theme.layout.primaryButtonHeight};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.accentStrong};
    border-color: transparent;
  }
`

const dangerButtonStyles = css`
  background: ${({ theme }) => theme.colors.danger};
  color: ${({ theme }) => theme.colors.onAccent};
  border-color: transparent;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.danger};
    filter: brightness(0.94);
    border-color: transparent;
  }
`

const navButtonStyles = css<StyledButtonProps>`
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  ${({ $active }) =>
    $active &&
    css`
      background: ${({ theme }) => theme.colors.accent};
      color: ${({ theme }) => theme.colors.onAccent};
      border-color: transparent;
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
