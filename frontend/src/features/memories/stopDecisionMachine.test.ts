import { describe, expect, it } from 'vitest'
import { transitionStopDecision } from './stopDecisionMachine'

describe('stopDecisionMachine', () => {
  it('opens save/discard choice when recording stops', () => {
    const next = transitionStopDecision('hidden', 'recording-stopped')

    expect(next.state).toBe('choice')
    expect(next.shouldUpload).toBe(false)
    expect(next.shouldDeleteLocalAudio).toBe(false)
  })

  it('only triggers upload when save is selected', () => {
    const next = transitionStopDecision('choice', 'save-selected')

    expect(next.state).toBe('hidden')
    expect(next.shouldUpload).toBe(true)
    expect(next.shouldDeleteLocalAudio).toBe(false)
  })

  it('requires confirmation before discard and deletes on confirm', () => {
    const toConfirm = transitionStopDecision('choice', 'discard-selected')
    const canceled = transitionStopDecision(toConfirm.state, 'discard-canceled')
    const confirmed = transitionStopDecision(toConfirm.state, 'discard-confirmed')

    expect(toConfirm.state).toBe('confirm-discard')
    expect(canceled.state).toBe('choice')
    expect(confirmed.shouldDeleteLocalAudio).toBe(true)
    expect(confirmed.shouldUpload).toBe(false)
  })
})
