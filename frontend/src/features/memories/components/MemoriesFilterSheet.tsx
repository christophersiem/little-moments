import styled from 'styled-components'
import { BottomSheet } from '../../../components/BottomSheet'
import { Button } from '../../../components/Button'
import type { MonthOption } from '../lib/groupMemoriesByMonth'
import { MEMORY_TAG_OPTIONS, type MemoryTag } from '../types'

interface MemoriesFilterSheetProps {
  filterSheetOpen: boolean
  monthPickerOpen: boolean
  monthOptions: MonthOption[]
  draftMonth: string
  draftMonthLabel: string
  draftTags: MemoryTag[]
  draftHighlightsOnly: boolean
  onCloseFilters: () => void
  onClearFilters: () => void
  onApplyFilters: () => void
  onOpenMonthPicker: () => void
  onCloseMonthPicker: () => void
  onSelectDraftMonth: (month: string) => void
  onToggleDraftTag: (tag: MemoryTag) => void
  onToggleDraftHighlightsOnly: () => void
}

const SheetSection = styled.section`
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x4}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const SheetHeading = styled.h3`
  margin: 0;
  font-size: calc(${({ theme }) => theme.typography.secondarySize} - 1px);
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 600;
`

const SheetRow = styled.button<{ $selected?: boolean }>`
  width: 100%;
  min-height: 46px;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.accentStrong : `color-mix(in srgb, ${theme.colors.border} 60%, transparent)`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $selected }) => ($selected ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $selected }) => ($selected ? theme.colors.accentStrong : theme.colors.text)};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `0 ${theme.space.x3}`};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.bodySize};
`

const SheetTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.x2};
`

const SheetTag = styled.button<{ $selected: boolean }>`
  min-height: 32px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.accentStrong : `color-mix(in srgb, ${theme.colors.border} 70%, transparent)`};
  background: ${({ theme, $selected }) => ($selected ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $selected }) => ($selected ? theme.colors.accentStrong : theme.colors.textMuted)};
  padding: 0 ${({ theme }) => theme.space.x2};
  font-size: calc(${({ theme }) => theme.typography.secondarySize} - 1px);
  cursor: pointer;
`

const SheetFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
  padding: ${({ theme }) => theme.space.x3};
`

const SheetSelectorRow = styled.button`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.border} 62%, transparent);
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `0 ${theme.space.x3}`};
  cursor: pointer;
`

const SelectorLabel = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.bodySize};
`

const SelectorValue = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x1};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
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

function CheckGlyph() {
  return (
    <FilterIcon viewBox="0 0 24 24" aria-hidden>
      <path d="M6 12.5l4 4 8-9" />
    </FilterIcon>
  )
}

function ChevronGlyph() {
  return (
    <FilterIcon viewBox="0 0 24 24" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </FilterIcon>
  )
}

export function MemoriesFilterSheet({
  filterSheetOpen,
  monthPickerOpen,
  monthOptions,
  draftMonth,
  draftMonthLabel,
  draftTags,
  draftHighlightsOnly,
  onCloseFilters,
  onClearFilters,
  onApplyFilters,
  onOpenMonthPicker,
  onCloseMonthPicker,
  onSelectDraftMonth,
  onToggleDraftTag,
  onToggleDraftHighlightsOnly,
}: MemoriesFilterSheetProps) {
  return (
    <>
      <BottomSheet
        open={filterSheetOpen}
        title="Filters"
        onClose={onCloseFilters}
        footer={
          <SheetFooter>
            <Button type="button" onClick={onClearFilters}>
              Clear
            </Button>
            <Button variant="primary" type="button" onClick={onApplyFilters}>
              Apply
            </Button>
          </SheetFooter>
        }
      >
        <SheetSection>
          <SheetHeading>Month</SheetHeading>
          <SheetSelectorRow type="button" onClick={onOpenMonthPicker} aria-label="Open month picker">
            <SelectorLabel>Selected month</SelectorLabel>
            <SelectorValue>
              {draftMonthLabel}
              <ChevronGlyph />
            </SelectorValue>
          </SheetSelectorRow>
        </SheetSection>

        <SheetSection>
          <SheetHeading>Tags</SheetHeading>
          <SheetTags>
            {MEMORY_TAG_OPTIONS.map((tag) => (
              <SheetTag
                key={tag}
                type="button"
                $selected={draftTags.includes(tag)}
                onClick={() => onToggleDraftTag(tag)}
                aria-pressed={draftTags.includes(tag)}
              >
                {tag}
              </SheetTag>
            ))}
          </SheetTags>
        </SheetSection>

        <SheetSection>
          <SheetHeading>Highlights</SheetHeading>
          <SheetRow
            type="button"
            $selected={draftHighlightsOnly}
            onClick={onToggleDraftHighlightsOnly}
            aria-pressed={draftHighlightsOnly}
          >
            Show highlights only
            {draftHighlightsOnly ? <CheckGlyph /> : null}
          </SheetRow>
        </SheetSection>
      </BottomSheet>

      <BottomSheet open={monthPickerOpen} title="Month" onClose={onCloseMonthPicker}>
        <SheetSection>
          <SheetRow
            type="button"
            $selected={draftMonth === 'all'}
            onClick={() => onSelectDraftMonth('all')}
            aria-pressed={draftMonth === 'all'}
          >
            All months
            {draftMonth === 'all' ? <CheckGlyph /> : null}
          </SheetRow>
          {monthOptions.map((option) => (
            <SheetRow
              key={option.key}
              type="button"
              $selected={draftMonth === option.key}
              onClick={() => onSelectDraftMonth(option.key)}
              aria-pressed={draftMonth === option.key}
            >
              {option.label}
              {draftMonth === option.key ? <CheckGlyph /> : null}
            </SheetRow>
          ))}
        </SheetSection>
      </BottomSheet>
    </>
  )
}
