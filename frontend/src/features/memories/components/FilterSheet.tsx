import { useEffect, useMemo, useRef, useState } from 'react'
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
  anchorTop: number
  anchorRight: number
  onApply: (month: string, tags: MemoryTag[]) => void
  onClose: () => void
}

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 20;
`

const Scrim = styled.button`
  position: absolute;
  inset: 0;
  border: none;
  margin: 0;
  padding: 0;
  background: transparent;
  cursor: default;
`

const Popover = styled.aside<{ $top: number; $right: number }>`
  position: absolute;
  top: ${({ $top }) => `${$top}px`};
  right: ${({ $right }) => `${$right}px`};
  z-index: 21;
  width: min(320px, 92vw);
  max-height: 60vh;
  background: ${({ theme }) => theme.colors.surfaceStrong};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.sheet};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const Header = styled.header`
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x3} ${theme.space.x2}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const Title = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.h2Size};
  color: ${({ theme }) => theme.colors.text};
`

const CloseButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  border-radius: 999px;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  min-width: ${({ theme }) => theme.layout.minTouchTarget};
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
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x3} ${theme.space.x2}`};
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

const TagsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
`

const AddTagButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.accentStrong};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.secondarySize};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const SelectedTagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.x2};
`

const SelectedTagPill = styled.button`
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.onAccent};
  min-height: 30px;
  padding: ${({ theme }) => `0 ${theme.space.x2}`};
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x1};
  cursor: pointer;
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

const MonthRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: ${({ theme }) => `0 ${theme.space.x3}`};
`

const MonthValue = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const MonthSelect = styled.select`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  text-align: right;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  padding-right: ${({ theme }) => theme.space.x4};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const ClearFiltersButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.accentStrong};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.secondarySize};

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

const ActionBar = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3} ${theme.space.x3}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
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

export function FilterSheet({
  open,
  monthOptions,
  selectedMonth,
  selectedTags,
  anchorTop,
  anchorRight,
  onApply,
  onClose,
}: FilterSheetProps) {
  const [draftMonth, setDraftMonth] = useState(selectedMonth)
  const [draftTags, setDraftTags] = useState<MemoryTag[]>(selectedTags)
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const dialogRef = useRef<HTMLElement | null>(null)
  const firstControlRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setDraftMonth(selectedMonth)
    setDraftTags(selectedTags)
    setTagsExpanded(selectedTags.length > 0)

    const focusTimer = window.setTimeout(() => {
      firstControlRef.current?.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const dialogNode = dialogRef.current
      if (!dialogNode) {
        return
      }

      const focusable = Array.from(
        dialogNode.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
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

  const hasDraftFilters = draftMonth !== 'all' || draftTags.length > 0

  const toggleTag = (tag: MemoryTag) => {
    setDraftTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    )
  }

  const removeTag = (tag: MemoryTag) => {
    setDraftTags((current) => current.filter((value) => value !== tag))
  }

  return (
    <Overlay role="presentation">
      <Scrim type="button" onClick={onClose} aria-label="Close filters panel" />
      <Popover
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        $top={Math.max(anchorTop, 0)}
        $right={Math.max(anchorRight, 0)}
      >
        <Header>
          <Title>Filters</Title>
          <CloseButton type="button" onClick={onClose} aria-label="Close filters">
            ✕
          </CloseButton>
        </Header>

        <Content>
          <SrStatus aria-live="polite">{activeCountLabel}</SrStatus>

          <Section>
            <TagsHeader>
              <Label>Tags ({draftTags.length})</Label>
              <AddTagButton
                ref={firstControlRef}
                type="button"
                onClick={() => setTagsExpanded((value) => !value)}
              >
                {tagsExpanded ? 'Done' : 'Add tag'}
              </AddTagButton>
            </TagsHeader>

            {draftTags.length > 0 ? (
              <SelectedTagList>
                {draftTags.map((tag) => (
                  <SelectedTagPill key={tag} type="button" onClick={() => removeTag(tag)}>
                    <span>{tag}</span>
                    <span aria-hidden>×</span>
                  </SelectedTagPill>
                ))}
              </SelectedTagList>
            ) : null}

            {tagsExpanded ? (
              <TagGrid>
                {MEMORY_TAG_OPTIONS.map((tag) => (
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
            ) : null}
          </Section>

          <Section>
            <MonthRow>
              <MonthValue>Month</MonthValue>
              <MonthSelect
                aria-label="Month filter"
                value={draftMonth}
                onChange={(event) => setDraftMonth(event.target.value)}
              >
                <option value="all">All months</option>
                {monthOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </MonthSelect>
            </MonthRow>
          </Section>
        </Content>

        <ActionBar>
          <ClearFiltersButton
            type="button"
            onClick={() => {
              setDraftMonth('all')
              setDraftTags([])
            }}
            disabled={!hasDraftFilters}
          >
            Clear filters
          </ClearFiltersButton>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onApply(draftMonth, draftTags)
              onClose()
            }}
          >
            Apply
          </Button>
        </ActionBar>
      </Popover>
    </Overlay>
  )
}
