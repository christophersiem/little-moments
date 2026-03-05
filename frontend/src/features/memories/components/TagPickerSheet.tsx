import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../../../components/Button'
import { BottomSheet } from '../../../components/BottomSheet'
import type { MemoryTag } from '../types'

interface TagPickerSheetProps {
  open: boolean
  availableTags: MemoryTag[]
  selectedTags: MemoryTag[]
  onDone: (tags: MemoryTag[]) => void
  onClose: () => void
}

const SearchInput = styled.input`
  margin: ${({ theme }) => `${theme.space.x3} ${theme.space.x4}`};
  margin-bottom: ${({ theme }) => theme.space.x3};
  width: calc(100% - ${({ theme }) => theme.space.x4} * 2);
  min-height: 40px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid rgba(var(--lm-shadow), 0.12);
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `0 ${theme.space.x3}`};
  outline: none;

  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.accentStrong};
    box-shadow: 0 0 0 2px rgba(var(--lm-shadow), 0.12);
  }
`

const List = styled.div`
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  padding-bottom: ${({ theme }) => theme.space.x2};
`

const Row = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 48px;
  border: none;
  border-bottom: 1px solid rgba(var(--lm-shadow), 0.05);
  background: transparent;
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  padding: ${({ theme }) => `0 ${theme.space.x4}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
`

const Check = styled.span`
  color: ${({ theme }) => theme.colors.accentStrong};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const Empty = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  padding: ${({ theme }) => `${theme.space.x2} 0`};
`

const Actions = styled.div`
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x4}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
`

const ClearButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.accentStrong};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0 ${({ theme }) => theme.space.x1};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

export function TagPickerSheet({
  open,
  availableTags,
  selectedTags,
  onDone,
  onClose,
}: TagPickerSheetProps) {
  const [draftTags, setDraftTags] = useState<MemoryTag[]>(selectedTags)
  const [search, setSearch] = useState('')
  const firstInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setDraftTags(selectedTags)
    setSearch('')
  }, [open, selectedTags])

  const filteredTags = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return availableTags
    }
    return availableTags.filter((tag) => tag.toLowerCase().includes(query))
  }, [availableTags, search])

  const toggleTag = (tag: MemoryTag) => {
    setDraftTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    )
  }

  const footer = (
    <Actions>
      <ClearButton
        type="button"
        disabled={draftTags.length === 0}
        onClick={() => {
          setDraftTags([])
        }}
      >
        Clear
      </ClearButton>
      <Button
        type="button"
        variant="primary"
        onClick={() => {
          onDone(draftTags)
          onClose()
        }}
      >
        Done
      </Button>
    </Actions>
  )

  return (
    <BottomSheet
      open={open}
      title="Tags"
      onClose={onClose}
      initialFocusRef={firstInputRef}
      footer={footer}
    >
      <SearchInput
        ref={firstInputRef}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search tags"
        aria-label="Search tags"
      />
      <List>
        {filteredTags.length === 0 ? (
          <Empty>No tags yet.</Empty>
        ) : (
          filteredTags.map((tag) => (
            <Row key={tag} type="button" $active={draftTags.includes(tag)} onClick={() => toggleTag(tag)}>
              <span>{tag}</span>
              {draftTags.includes(tag) ? <Check aria-hidden>✓</Check> : null}
            </Row>
          ))
        )}
      </List>
    </BottomSheet>
  )
}
