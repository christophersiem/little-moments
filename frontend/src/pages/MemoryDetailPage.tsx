import styled from 'styled-components'
import { APP_ROUTES } from '../app/routes'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MemoryDetailDateSheet } from '../features/memories/components/MemoryDetailDateSheet'
import { MemoryDetailError } from '../features/memories/components/MemoryDetailError'
import { MemoryDetailHeader } from '../features/memories/components/MemoryDetailHeader'
import { MemoryDetailSkeleton } from '../features/memories/components/MemoryDetailSkeleton'
import { MemoryMeta } from '../features/memories/components/MemoryMeta'
import { MemorySummary } from '../features/memories/components/MemorySummary'
import { MemoryTranscript } from '../features/memories/components/MemoryTranscript'
import { useMemoryDetail } from '../features/memories/hooks/useMemoryDetail'
import { useMemoryDetailEditor } from '../features/memories/hooks/useMemoryDetailEditor'
import { formatMemoryDate } from '../features/memories/lib/formatMemoryDate'

interface MemoryDetailPageProps {
  memoryId: string
  navigate: (nextPath: string) => void
  canManageMemory?: boolean
}

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x4};
`

const MetaText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
`

const SuccessText = styled.p`
  color: ${({ theme }) => theme.colors.accentStrong};
`

export function MemoryDetailPage({ memoryId, navigate, canManageMemory = false }: MemoryDetailPageProps) {
  const { loading, error, memory, reload } = useMemoryDetail(memoryId)
  const editor = useMemoryDetailEditor({ memory, canManageMemory, navigate })

  if (loading) {
    return (
      <Section>
        <MemoryDetailSkeleton />
      </Section>
    )
  }

  if (error || !editor.currentMemory) {
    return (
      <Section>
        <MemoryDetailError
          error={error}
          onRetry={reload}
          onBackToMemories={() => navigate(APP_ROUTES.memories)}
        />
      </Section>
    )
  }

  const displayedMemory = editor.currentMemory

  return (
    <Section>
      <MemoryDetailHeader
        canManageMemory={canManageMemory}
        menuActions={editor.menuActions}
        saving={editor.saving}
        deleting={editor.deleting}
        title={displayedMemory.title}
        editingTitle={editor.editingTitle}
        titleDraft={editor.titleDraft}
        dateText={formatMemoryDate(displayedMemory.recordedAt || displayedMemory.createdAt)}
        lastSavedText={editor.lastSavedAt ? formatMemoryDate(editor.lastSavedAt) : ''}
        onBack={() => navigate(APP_ROUTES.memories)}
        onTitleDraftChange={editor.setTitleDraft}
        onSaveTitle={() => void editor.onSaveTitle()}
        onCancelTitle={editor.onCancelTitleEditing}
      >
        <MemoryMeta
          tags={displayedMemory.tags}
          tagsDraft={editor.tagsDraft}
          editingTags={editor.editingTags}
          canManageMemory={canManageMemory}
          saving={editor.saving}
          onSaveTags={() => void editor.onSaveTags()}
          onCancelTags={editor.onCancelTagsEditing}
          onToggleDraftTag={editor.toggleDraftTag}
        />
      </MemoryDetailHeader>

      <MemorySummary summary={displayedMemory.summary} />

      <MemoryTranscript
        canManageMemory={canManageMemory}
        editingTranscript={editor.editingTranscript}
        transcript={displayedMemory.transcript}
        transcriptDraft={editor.transcriptDraft}
        saving={editor.saving}
        onTranscriptDraftChange={editor.setTranscriptDraft}
        onSaveTranscript={() => void editor.onSaveTranscript()}
        onCancelTranscript={editor.onCancelTranscriptEditing}
      />

      {!canManageMemory && <MetaText>Only owners can edit or delete memories.</MetaText>}
      {editor.saveError && <ErrorText>{editor.saveError}</ErrorText>}
      {editor.saveNotice && <SuccessText>{editor.saveNotice}</SuccessText>}

      {editor.deleteError && <ErrorText>{editor.deleteError}</ErrorText>}
      <ConfirmDialog
        open={canManageMemory && editor.deleteDialogOpen}
        title="Delete memory?"
        body="This can’t be undone."
        cancelLabel="Cancel"
        confirmLabel={editor.deleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
        busy={editor.deleting}
        onCancel={editor.onDeleteDialogCancel}
        onConfirm={() => void editor.onConfirmDelete()}
      />

      <MemoryDetailDateSheet
        open={canManageMemory && editor.editingDate}
        saving={editor.saving}
        dateInputRef={editor.dateInputRef}
        dateValue={editor.dateDraftDate}
        timeValue={editor.dateDraftTime}
        onDateChange={editor.setDateDraftDate}
        onTimeChange={editor.setDateDraftTime}
        onClose={editor.onCloseDateEditor}
        onCancel={editor.onCloseDateEditor}
        onSave={() => void editor.onSaveDate()}
      />
    </Section>
  )
}
