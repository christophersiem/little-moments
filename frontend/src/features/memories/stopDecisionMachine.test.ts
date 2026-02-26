import assert from 'node:assert/strict'
import { transitionStopDecision } from './stopDecisionMachine'

function test(name: string, fn: () => void): void {
  try {
    fn()
    // Keep output compact but explicit for CI logs.
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

test('opens save/discard choice when recording stops', () => {
  const next = transitionStopDecision('hidden', 'recording-stopped')

  assert.equal(next.state, 'choice')
  assert.equal(next.shouldUpload, false)
  assert.equal(next.shouldDeleteLocalAudio, false)
})

test('only triggers upload when save is selected', () => {
  const next = transitionStopDecision('choice', 'save-selected')

  assert.equal(next.state, 'hidden')
  assert.equal(next.shouldUpload, true)
  assert.equal(next.shouldDeleteLocalAudio, false)
})

test('requires confirmation before discard and deletes on confirm', () => {
  const toConfirm = transitionStopDecision('choice', 'discard-selected')
  const canceled = transitionStopDecision(toConfirm.state, 'discard-canceled')
  const confirmed = transitionStopDecision(toConfirm.state, 'discard-confirmed')

  assert.equal(toConfirm.state, 'confirm-discard')
  assert.equal(canceled.state, 'choice')
  assert.equal(confirmed.shouldDeleteLocalAudio, true)
  assert.equal(confirmed.shouldUpload, false)
})
