export type StopDecisionState = 'hidden' | 'choice' | 'confirm-discard'

export type StopDecisionEvent =
  | 'recording-stopped'
  | 'save-selected'
  | 'discard-selected'
  | 'discard-canceled'
  | 'discard-confirmed'

export interface StopDecisionTransition {
  state: StopDecisionState
  shouldUpload: boolean
  shouldDeleteLocalAudio: boolean
}

export function transitionStopDecision(
  state: StopDecisionState,
  event: StopDecisionEvent,
): StopDecisionTransition {
  if (event === 'recording-stopped') {
    return { state: 'choice', shouldUpload: false, shouldDeleteLocalAudio: false }
  }

  if (state === 'choice' && event === 'save-selected') {
    return { state: 'hidden', shouldUpload: true, shouldDeleteLocalAudio: false }
  }

  if (state === 'choice' && event === 'discard-selected') {
    return { state: 'confirm-discard', shouldUpload: false, shouldDeleteLocalAudio: false }
  }

  if (state === 'confirm-discard' && event === 'discard-canceled') {
    return { state: 'choice', shouldUpload: false, shouldDeleteLocalAudio: false }
  }

  if (state === 'confirm-discard' && event === 'discard-confirmed') {
    return { state: 'hidden', shouldUpload: false, shouldDeleteLocalAudio: true }
  }

  return { state, shouldUpload: false, shouldDeleteLocalAudio: false }
}
