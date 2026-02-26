import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { updateMemory } from '../features/memories/api'
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
  gap: ${({ theme }) => theme.space.x3};
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
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.x3};
`

const MetaText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const TinyAction = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: 0;
`

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const TagChip = styled.button<{ $active?: boolean; $interactive?: boolean }>`
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.surfaceStrong)};
  color: ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.textMuted)};
  padding: ${({ theme }) => `${theme.space.x1} ${theme.space.x2}`};
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

const CardLabel = styled.div`
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 600;
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
  min-height: 120px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.space.x3};
  resize: vertical;
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const InlineActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.x2};
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
`

export function MemoryDetailPage({ memoryId, navigate }: MemoryDetailPageProps) {
  const { loading, error, memory } = useMemoryDetail(memoryId)

  const [currentMemory, setCurrentMemory] = useState<Memory | null>(null)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

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
  }, [memory])

  const persist = async (changes: { title?: string; transcript?: string; tags?: MemoryTag[] }) => {
    if (!currentMemory) {
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateMemory(currentMemory.id, changes)
      setCurrentMemory(updated)
      setTitleDraft(updated.title || '')
      setTranscriptDraft(updated.transcript || '')
      setTagsDraft(updated.tags)
    } catch (saveFailure) {
      const message = saveFailure instanceof Error ? saveFailure.message : 'Could not save changes.'
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

  const onSaveTitle = async () => {
    await persist({ title: titleDraft })
    setEditingTitle(false)
  }

  const onSaveTranscript = async () => {
    await persist({ transcript: transcriptDraft })
    setEditingTranscript(false)
  }

  const onSaveTags = async () => {
    await persist({ tags: tagsDraft })
    setEditingTags(false)
  }

  const toggleDraftTag = (tag: MemoryTag) => {
    setTagsDraft((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    )
  }

  if (loading) {
    return (
      <Section>
        <Title>Memory</Title>
        <MetaText>Loading...</MetaText>
      </Section>
    )
  }

  if (error || !currentMemory) {
    return (
      <Section>
        <Title>Memory</Title>
        <ErrorText>{error || 'Could not load memory.'}</ErrorText>
        <Button onClick={() => navigate('/memories')}>Back to List</Button>
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
            <InlineActions>
              <TinyAction disabled={saving} onClick={() => void onSaveTitle()}>
                Save
              </TinyAction>
              <TinyAction
                disabled={saving}
                onClick={() => {
                  setTitleDraft(currentMemory.title || '')
                  setEditingTitle(false)
                }}
              >
                Cancel
              </TinyAction>
            </InlineActions>
          ) : (
            <TinyAction onClick={() => setEditingTitle(true)}>Edit</TinyAction>
          )}
        </TitleRow>

        <MetaText>{formatDateTime(currentMemory.recordedAt || currentMemory.createdAt)}</MetaText>

        <TagRow>
          {(editingTags ? tagsDraft : currentMemory.tags).map((tag) => (
            <TagChip key={tag}>{tag}</TagChip>
          ))}
          {editingTags ? (
            <InlineActions>
              <TinyAction disabled={saving} onClick={() => void onSaveTags()}>
                Save Tags
              </TinyAction>
              <TinyAction
                disabled={saving}
                onClick={() => {
                  setTagsDraft(currentMemory.tags)
                  setEditingTags(false)
                }}
              >
                Cancel
              </TinyAction>
            </InlineActions>
          ) : (
            <TinyAction onClick={() => setEditingTags(true)}>Edit Tags</TinyAction>
          )}
        </TagRow>

        {editingTags && (
          <TagRow>
            {MEMORY_TAG_OPTIONS.map((tag) => (
              <TagChip
                key={`option-${tag}`}
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
        <CardLabel>Summary</CardLabel>
        <CardText>{currentMemory.summary || 'No summary available yet.'}</CardText>
      </Card>

      <Card>
        <CardHeader>
          <CardLabel>Transcript</CardLabel>
          {editingTranscript ? (
            <InlineActions>
              <TinyAction disabled={saving} onClick={() => void onSaveTranscript()}>
                Save
              </TinyAction>
              <TinyAction
                disabled={saving}
                onClick={() => {
                  setTranscriptDraft(currentMemory.transcript || '')
                  setEditingTranscript(false)
                }}
              >
                Cancel
              </TinyAction>
            </InlineActions>
          ) : (
            <TinyAction onClick={() => setEditingTranscript(true)}>Edit</TinyAction>
          )}
        </CardHeader>

        {editingTranscript ? (
          <TranscriptArea value={transcriptDraft} onChange={(event) => setTranscriptDraft(event.target.value)} />
        ) : (
          <TranscriptText>{currentMemory.transcript || 'Transcription still processing.'}</TranscriptText>
        )}
      </Card>

      {saveError && <ErrorText>{saveError}</ErrorText>}

      <Button variant="primary" fullWidth onClick={() => navigate('/record')}>
        Record Another Moment
      </Button>
    </Section>
  )
}
