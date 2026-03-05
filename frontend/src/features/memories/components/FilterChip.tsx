import styled from 'styled-components'

interface FilterChipProps {
  label: string
  active?: boolean
  onClick: () => void
  ariaLabel?: string
}

const Chip = styled.button<{ $active: boolean }>`
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  border-radius: ${({ theme }) => theme.radii.pill};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: ${({ theme }) => `0 ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

export function FilterChip({ label, active = false, onClick, ariaLabel }: FilterChipProps) {
  return (
    <Chip type="button" $active={active} onClick={onClick} aria-label={ariaLabel}>
      {label}
    </Chip>
  )
}
