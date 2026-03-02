import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { deleteMemory, updateMemory } from '../features/memories/api'
import { MEMORY_TAG_OPTIONS, type Memory, type MemoryTag } from '../features/memories/types'
import { useMemoryDetail } from '../features/memories/hooks'
import { formatDateTime } from '../lib/utils'

interface MemoryDetailPageProps {
  memoryId: string
  navigate: (nextPath: string) => void
}

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x4};
`

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
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

const EditIconButton = styled.button`
  width: ${({ theme }) => theme.layout.minTouchTarget};
  height: ${({ theme }) => theme.layout.minTouchTarget};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.textMuted};
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const EditIcon = styled.svg`
  width: 18px;
  height: 18px;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.x2};
`

const EditStateActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const EditStateIconButton = styled.button<{ $kind: 'save' | 'cancel' }>`
  width: ${({ theme }) => theme.layout.minTouchTarget};
  height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid
    ${({ theme, $kind }) => ($kind === 'save' ? theme.colors.accentStrong : theme.colors.border)};
  background: ${({ theme, $kind }) => ($kind === 'save' ? theme.colors.accent : theme.colors.surfaceStrong)};
  color: ${({ theme, $kind }) => ($kind === 'save' ? theme.colors.onAccent : theme.colors.textMuted)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`

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

const CardHint = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const CardText = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
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

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
`

const SuccessText = styled.p`
  color: ${({ theme }) => theme.colors.accentStrong};
`

const DangerRow = styled.div`
  margin-top: ${({ theme }) => theme.space.x2};
`

const DeleteButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.danger};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.danger};
  border-radius: ${({ theme }) => theme.radii.pill};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0 ${({ theme }) => theme.space.x3};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.danger};
    outline-offset: 2px;
  }
`

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: ${({ theme }) =>
    `${theme.space.x3} ${theme.space.x3} calc(${theme.layout.bottomNavHeight} + ${theme.space.x3} + env(safe-area-inset-bottom, 0px))`};
  z-index: 20;
`

const ModalSheet = styled.section`
  width: min(${({ theme }) => theme.layout.maxWidth}, 100%);
  background: ${({ theme }) => theme.colors.surfaceStrong};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => `${theme.radii.xl} ${theme.radii.xl} ${theme.radii.md} ${theme.radii.md}`};
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
  box-shadow: ${({ theme }) => theme.shadows.sheet};
  animation: rise-in 220ms ease-out;
`

const SheetHandle = styled.div`
  align-self: center;
  width: 40px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.border};
