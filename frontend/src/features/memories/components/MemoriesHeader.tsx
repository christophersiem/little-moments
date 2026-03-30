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
  width: ${({ theme }) => theme.layout.minTouchTarget};
  min-width: ${({ theme }) => theme.layout.minTouchTarget};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, background-color 180ms ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const ChatIcon = styled.svg`
  width: 19px;
  height: 19px;
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
          <ChatButton type="button" aria-label="Open memory chat" title="Open memory chat" onClick={onOpenMemoryChat}>
            <ChatIcon viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M7 16.5L4 19V6.5C4 5.67 4.67 5 5.5 5H18.5C19.33 5 20 5.67 20 6.5V15.5C20 16.33 19.33 17 18.5 17H7Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M8 9H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8 12.5H13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </ChatIcon>
          </ChatButton>
          <MemoriesFilterButton active={hasActiveFilters} activeCount={activeFilterCount} onClick={onOpenFilters} />
        </HeaderActions>
      </HeadingRow>
      <FilterSummary>{filterSummary}</FilterSummary>
    </StickyHeader>
  )
}
