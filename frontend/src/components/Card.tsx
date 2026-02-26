import type { HTMLAttributes } from 'react'
import styled, { css } from 'styled-components'

interface CardContainerProps {
  $centered: boolean
}

const CardContainer = styled.section<CardContainerProps>`
  width: 100%;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
  box-shadow: ${({ theme }) => theme.shadows.card};
  animation: rise-in 240ms ease-out;

  ${({ $centered, theme }) =>
    $centered &&
    css`
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: ${theme.layout.centerCardMinHeight};
  `}
`

export interface CardProps extends HTMLAttributes<HTMLElement> {
  centered?: boolean
}

export function Card({ centered = false, ...props }: CardProps) {
  return <CardContainer $centered={centered} {...props} />
}
