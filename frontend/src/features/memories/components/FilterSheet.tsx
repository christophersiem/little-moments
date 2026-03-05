import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../../../components/Button'
import { MEMORY_TAG_OPTIONS, type MemoryTag } from '../types'
import { buildFilterCountLabel } from '../filterSummary'

interface MonthOption {
  key: string
  label: string
}

interface FilterSheetProps {
  open: boolean
  monthOptions: MonthOption[]
  selectedMonth: string
  selectedTags: MemoryTag[]
  onApply: (month: string, tags: MemoryTag[]) => void
  onClose: () => void
}

const Scrim = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  z-index: 20;
`

const Sheet = styled.aside`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 21;
  max-height: min(70vh, 640px);
  background: ${({ theme }) => theme.colors.surfaceStrong};
  border-top-left-radius: ${({ theme }) => theme.radii.xl};
  border-top-right-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: none;
  box-shadow: ${({ theme }) => theme.shadows.sheet};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Header = styled.div`
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
`

const Handle = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space.x2};
  left: 50%;
  transform: translateX(-50%);
  width: 38px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.border};
`

const Title = styled.h3`
  margin: ${({ theme }) => `${theme.space.x3} 0 0`};
  font-size: ${({ theme }) => theme.typography.h2Size};
  color: ${({ theme }) => theme.colors.text};
`

const IconButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  border-radius: 999px;
  min-width: ${({ theme }) => theme.layout.minTouchTarget};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const Content = styled.div`
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.space.x1} ${theme.space.x3} ${theme.space.x3}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const Label = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
`

const MonthScroller = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.x2};
  overflow-x: auto;
  padding-bottom: ${({ theme }) => theme.space.x1};
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

const MonthPill = styled.button<{ $active: boolean }>`
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? theme.colors.onAccent : theme.colors.text)};
  min-height: 34px;
  padding: ${({ theme }) => `0 ${theme.space.x2}`};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  white-space: nowrap;
  cursor: pointer;
`

const AccordionButton = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  padding: ${({ theme }) => `${theme.space.x1} 0`};
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.bodySize};
`

const TagGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.x2};
`

const TagPill = styled.button<{ $active: boolean }>`
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? theme.colors.onAccent : theme.colors.textMuted)};
  min-height: 32px;
  padding: ${({ theme }) => `0 ${theme.space.x2}`};
  font-size: 0.8rem;
  cursor: pointer;
`

const ExpandButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.accentStrong};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  padding: 0;
  text-align: left;
  cursor: pointer;
  margin-top: ${({ theme }) => theme.space.x2};
`

const ActionBar = styled.div`
  position: sticky;
  bottom: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3} calc(${theme.space.x2} + env(safe-area-inset-bottom, 0px))`};
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space.x2};
`

const SrStatus = styled.p`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const VISIBLE_TAG_COUNT = 6

export function FilterSheet({
  open,
  monthOptions,
  selectedMonth,
  selectedTags,
  onApply,
  onClose,
}: FilterSheetProps) {
  const [draftMonth, setDraftMonth] = useState(selectedMonth)
  const [draftTags, setDraftTags] = useState<MemoryTag[]>(selectedTags)
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [showAllTags, setShowAllTags] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setDraftMonth(selectedMonth)
    setDraftTags(selectedTags)
    setTagsExpanded(false)
    setShowAllTags(false)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, open, selectedMonth, selectedTags])

  const activeCountLabel = useMemo(
    () => buildFilterCountLabel(draftMonth, draftTags),
    [draftMonth, draftTags],
  )

  if (!open) {
    return null
  }

  const toggleTag = (tag: MemoryTag) => {
    setDraftTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    )
  }

  const visibleTags = showAllTags ? MEMORY_TAG_OPTIONS : MEMORY_TAG_OPTIONS.slice(0, VISIBLE_TAG_COUNT)
  const hasMoreTags = MEMORY_TAG_OPTIONS.length > VISIBLE_TAG_COUNT
  const hasDraftFilters = draftMonth !== 'all' || draftTags.length > 0

  return (
    <>
      <Scrim onClick={onClose} aria-hidden />
      <Sheet role="dialog" aria-modal="true" aria-label="Filters">
        <Handle aria-hidden />
        <Header>
          <Title>Filters</Title>
          <IconButton type="button" onClick={onClose} aria-label="Close filters" autoFocus>
            ✕
          </IconButton>
        </Header>

        <Content>
          <SrStatus aria-live="polite">{activeCountLabel}</SrStatus>

          <Section>
            <Label>Month</Label>
            <MonthScroller>
              <MonthPill
                type="button"
                $active={draftMonth === 'all'}
                onClick={() => setDraftMonth('all')}
              >
                All months
              </MonthPill>
              {monthOptions.map((option) => (
                <MonthPill
                  key={option.key}
                  type="button"
                  $active={draftMonth === option.key}
                  onClick={() => setDraftMonth(option.key)}
                >
                  {option.label}
                </MonthPill>
              ))}
            </MonthScroller>
          </Section>

          <Section>
            <AccordionButton
              type="button"
              aria-expanded={tagsExpanded}
              aria-controls="filter-tags-section"
              onClick={() => setTagsExpanded((value) => !value)}
            >
              <span>Tags ({draftTags.length})</span>
              <span aria-hidden>{tagsExpanded ? '−' : '+'}</span>
            </AccordionButton>

            {tagsExpanded && (
              <div id="filter-tags-section">
                <TagGrid>
                  {visibleTags.map((tag) => (
                    <TagPill
                      key={tag}
                      type="button"
                      $active={draftTags.includes(tag)}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </TagPill>
                  ))}
                </TagGrid>
                {hasMoreTags && (
                  <ExpandButton type="button" onClick={() => setShowAllTags((value) => !value)}>
                    {showAllTags ? 'Show less' : 'Show more'}
                  </ExpandButton>
                )}
              </div>
            )}
          </Section>
        </Content>

        <ActionBar>
          <Button
            type="button"
            onClick={() => {
              setDraftMonth('all')
              setDraftTags([])
            }}
            disabled={!hasDraftFilters}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onApply(draftMonth, draftTags)
              onClose()
            }}
          >
            Done
          </Button>
        </ActionBar>
      </Sheet>
    </>
  )
}
