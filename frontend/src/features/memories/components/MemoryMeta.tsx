import styled from 'styled-components'
import { MEMORY_TAG_OPTIONS, type MemoryTag } from '../types'
import { MemoryEditStateActions } from './MemoryEditStateActions'

interface MemoryMetaProps {
  tags: MemoryTag[]
  tagsDraft: MemoryTag[]
  editingTags: boolean
  canManageMemory: boolean
  saving: boolean
  onSaveTags: () => void
  onCancelTags: () => void
  onToggleDraftTag: (tag: MemoryTag) => void
}

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const TagChip = styled.button<{ $active?: boolean; $interactive?: boolean }>`
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.surfaceStrong)};
  color: ${({ theme, $active }) => ($active ? theme.colors.onAccent : theme.colors.textMuted)};
  min-height: ${({ theme, $interactive }) => ($interactive ? theme.layout.minTouchTarget : '32px')};
  padding: ${({ theme, $interactive }) => ($interactive ? `0 ${theme.space.x3}` : `0 ${theme.space.x2}`)};
  font-size: 0.75rem;
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
`

export function MemoryMeta({
  tags,
  tagsDraft,
  editingTags,
  canManageMemory,
  saving,
  onSaveTags,
  onCancelTags,
  onToggleDraftTag,
}: MemoryMetaProps) {
  return (
    <>
      <TagRow>
        {(editingTags ? tagsDraft : tags).map((tag) => (
          <TagChip key={tag}>{tag}</TagChip>
        ))}
      </TagRow>

      {canManageMemory && editingTags && (
        <MemoryEditStateActions
          saveLabel="Save tags"
          cancelLabel="Cancel tag editing"
          saving={saving}
          onSave={onSaveTags}
          onCancel={onCancelTags}
        />
      )}

      {canManageMemory && editingTags && (
        <TagRow>
          {MEMORY_TAG_OPTIONS.map((tag) => (
            <TagChip
              key={`option-${tag}`}
              type="button"
              $interactive
              $active={tagsDraft.includes(tag)}
              onClick={() => onToggleDraftTag(tag)}
            >
              {tag}
            </TagChip>
          ))}
        </TagRow>
      )}
    </>
  )
}
