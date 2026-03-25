import styled from 'styled-components'
import { MemoriesFilterButton } from './MemoriesFilterButton'

interface MemoriesHeaderProps {
  hasActiveFilters: boolean
  activeFilterCount: number
  filterSummary: string
  onOpenFilters: () => void
  onOpenMemoryChat: () => void
}

const StickyHeader = styled.div`
  position: sticky;
  top: env(safe-area-inset-top, 0px);
  z-index: 20;
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

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
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

const ChatButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.textMuted};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0 ${({ theme }) => theme.space.x3};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

export function MemoriesHeader({
  hasActiveFilters,
  activeFilterCount,
  filterSummary,
  onOpenFilters,
  onOpenMemoryChat,
}: MemoriesHeaderProps) {
  return (
    <StickyHeader>
      <HeadingRow>
        <Heading>Memories</Heading>
        <HeaderActions>
          <ChatButton type="button" onClick={onOpenMemoryChat}>
            Ask your memories
          </ChatButton>
          <MemoriesFilterButton active={hasActiveFilters} activeCount={activeFilterCount} onClick={onOpenFilters} />
        </HeaderActions>
      </HeadingRow>
      <FilterSummary>{filterSummary}</FilterSummary>
    </StickyHeader>
  )
}
