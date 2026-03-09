import styled from 'styled-components'
import { MemoriesFilterButton } from './MemoriesFilterButton'

interface MemoriesHeaderProps {
  hasActiveFilters: boolean
  activeFilterCount: number
  filterSummary: string
  onOpenFilters: () => void
}

const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 6;
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => `${theme.space.x1} 0 ${theme.space.x2}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
  border-bottom: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.border} 42%, transparent);
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
`

const Heading = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
`

const FilterSummary = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

export function MemoriesHeader({ hasActiveFilters, activeFilterCount, filterSummary, onOpenFilters }: MemoriesHeaderProps) {
  return (
    <StickyHeader>
      <HeadingRow>
        <Heading>Memories</Heading>
        <MemoriesFilterButton active={hasActiveFilters} activeCount={activeFilterCount} onClick={onOpenFilters} />
      </HeadingRow>
      <FilterSummary>{filterSummary}</FilterSummary>
    </StickyHeader>
  )
}
