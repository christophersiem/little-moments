import { useEffect, useRef, useState } from 'react'
import { APP_ROUTES } from '../../../app/routes'
import type { OverflowMenuAction } from '../../../components/OverflowMenu'
import { isForbiddenError, isUnauthorizedError } from '../../../lib/supabaseErrors'
import { supabase } from '../../../lib/supabase'
import { deleteMemory, updateMemory } from '../api'
import { splitMemoryDateTimeDraft, toIsoFromMemoryDateAndTime } from '../lib/formatMemoryDate'
import { removeMemoryFromCache, updateMemoryInCache } from './usePaginatedMemories'
import type { Memory, MemoryTag, UpdateMemoryRequest } from '../types'

interface UseMemoryDetailEditorOptions {
  memory: Memory | null
  canManageMemory: boolean
  navigate: (nextPath: string) => void
}

interface PersistChanges extends Pick<UpdateMemoryRequest, 'title' | 'transcript' | 'tags' | 'recordedAt'> {}

export function useMemoryDetailEditor({ memory, canManageMemory, navigate }: UseMemoryDetailEditorOptions) {
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
  const [dateDraftDate, setDateDraftDate] = useState('')
  const [dateDraftTime, setDateDraftTime] = useState('')
  const dateInputRef = useRef<HTMLInputElement | null>(null)

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
    const split = splitMemoryDateTimeDraft(memory.recordedAt || memory.createdAt)
    setDateDraftDate(split.date)
    setDateDraftTime(split.time)
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

  const persist = async (changes: PersistChanges) => {
    if (!currentMemory) {
      return false
    }
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateMemory(currentMemory.id, changes)
      updateMemoryInCache(updated)
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
        navigate(APP_ROUTES.record)
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

  const resetDateDraftFromCurrent = () => {
    if (!currentMemory) {
      return
    }
    const split = splitMemoryDateTimeDraft(currentMemory.recordedAt || currentMemory.createdAt)
    setDateDraftDate(split.date)
    setDateDraftTime(split.time)
  }

  const onSaveDate = async () => {
    const isoValue = toIsoFromMemoryDateAndTime(dateDraftDate, dateDraftTime)
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
      removeMemoryFromCache(currentMemory.id)
      navigate(APP_ROUTES.memories)
    } catch (failure) {
      if (isUnauthorizedError(failure)) {
        setDeleteError('Your session expired. Please sign in again.')
        void supabase?.auth.signOut()
        navigate(APP_ROUTES.record)
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
            resetDateDraftFromCurrent()
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

  const onCancelTitleEditing = () => {
    setTitleDraft(currentMemory?.title || '')
    setEditingTitle(false)
  }

  const onCancelTranscriptEditing = () => {
    setTranscriptDraft(currentMemory?.transcript || '')
    setEditingTranscript(false)
  }

  const onCancelTagsEditing = () => {
    setTagsDraft(currentMemory?.tags ?? [])
    setEditingTags(false)
  }

  const onCloseDateEditor = () => {
    if (saving) {
      return
    }
    resetDateDraftFromCurrent()
    setEditingDate(false)
  }

  const onDeleteDialogCancel = () => {
    if (deleting) {
      return
    }
    setDeleteError('')
    setDeleteDialogOpen(false)
  }

  return {
    currentMemory,
    saveError,
    saveNotice,
    lastSavedAt,
    saving,
    deleteDialogOpen,
    deleting,
    deleteError,
    editingTitle,
    titleDraft,
    editingDate,
    dateDraftDate,
    dateDraftTime,
    dateInputRef,
    editingTranscript,
    transcriptDraft,
    editingTags,
    tagsDraft,
    menuActions,
    setTitleDraft,
    setDateDraftDate,
    setDateDraftTime,
    setTranscriptDraft,
    onSaveTitle,
    onSaveDate,
    onSaveTranscript,
    onSaveTags,
    toggleDraftTag,
    onConfirmDelete,
    onCancelTitleEditing,
    onCancelTranscriptEditing,
    onCancelTagsEditing,
    onCloseDateEditor,
    onDeleteDialogCancel,
  }
}
