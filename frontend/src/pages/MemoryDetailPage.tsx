import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { OverflowMenu, type OverflowMenuAction } from '../components/OverflowMenu'
import { deleteMemory, updateMemory } from '../features/memories/api'
import { MEMORY_TAG_OPTIONS, type Memory, type MemoryTag } from '../features/memories/types'
import { useMemoryDetail } from '../features/memories/hooks'
import { supabase } from '../lib/supabase'
import { isForbiddenError, isUnauthorizedError } from '../lib/supabaseErrors'
import { formatDateTime } from '../lib/utils'

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

const DateEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
  flex-wrap: wrap;
`

const DateInput = styled.input`
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.text};
  padding: 0 ${({ theme }) => theme.space.x3};
  font-size: ${({ theme }) => theme.typography.secondarySize};
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

function toDateTimeLocalValue(isoValue: string): string {
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function toIsoFromLocalDateTime(value: string): string | null {
  const normalized = value.trim()
  if (!normalized) {
    return null
  }
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

export function MemoryDetailPage({ memoryId, navigate, canManageMemory = false }: MemoryDetailPageProps) {
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
  const [editingDate, setEditingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState('')

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
    setDateDraft(toDateTimeLocalValue(memory.recordedAt || memory.createdAt))
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

  const persist = async (changes: { title?: string; transcript?: string; tags?: MemoryTag[]; recordedAt?: string }) => {
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
      if (isUnauthorizedError(saveFailure)) {
        setSaveError('Your session expired. Please sign in again.')
        void supabase?.auth.signOut()
        navigate('/record')
      } else if (isForbiddenError(saveFailure)) {
        setSaveError('You are not authorized to update this memory.')
      } else {
        const message = saveFailure instanceof Error ? saveFailure.message : 'Could not save changes.'
        setSaveError(message)
      }
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

  const onSaveDate = async () => {
    const isoValue = toIsoFromLocalDateTime(dateDraft)
    if (!isoValue) {
      setSaveError('Please select a valid date and time.')
      return
    }
    const successful = await persist({ recordedAt: isoValue })
    if (successful) {
      setEditingDate(false)
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
      if (isUnauthorizedError(failure)) {
        setDeleteError('Your session expired. Please sign in again.')
        void supabase?.auth.signOut()
        navigate('/record')
      } else if (isForbiddenError(failure)) {
        setDeleteError('You are not authorized to delete this memory.')
      } else {
        const message = failure instanceof Error ? failure.message : 'Could not delete this memory.'
        setDeleteError(message)
      }
    } finally {
      setDeleting(false)
    }
  }

  const menuActions: OverflowMenuAction[] = canManageMemory
    ? [
        {
          id: 'edit-title',
          label: 'Edit title',
          onSelect: () => {
            setEditingDate(false)
            setEditingTranscript(false)
            setEditingTags(false)
            setEditingTitle(true)
          },
        },
        {
          id: 'edit-date',
          label: 'Edit date',
          onSelect: () => {
            setEditingTitle(false)
            setEditingTranscript(false)
            setEditingTags(false)
            setDateDraft(currentMemory ? toDateTimeLocalValue(currentMemory.recordedAt || currentMemory.createdAt) : '')
            setEditingDate(true)
          },
        },
        {
          id: 'edit-transcript',
          label: 'Edit transcript',
          onSelect: () => {
            setEditingTitle(false)
            setEditingDate(false)
            setEditingTags(false)
            setEditingTranscript(true)
          },
        },
        {
          id: 'edit-tags',
          label: 'Edit tags',
          onSelect: () => {
            setEditingTitle(false)
            setEditingDate(false)
            setEditingTranscript(false)
            setEditingTags(true)
          },
        },
        {
          id: 'delete-memory',
          label: 'Delete memory',
          tone: 'destructive',
          onSelect: () => {
            setDeleteError('')
            setDeleteDialogOpen(true)
          },
        },
      ]
    : []

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
        <TopBar>
          <BackButton type="button" onClick={() => navigate('/memories')} aria-label="Back to memories">
            ← Back
          </BackButton>
          {canManageMemory && (
            <OverflowMenu actions={menuActions} ariaLabel="More actions" disabled={saving || deleting} />
          )}
        </TopBar>

        <TitleRow>
          {editingTitle ? (
            <TitleInput value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
          ) : (
            <Title>{currentMemory.title || 'Untitled Memory'}</Title>
          )}

          {canManageMemory && editingTitle && (
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
          )}
        </TitleRow>

        {editingDate ? (
          <DateEditRow>
            <DateInput
              type="datetime-local"
              value={dateDraft}
              onChange={(event) => setDateDraft(event.target.value)}
              aria-label="Edit memory date"
            />
            <EditStateActions>
              <EditStateIconButton $kind="save" type="button" aria-label="Save date" disabled={saving} onClick={() => void onSaveDate()}>
                <SaveIcon />
              </EditStateIconButton>
              <EditStateIconButton
                $kind="cancel"
                type="button"
                aria-label="Cancel date editing"
                disabled={saving}
                onClick={() => {
                  setDateDraft(toDateTimeLocalValue(currentMemory.recordedAt || currentMemory.createdAt))
                  setEditingDate(false)
                }}
              >
                <CancelIcon />
              </EditStateIconButton>
            </EditStateActions>
          </DateEditRow>
        ) : (
          <MetaText>{formatDateTime(currentMemory.recordedAt || currentMemory.createdAt)}</MetaText>
        )}
        {lastSavedAt && <MetaText>Last saved {formatDateTime(lastSavedAt)}</MetaText>}

        <TagRow>
          {(editingTags ? tagsDraft : currentMemory.tags).map((tag) => (
            <TagChip key={tag}>{tag}</TagChip>
          ))}
        </TagRow>

        {canManageMemory && editingTags && (
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

        {canManageMemory && editingTags && (
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
          {canManageMemory && editingTranscript && (
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
          )}
        </CardHeader>

        {canManageMemory && editingTranscript ? (
          <TranscriptArea value={transcriptDraft} onChange={(event) => setTranscriptDraft(event.target.value)} />
        ) : (
          <TranscriptText>{currentMemory.transcript || 'Transcription still processing.'}</TranscriptText>
        )}
      </Card>

      {!canManageMemory && <MetaText>Only owners can edit or delete memories.</MetaText>}
      {saveError && <ErrorText>{saveError}</ErrorText>}
      {saveNotice && <SuccessText>{saveNotice}</SuccessText>}

      {deleteError && <ErrorText>{deleteError}</ErrorText>}
      <ConfirmDialog
        open={canManageMemory && deleteDialogOpen}
        title="Delete memory?"
        body="This can’t be undone."
        cancelLabel="Cancel"
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
        busy={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteError('')
            setDeleteDialogOpen(false)
          }
        }}
        onConfirm={() => void onConfirmDelete()}
      />
    </Section>
  )
}
