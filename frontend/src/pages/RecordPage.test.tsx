import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordPage } from './RecordPage'
import { renderWithProviders } from '../test/renderWithProviders'
import { SHORT_TRANSCRIPT_MESSAGE } from '../features/memories/constants'

const { startMemoryUploadMock } = vi.hoisted(() => ({
  startMemoryUploadMock: vi.fn(() => ({ clientId: 'client-123' })),
}))

vi.mock('../features/memories/hooks/uploadSessionStore', () => ({
  startMemoryUpload: startMemoryUploadMock,
}))

class MockMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['a'.repeat(12000)], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}

describe('RecordPage', () => {
  beforeEach(() => {
    startMemoryUploadMock.mockClear()
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)
    Object.defineProperty(window.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    })
  })

  it('renders the idle recording button', () => {
    renderWithProviders(<RecordPage navigate={vi.fn()} childId="child-1" />)

    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument()
  })

  it('supports start and stop interaction and shows the save/discard state', async () => {
    const user = userEvent.setup()

    renderWithProviders(<RecordPage navigate={vi.fn()} childId="child-1" />)

    await user.click(screen.getByRole('button', { name: /start recording/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /stop recording/i }))

    expect(screen.getByText('Save this recording?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save recording/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discard recording/i })).toBeInTheDocument()
  })

  it('navigates to memories after save and starts upload', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')

    renderWithProviders(<RecordPage navigate={navigate} childId="child-1" />)

    await user.click(screen.getByRole('button', { name: /start recording/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument())
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2200))
    })
    await user.click(screen.getByRole('button', { name: /stop recording/i }))
    await user.click(screen.getByRole('button', { name: /save recording/i }))

    await waitFor(() => {
      expect(startMemoryUploadMock).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith('/memories')
      expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/memories?pending=client-123')
    })
  })

  it('supports discard flow without starting upload', async () => {
    const user = userEvent.setup()

    renderWithProviders(<RecordPage navigate={vi.fn()} childId="child-1" />)

    await user.click(screen.getByRole('button', { name: /start recording/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /stop recording/i }))
    await user.click(screen.getByRole('button', { name: /discard recording/i }))

    expect(screen.getByText('Discard this recording?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /yes, discard recording/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument()
      expect(startMemoryUploadMock).not.toHaveBeenCalled()
    })
  })

  it('returns to idle with hint when saving a too-short recording', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    renderWithProviders(<RecordPage navigate={navigate} childId="child-1" />)

    await user.click(screen.getByRole('button', { name: /start recording/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /stop recording/i }))
    await user.click(screen.getByRole('button', { name: /save recording/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(SHORT_TRANSCRIPT_MESSAGE)
      expect(startMemoryUploadMock).not.toHaveBeenCalled()
      expect(navigate).not.toHaveBeenCalled()
    })
  })
})
