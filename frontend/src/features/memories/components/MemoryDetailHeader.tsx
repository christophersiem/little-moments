import type { ReactNode } from 'react'
import type { OverflowMenuAction } from '../../../components/OverflowMenu'
import styled from 'styled-components'
import { MemoryActions } from './MemoryActions'
import { MemoryEditStateActions } from './MemoryEditStateActions'

interface MemoryDetailHeaderProps {
  canManageMemory: boolean
  menuActions: OverflowMenuAction[]
  saving: boolean
  deleting: boolean
  title: string | null
  editingTitle: boolean
  titleDraft: string
  dateText: string
  lastSavedText: string
  onBack: () => void
  onTitleDraftChange: (nextValue: string) => void
  onSaveTitle: () => void
  onCancelTitle: () => void
  children?: ReactNode
}

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
`

const BackButton = styled.button`
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.text};
  padding: 0 ${({ theme }) => theme.space.x3};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const TitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
`

const Title = styled.h2`
  margin: 0;
  font-size: 1.95rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.25;
`

const TitleInput = styled.input`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.text};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0 ${({ theme }) => theme.space.x3};
`

const MetaText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

export function MemoryDetailHeader({
  canManageMemory,
  menuActions,
  saving,
  deleting,
  title,
  editingTitle,
  titleDraft,
  dateText,
  lastSavedText,
  onBack,
  onTitleDraftChange,
  onSaveTitle,
  onCancelTitle,
  children,
}: MemoryDetailHeaderProps) {
  return (
    <Header>
      <TopBar>
        <BackButton type="button" onClick={onBack} aria-label="Back to memories">
          ← Back
        </BackButton>
        <MemoryActions canManageMemory={canManageMemory} actions={menuActions} disabled={saving || deleting} />
      </TopBar>

      <TitleRow>
        {editingTitle ? (
          <TitleInput value={titleDraft} onChange={(event) => onTitleDraftChange(event.target.value)} />
        ) : (
          <Title>{title || 'Untitled Memory'}</Title>
        )}

        {canManageMemory && editingTitle && (
          <MemoryEditStateActions
            saveLabel="Save title"
            cancelLabel="Cancel title editing"
            saving={saving}
            onSave={onSaveTitle}
            onCancel={onCancelTitle}
          />
        )}
      </TitleRow>

      <MetaText>{dateText}</MetaText>
      {lastSavedText && <MetaText>Last saved {lastSavedText}</MetaText>}
      {children}
    </Header>
  )
}
