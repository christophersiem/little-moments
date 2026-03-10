import styled from 'styled-components'
import { MemoryEditStateActions } from './MemoryEditStateActions'

interface MemoryTranscriptProps {
  canManageMemory: boolean
  editingTranscript: boolean
  transcript: string | null
  transcriptDraft: string
  saving: boolean
  onTranscriptDraftChange: (nextValue: string) => void
  onSaveTranscript: () => void
  onCancelTranscript: () => void
}

const Card = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const CardLabel = styled.div`
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 600;
`

const TranscriptText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-style: italic;
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
`

const TranscriptArea = styled.textarea`
  width: 100%;
  min-height: 132px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.space.x3};
  resize: vertical;
`

export function MemoryTranscript({
  canManageMemory,
  editingTranscript,
  transcript,
  transcriptDraft,
  saving,
  onTranscriptDraftChange,
  onSaveTranscript,
  onCancelTranscript,
}: MemoryTranscriptProps) {
  return (
    <Card>
      <CardHeader>
        <CardLabel>Transcript</CardLabel>
        {canManageMemory && editingTranscript && (
          <MemoryEditStateActions
            saveLabel="Save transcript"
            cancelLabel="Cancel transcript editing"
            saving={saving}
            onSave={onSaveTranscript}
            onCancel={onCancelTranscript}
          />
        )}
      </CardHeader>

      {canManageMemory && editingTranscript ? (
        <TranscriptArea value={transcriptDraft} onChange={(event) => onTranscriptDraftChange(event.target.value)} />
      ) : (
        <TranscriptText>{transcript || 'Transcription still processing.'}</TranscriptText>
      )}
    </Card>
  )
}
