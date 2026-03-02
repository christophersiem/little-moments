import styled from 'styled-components'

type StatusBannerTone = 'info' | 'error'

interface StatusBannerProps {
  title: string
  detail?: string
  tone?: StatusBannerTone
  actionLabel?: string
  onAction?: () => void
}

const Banner = styled.div<{ $tone: StatusBannerTone }>`
  border: 1px solid
    ${({ theme, $tone }) => ($tone === 'error' ? `color-mix(in srgb, ${theme.colors.danger} 40%, ${theme.colors.border})` : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x4}`};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x3};
`

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
`

const Title = styled.p<{ $tone: StatusBannerTone }>`
  margin: 0;
  color: ${({ theme, $tone }) => ($tone === 'error' ? theme.colors.danger : theme.colors.text)};
  font-size: ${({ theme }) => theme.typography.bodySize};
  line-height: ${({ theme }) => theme.typography.bodyLineHeight};
`

const Detail = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const ActionButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.accentStrong};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: ${({ theme }) => `0 ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  cursor: pointer;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

export function StatusBanner({
  title,
  detail,
  tone = 'info',
  actionLabel,
  onAction,
}: StatusBannerProps) {
  return (
    <Banner $tone={tone} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
      <Copy>
        <Title $tone={tone}>{title}</Title>
        {detail && <Detail>{detail}</Detail>}
      </Copy>
      {actionLabel && onAction && (
        <ActionButton type="button" onClick={onAction}>
          {actionLabel}
        </ActionButton>
      )}
    </Banner>
  )
}

