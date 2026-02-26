import { useEffect, useMemo, useRef, useState } from 'react'
import { createMemory } from '../features/memories/api'
import {
  transitionStopDecision,
  type StopDecisionEvent,
  type StopDecisionState,
} from '../features/memories/stopDecisionMachine'
import type { CreateMemoryResponse } from '../features/memories/types'
import { formatDuration } from '../lib/utils'

interface RecordPageProps {
  navigate: (nextPath: string) => void
}

type RecordPhase = 'idle' | 'recording' | 'stopped' | 'saving' | 'saved' | 'error'

interface RecordingPayload {
  blob: Blob
  recordedAt: string
}

export function RecordPage({ navigate }: RecordPageProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const latestRecordingRef = useRef<RecordingPayload | null>(null)
  const intervalRef = useRef<number | null>(null)

  const [phase, setPhase] = useState<RecordPhase>('idle')
  const [stopDecisionState, setStopDecisionState] = useState<StopDecisionState>('hidden')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [savedResult, setSavedResult] = useState<CreateMemoryResponse | null>(null)

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const stopTimer = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      stopTimer()
      cleanupStream()
    }
  }, [])

  const uploadRecording = async (audioBlob: Blob, recordedAtIso: string) => {
    setPhase('saving')
    setErrorMessage('')

    try {
      const payload = await createMemory(audioBlob, recordedAtIso)
      if (payload.status === 'FAILED') {
        setErrorMessage(payload.errorMessage || 'Transcription failed.')
        setPhase('error')
        return
      }
      setSavedResult(payload)
      setPhase('saved')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your moment.'
      setErrorMessage(message)
      setPhase('error')
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      return
    }
    stopTimer()
    recorder.stop()
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Audio recording is not supported in this browser.')
      setPhase('error')
      return
    }

    setErrorMessage('')
    setSavedResult(null)
    setElapsedSeconds(0)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        cleanupStream()
        const recordingEndedAt = new Date().toISOString()
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        latestRecordingRef.current = { blob, recordedAt: recordingEndedAt }
        setPhase('stopped')
        setStopDecisionState(transitionStopDecision('hidden', 'recording-stopped').state)
      }

      recorder.start(300)
      setPhase('recording')
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((current) => current + 1)
      }, 1000)
    } catch (error) {
      cleanupStream()
      const message = error instanceof Error ? error.message : 'Microphone access was denied.'
      setErrorMessage(message)
      setPhase('error')
    }
  }

  const retryUpload = () => {
    if (!latestRecordingRef.current) {
      return
    }
    void uploadRecording(latestRecordingRef.current.blob, latestRecordingRef.current.recordedAt)
  }

  const onStopDecision = (event: StopDecisionEvent) => {
    const transition = transitionStopDecision(stopDecisionState, event)
    setStopDecisionState(transition.state)

    if (transition.shouldDeleteLocalAudio) {
      latestRecordingRef.current = null
      chunksRef.current = []
      setPhase('idle')
      setElapsedSeconds(0)
      setErrorMessage('')
      return
    }

    if (transition.shouldUpload) {
      if (!latestRecordingRef.current) {
        setErrorMessage('No recording found to save.')
        setPhase('error')
        return
      }
      void uploadRecording(latestRecordingRef.current.blob, latestRecordingRef.current.recordedAt)
      return
    }

    if (event === 'choice-dismissed') {
      setPhase('stopped')
    }
  }

  const transcriptPreview = useMemo(() => {
    return savedResult?.transcriptPreview || 'Your transcript was saved.'
  }, [savedResult])

  if (phase === 'saving') {
    return (
      <section className="panel panel-center">
        <h1>Saving your moment...</h1>
        <p>We are transcribing and storing your entry.</p>
      </section>
    )
  }

  if (phase === 'saved' && savedResult) {
    return (
      <section className="panel">
        <h1>Saved</h1>
        <p className="preview">{transcriptPreview}</p>
        <div className="row">
          <button className="button button-primary" onClick={() => navigate(`/memories/${savedResult.id}`)}>
            Open Entry
          </button>
          <button className="button" onClick={() => navigate('/memories')}>
            View List
          </button>
          <button className="button" onClick={() => setPhase('idle')}>
            Record Another
          </button>
        </div>
      </section>
    )
  }

  if (phase === 'error') {
    return (
      <section className="panel">
        <h1>Could not save moment</h1>
        <p className="error">{errorMessage}</p>
        <div className="row">
          <button className="button button-primary" onClick={retryUpload} disabled={!latestRecordingRef.current}>
            Retry Upload
          </button>
          <button className="button" onClick={() => setPhase('idle')}>
            Start Over
          </button>
        </div>
      </section>
    )
  }

  if (phase === 'recording') {
    return (
      <section className="panel panel-center">
        <h1>Recording</h1>
        <div className="timer">{formatDuration(elapsedSeconds)}</div>
        <button className="button button-danger" onClick={stopRecording}>
          Stop
        </button>
      </section>
    )
  }

  if (phase === 'stopped') {
    return (
      <>
        <section className="panel panel-center">
          <h1>Recording stopped</h1>
          <p>Choose whether to save or discard this recording.</p>
          <button className="button button-primary" onClick={() => setStopDecisionState('choice')}>
            Open Save / Discard
          </button>
        </section>

        {stopDecisionState !== 'hidden' && (
          <div className="modal-overlay" role="presentation">
            <section className="modal-sheet" role="dialog" aria-modal="true">
              {stopDecisionState === 'choice' ? (
                <>
                  <h2>Save this recording?</h2>
                  <p>You can save now or discard this moment.</p>
                  <div className="row">
                    <button className="button button-primary" onClick={() => onStopDecision('save-selected')}>
                      Save
                    </button>
                    <button className="button" onClick={() => onStopDecision('discard-selected')}>
                      Discard
                    </button>
                    <button className="button" onClick={() => onStopDecision('choice-dismissed')}>
                      Back
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>Discard this recording?</h2>
                  <p>This action cannot be undone.</p>
                  <div className="row">
                    <button className="button button-danger" onClick={() => onStopDecision('discard-confirmed')}>
                      Yes, Discard
                    </button>
                    <button className="button" onClick={() => onStopDecision('discard-canceled')}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </>
    )
  }

  return (
    <section className="panel panel-center">
      <h1>Record a moment</h1>
      <p>Capture a short memory and save it as a transcript.</p>
      <button className="button button-primary button-large" onClick={() => void startRecording()}>
        Start Recording
      </button>
    </section>
  )
}
