import styled from 'styled-components'

interface MemoriesFilterButtonProps {
  active: boolean
  activeCount: number
  onClick: () => void
}

const FilterButton = styled.button<{ $active: boolean }>`
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  min-width: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.textMuted)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  padding: 0 ${({ theme }) => theme.space.x2};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const FilterIcon = styled.svg`
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
`

const FilterBadge = styled.span`
  position: absolute;
  top: 7px;
  right: 7px;
  min-width: 14px;
  height: 14px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.accentStrong};
  color: ${({ theme }) => theme.colors.surfaceStrong};
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
  padding: 0 4px;
`

function FilterGlyph() {
  return (
    <FilterIcon viewBox="0 0 24 24" aria-hidden>
      <path d="M4 6h16l-6.2 6.8v5.4L10.2 20v-7.2L4 6Z" />
    </FilterIcon>
  )
}

export function MemoriesFilterButton({ active, activeCount, onClick }: MemoriesFilterButtonProps) {
  return (
    <FilterButton type="button" $active={active} onClick={onClick} aria-label="Open filters">
      <FilterGlyph />
      {activeCount > 0 ? <FilterBadge>{activeCount}</FilterBadge> : null}
    </FilterButton>
  )
}
