import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryDetailPage } from './MemoryDetailPage'
import { renderWithProviders } from '../test/renderWithProviders'
import type { Memory } from '../features/memories/types'

const { useMemoryDetailMock, useMemoryDetailEditorMock } = vi.hoisted(() => ({
  useMemoryDetailMock: vi.fn(),
  useMemoryDetailEditorMock: vi.fn(),
}))

vi.mock('../features/memories/hooks/useMemoryDetail', () => ({
  useMemoryDetail: useMemoryDetailMock,
}))

vi.mock('../features/memories/hooks/useMemoryDetailEditor', () => ({
  useMemoryDetailEditor: useMemoryDetailEditorMock,
}))

function buildMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: overrides.id ?? 'memory-1',
    createdAt: overrides.createdAt ?? '2026-02-20T12:00:00Z',
    recordedAt: overrides.recordedAt ?? '2026-02-20T12:00:00Z',
    status: overrides.status ?? 'READY',
    isHighlight: overrides.isHighlight ?? false,
    title: overrides.title ?? 'First words at breakfast',
    summary: overrides.summary ?? 'She asked for apples in a complete sentence.',
    transcript: overrides.transcript ?? 'Can I have more apples please?',
    errorMessage: overrides.errorMessage ?? null,
    tags: overrides.tags ?? ['Language'],
  }
}

function buildEditorState(memory: Memory | null) {
  return {
    currentMemory: memory,
    saveError: '',
    saveNotice: '',
    lastSavedAt: '',
    saving: false,
    deleteDialogOpen: false,
    deleting: false,
    deleteError: '',
    editingTitle: false,
    titleDraft: memory?.title ?? '',
    editingDate: false,
    dateDraftDate: '2026-02-20',
    dateDraftTime: '12:00',
    dateInputRef: { current: null },
    editingTranscript: false,
    transcriptDraft: memory?.transcript ?? '',
    editingTags: false,
    tagsDraft: memory?.tags ?? [],
    menuActions: [],
    setTitleDraft: vi.fn(),
    setDateDraftDate: vi.fn(),
    setDateDraftTime: vi.fn(),
    setTranscriptDraft: vi.fn(),
    onSaveTitle: vi.fn(async () => undefined),
    onSaveDate: vi.fn(async () => undefined),
    onSaveTranscript: vi.fn(async () => undefined),
    onSaveTags: vi.fn(async () => undefined),
    toggleDraftTag: vi.fn(),
    onConfirmDelete: vi.fn(async () => undefined),
    onCancelTitleEditing: vi.fn(),
    onCancelTranscriptEditing: vi.fn(),
    onCancelTagsEditing: vi.fn(),
    onCloseDateEditor: vi.fn(),
    onDeleteDialogCancel: vi.fn(),
  }
}

describe('MemoryDetailPage', () => {
  beforeEach(() => {
    useMemoryDetailMock.mockReturnValue({
      loading: false,
      error: '',
      memory: null,
      reload: vi.fn(),
    })
    useMemoryDetailEditorMock.mockReturnValue(buildEditorState(null))
  })

  it('renders loading state', () => {
    useMemoryDetailMock.mockReturnValue({
      loading: true,
      error: '',
      memory: null,
      reload: vi.fn(),
    })

    renderWithProviders(<MemoryDetailPage memoryId="memory-1" navigate={vi.fn()} />)

    expect(screen.getByText('Loading memory...')).toBeInTheDocument()
  })

  it('renders error state and supports retry and back navigation', async () => {
    const user = userEvent.setup()
    const reload = vi.fn()
    const navigate = vi.fn()

    useMemoryDetailMock.mockReturnValue({
      loading: false,
      error: 'Could not load memory.',
      memory: null,
      reload,
    })
    useMemoryDetailEditorMock.mockReturnValue(buildEditorState(null))

    renderWithProviders(<MemoryDetailPage memoryId="memory-1" navigate={navigate} />)

    expect(screen.getByText('Could not load memory.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(reload).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /back to memories/i }))
    expect(navigate).toHaveBeenCalledWith('/memories')
  })

  it('renders memory details and supports back navigation', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()
    const memory = buildMemory()

    useMemoryDetailMock.mockReturnValue({
      loading: false,
      error: '',
      memory,
      reload: vi.fn(),
    })
    useMemoryDetailEditorMock.mockReturnValue(buildEditorState(memory))

    renderWithProviders(<MemoryDetailPage memoryId="memory-1" navigate={navigate} canManageMemory={false} />)

    expect(screen.getByRole('heading', { name: 'First words at breakfast' })).toBeInTheDocument()
    expect(screen.getByText('She asked for apples in a complete sentence.')).toBeInTheDocument()
    expect(screen.getByText('Can I have more apples please?')).toBeInTheDocument()
    expect(screen.getByText('Only owners can edit or delete memories.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back to memories/i }))
    expect(navigate).toHaveBeenCalledWith('/memories')
  })
})
