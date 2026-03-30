import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { MemoryChatSheet } from './MemoryChatSheet'

const { askMemoriesMock } = vi.hoisted(() => ({
  askMemoriesMock: vi.fn(),
}))

vi.mock('../api', () => ({
  askMemories: askMemoriesMock,
}))

describe('MemoryChatSheet', () => {
  it('renders onboarding examples when no answer exists', () => {
    renderWithProviders(
      <MemoryChatSheet open familyId="family-1" onClose={vi.fn()} onOpenMemory={vi.fn()} />,
    )

    expect(screen.getByText('Answers are grounded in your saved memories only.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'What happened recently?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show me recent highlights.' })).toBeInTheDocument()
  })

  it('submits a question and opens source memory from response', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onOpenMemory = vi.fn()

    askMemoriesMock.mockResolvedValue({
      answer: 'The earliest match is in March 2026.',
      confidence: 'high',
      status: 'success',
      notes: null,
      sourceMemoryIds: ['memory-1'],
      sources: [
        {
          id: 'memory-1',
          recordedAt: '2026-03-01T10:00:00Z',
          title: 'First climb',
          snippet: 'He climbed the ladder on his own.',
          tags: ['Milestone'],
        },
      ],
    })

    renderWithProviders(<MemoryChatSheet open familyId="family-1" onClose={onClose} onOpenMemory={onOpenMemory} />)

    await user.type(screen.getByRole('textbox', { name: /ask your memories/i }), 'When did he climb alone?')
    await user.click(screen.getByRole('button', { name: /ask memories/i }))

    await waitFor(() => {
      expect(askMemoriesMock).toHaveBeenCalledWith('When did he climb alone?', 'family-1')
      expect(screen.getByText('The earliest match is in March 2026.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /first climb/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /first climb/i }))

    expect(onOpenMemory).toHaveBeenCalledWith('memory-1')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows an out-of-scope hint for unsupported requests', async () => {
    const user = userEvent.setup()

    askMemoriesMock.mockResolvedValue({
      answer: 'I can help with your saved memories instead.',
      confidence: 'low',
      status: 'out_of_scope',
      notes: null,
      sourceMemoryIds: [],
      sources: [],
    })

    renderWithProviders(
      <MemoryChatSheet open familyId={null} onClose={vi.fn()} onOpenMemory={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: 'What happened recently?' }))

    await waitFor(() => {
      expect(screen.getByText('Try asking about your saved moments, milestones, or highlights.')).toBeInTheDocument()
    })
  })

  it('shows a friendly insufficient-evidence hint', async () => {
    const user = userEvent.setup()

    askMemoriesMock.mockResolvedValue({
      answer: 'insufficient_evidence',
      confidence: 'low',
      status: 'insufficient_evidence',
      notes: null,
      sourceMemoryIds: [],
      sources: [],
    })

    renderWithProviders(
      <MemoryChatSheet open familyId={null} onClose={vi.fn()} onOpenMemory={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: 'What memories do we have about meals?' }))

    await waitFor(() => {
      expect(screen.getByText("I couldn’t find a memory that answers that yet.")).toBeInTheDocument()
      expect(
        screen.getByText('Try a broader topic, a recent timeframe, or a theme like meals, sleep, or language.'),
      ).toBeInTheDocument()
      expect(screen.getByText('Try one of these instead:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'What happened recently?' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Show me recent highlights.' })).toBeInTheDocument()
    })
  })
})