`

const SheetActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

function PencilIcon() {
  return (
    <EditIcon viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15.2 4.8L19.2 8.8M6 18L4.8 19.2L6 18ZM6 18L7.1 14.3C7.2 13.95 7.39 13.63 7.65 13.36L15.2 5.8C15.97 5.02 17.23 5.02 18 5.8L18.2 6C18.98 6.77 18.98 8.03 18.2 8.8L10.65 16.36C10.38 16.63 10.06 16.82 9.71 16.93L6 18Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </EditIcon>
  )
}

function SaveIcon() {
  return (
    <EditIcon viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 12.5L10 17L18.5 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </EditIcon>
  )
}

function CancelIcon() {
  return (
    <EditIcon viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 7L17 17M17 7L7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </EditIcon>
  )
}

export function MemoryDetailPage({ memoryId, navigate }: MemoryDetailPageProps) {
  const { loading, error, memory, reload } = useMemoryDetail(memoryId)

  const [currentMemory, setCurrentMemory] = useState<Memory | null>(null)
  const [saveError, setSaveError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  const [editingTranscript, setEditingTranscript] = useState(false)
  const [transcriptDraft, setTranscriptDraft] = useState('')

  const [editingTags, setEditingTags] = useState(false)
  const [tagsDraft, setTagsDraft] = useState<MemoryTag[]>([])

  useEffect(() => {
    if (!memory) {
      return
    }
    setCurrentMemory(memory)
    setTitleDraft(memory.title || '')
    setTranscriptDraft(memory.transcript || '')
    setTagsDraft(memory.tags)
    setSaveError('')
  }, [memory])

  useEffect(() => {
    if (!saveNotice) {
      return
    }
    const timer = window.setTimeout(() => setSaveNotice(''), 1800)
    return () => window.clearTimeout(timer)
  }, [saveNotice])

  useEffect(() => {
    if (!deleteDialogOpen || deleting) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDeleteError('')
        setDeleteDialogOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteDialogOpen, deleting])

  const persist = async (changes: { title?: string; transcript?: string; tags?: MemoryTag[] }) => {
    if (!currentMemory) {
      return false
    }
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateMemory(currentMemory.id, changes)
      setCurrentMemory(updated)
      setTitleDraft(updated.title || '')
      setTranscriptDraft(updated.transcript || '')
      setTagsDraft(updated.tags)
      setLastSavedAt(new Date().toISOString())
      setSaveNotice('Saved')
      return true
    } catch (saveFailure) {
      const message = saveFailure instanceof Error ? saveFailure.message : 'Could not save changes.'
      setSaveError(message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const onSaveTitle = async () => {
    const successful = await persist({ title: titleDraft })
    if (successful) {
      setEditingTitle(false)
    }
  }

  const onSaveTranscript = async () => {
    const successful = await persist({ transcript: transcriptDraft })
    if (successful) {
      setEditingTranscript(false)
    }
  }

  const onSaveTags = async () => {
    const successful = await persist({ tags: tagsDraft })
    if (successful) {
      setEditingTags(false)
    }
  }

  const toggleDraftTag = (tag: MemoryTag) => {
    setTagsDraft((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    )
  }

  const onConfirmDelete = async () => {
    if (!currentMemory) {
      return
    }
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteMemory(currentMemory.id)
      navigate('/memories')
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Could not delete this memory.'
      setDeleteError(message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <Section>
        <Title>Memory</Title>
        <MetaText>Loading memory...</MetaText>
      </Section>
    )
  }

  if (error || !currentMemory) {
    return (
      <Section>
        <Title>Memory</Title>
        <ErrorText>{error || 'Could not load memory.'}</ErrorText>
        <ActionRow>
          <Button variant="primary" onClick={reload}>
            Try again
          </Button>
          <Button onClick={() => navigate('/memories')}>Back to memories</Button>
        </ActionRow>
      </Section>
    )
  }

  return (
    <Section>
      <Header>
        <TitleRow>
          {editingTitle ? (
            <TitleInput value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
          ) : (
            <Title>{currentMemory.title || 'Untitled Memory'}</Title>
          )}

          {editingTitle ? (
            <EditStateActions>
              <EditStateIconButton $kind="save" type="button" aria-label="Save title" disabled={saving} onClick={() => void onSaveTitle()}>
                <SaveIcon />
              </EditStateIconButton>
              <EditStateIconButton
                $kind="cancel"
                type="button"
                aria-label="Cancel title editing"
                disabled={saving}
                onClick={() => {
                  setTitleDraft(currentMemory.title || '')
                  setEditingTitle(false)
                }}
              >
                <CancelIcon />
              </EditStateIconButton>
            </EditStateActions>
          ) : (
            <EditIconButton type="button" aria-label="Edit title" onClick={() => setEditingTitle(true)}>
              <PencilIcon />
            </EditIconButton>
          )}
        </TitleRow>

        <MetaText>{formatDateTime(currentMemory.recordedAt || currentMemory.createdAt)}</MetaText>
        {lastSavedAt && <MetaText>Last saved {formatDateTime(lastSavedAt)}</MetaText>}

        <TagRow>
          {(editingTags ? tagsDraft : currentMemory.tags).map((tag) => (
            <TagChip key={tag}>{tag}</TagChip>
          ))}
          {!editingTags && (
            <EditIconButton type="button" aria-label="Edit tags" onClick={() => setEditingTags(true)}>
              <PencilIcon />
            </EditIconButton>
          )}
        </TagRow>

        {editingTags && (
          <EditStateActions>
            <EditStateIconButton $kind="save" type="button" aria-label="Save tags" disabled={saving} onClick={() => void onSaveTags()}>
              <SaveIcon />
            </EditStateIconButton>
            <EditStateIconButton
              $kind="cancel"
              type="button"
              aria-label="Cancel tag editing"
              disabled={saving}
              onClick={() => {
                setTagsDraft(currentMemory.tags)
                setEditingTags(false)
              }}
            >
              <CancelIcon />
            </EditStateIconButton>
          </EditStateActions>
        )}

        {editingTags && (
          <TagRow>
            {MEMORY_TAG_OPTIONS.map((tag) => (
              <TagChip
                key={`option-${tag}`}
                type="button"
                $interactive
                $active={tagsDraft.includes(tag)}
                onClick={() => toggleDraftTag(tag)}
              >
                {tag}
              </TagChip>
            ))}
          </TagRow>
        )}
      </Header>

      <Card>
        <CardHeader>
          <CardLabel>Summary</CardLabel>
        </CardHeader>
        <CardHint>Auto-generated from the transcript.</CardHint>
        <CardText>{currentMemory.summary || 'Summary will appear after transcription.'}</CardText>
      </Card>

      <Card>
        <CardHeader>
          <CardLabel>Transcript</CardLabel>
          {editingTranscript ? (
            <EditStateActions>
              <EditStateIconButton
                $kind="save"
                type="button"
                aria-label="Save transcript"
                disabled={saving}
                onClick={() => void onSaveTranscript()}
              >
                <SaveIcon />
              </EditStateIconButton>
              <EditStateIconButton
                $kind="cancel"
                type="button"
                aria-label="Cancel transcript editing"
                disabled={saving}
                onClick={() => {
                  setTranscriptDraft(currentMemory.transcript || '')
                  setEditingTranscript(false)
                }}
              >
                <CancelIcon />
              </EditStateIconButton>
            </EditStateActions>
          ) : (
            <EditIconButton type="button" aria-label="Edit transcript" onClick={() => setEditingTranscript(true)}>
              <PencilIcon />
            </EditIconButton>
          )}
        </CardHeader>

        {editingTranscript ? (
          <TranscriptArea value={transcriptDraft} onChange={(event) => setTranscriptDraft(event.target.value)} />
        ) : (
          <TranscriptText>{currentMemory.transcript || 'Transcription still processing.'}</TranscriptText>
        )}
      </Card>

      {saveError && <ErrorText>{saveError}</ErrorText>}
      {saveNotice && <SuccessText>{saveNotice}</SuccessText>}
      <DangerRow>
        <DeleteButton
          type="button"
          onClick={() => {
            setDeleteError('')
            setDeleteDialogOpen(true)
          }}
        >
          Delete memory
        </DeleteButton>
      </DangerRow>

      <Button variant="primary" fullWidth onClick={() => navigate('/record')}>
        Record another moment
      </Button>

      {deleteDialogOpen && (
        <ModalOverlay role="presentation">
          <ModalSheet role="dialog" aria-modal="true" aria-label="Delete memory">
            <SheetHandle aria-hidden />
            <h2>Delete this memory?</h2>
            <CardHint>This will permanently remove the title, transcript, summary, and tags.</CardHint>
            {deleteError && <ErrorText>{deleteError}</ErrorText>}
            <SheetActions>
              <Button variant="danger" fullWidth autoFocus disabled={deleting} onClick={() => void onConfirmDelete()}>
                {deleting ? 'Deleting...' : 'Yes, delete memory'}
              </Button>
              <Button
                fullWidth
                disabled={deleting}
                onClick={() => {
                  setDeleteError('')
                  setDeleteDialogOpen(false)
                }}
              >
                Cancel
              </Button>
            </SheetActions>
          </ModalSheet>
        </ModalOverlay>
      )}
    </Section>
  )
}
