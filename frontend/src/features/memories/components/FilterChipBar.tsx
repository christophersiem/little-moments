import styled from 'styled-components'
import { FilterChip } from './FilterChip'

interface FilterChipBarProps {
  monthLabel: string
  tagsLabel: string
  highlightsActive: boolean
  hasActiveFilters: boolean
  onOpenMonth: () => void
  onOpenTags: () => void
  onToggleHighlights: () => void
  onClear: () => void
}

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
  overflow-x: auto;
  padding-bottom: ${({ theme }) => theme.space.x1};
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

export function FilterChipBar({
  monthLabel,
  tagsLabel,
  highlightsActive,
  hasActiveFilters,
  onOpenMonth,
  onOpenTags,
  onToggleHighlights,
  onClear,
}: FilterChipBarProps) {
  return (
    <Bar aria-label="Memories filters">
      <FilterChip
        label={monthLabel}
        active={monthLabel !== 'All months'}
        onClick={onOpenMonth}
        ariaLabel="Filter by month"
      />
      <FilterChip
        label={tagsLabel}
        active={tagsLabel !== 'All tags'}
        onClick={onOpenTags}
        ariaLabel="Filter by tags"
      />
      <FilterChip
        label="Highlights"
        active={highlightsActive}
        onClick={onToggleHighlights}
        ariaLabel={highlightsActive ? 'Disable Highlights filter' : 'Enable Highlights filter'}
      />
      {hasActiveFilters ? (
        <FilterChip label="Clear" onClick={onClear} ariaLabel="Clear all filters" />
      ) : null}
    </Bar>
  )
}
