import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
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

const Stage = styled.section`
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
`

const Hero = styled.div`
  margin-top: clamp(72px, 17vh, 150px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${({ theme }) => theme.space.x4};
`

const RingBase = styled.div<{ $recording: boolean }>`
  width: 138px;
  height: 138px;
  border-radius: 50%;
  border: 6px solid ${({ theme }) => theme.colors.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background};
  ${({ $recording, theme }) =>
    $recording ? `box-shadow: 0 0 0 7px ${theme.colors.surface};` : 'box-shadow: none;'}
`

const RingButton = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 4px;
  }
`

const MicGlyph = styled.span`
  width: 16px;
  height: 22px;
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: 10px;
  position: relative;
  display: inline-block;

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -8px;
    width: 2px;
    height: 8px;
    transform: translateX(-50%);
    background: ${({ theme }) => theme.colors.accent};
  }
`

const Dot = styled.span`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent};
`

const Heading = styled.h2`
  font-size: 2.875rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

const Timer = styled.div`
  font-size: ${({ theme }) => theme.typography.timerSize};
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text};
`

const BodyText = styled.p`
  max-width: 230px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.bodySize};
`

const ActionBar = styled.div`
  margin-top: auto;
  padding-bottom: ${({ theme }) => theme.space.x6};
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
`

const Preview = styled.p`
  line-height: ${({ theme }) => theme.typography.bodyLineHeight};
`

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.x3};
`

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: ${({ theme }) => theme.space.x3};
  z-index: 20;
`

const ModalSheet = styled.section`
  width: min(${({ theme }) => theme.layout.maxWidth}, 100%);
  background: ${({ theme }) => theme.colors.surfaceStrong};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => `${theme.radii.xl} ${theme.radii.xl} ${theme.radii.md} ${theme.radii.md}`};
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
  box-shadow: ${({ theme }) => theme.shadows.sheet};
  animation: rise-in 220ms ease-out;
`

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
  }

  const transcriptPreview = useMemo(() => {
    return savedResult?.transcriptPreview || 'Your transcript was saved.'
  }, [savedResult])

  if (phase === 'saving') {
    return (
      <Card centered>
        <h2>Saving your moment...</h2>
        <BodyText>This can take a moment.</BodyText>
      </Card>
    )
  }

  if (phase === 'saved' && savedResult) {
    return (
      <Card>
        <h2>Saved</h2>
        <Preview>{transcriptPreview}</Preview>
        <Row>
          <Button variant="primary" onClick={() => navigate(`/memories/${savedResult.id}`)}>
            Open Entry
          </Button>
          <Button onClick={() => navigate('/memories')}>View List</Button>
          <Button onClick={() => setPhase('idle')}>Record Another</Button>
        </Row>
      </Card>
    )
  }

  if (phase === 'error') {
    return (
      <Card>
        <h2>Could not save moment</h2>
        <ErrorText>{errorMessage}</ErrorText>
        <Row>
          <Button variant="primary" onClick={retryUpload} disabled={!latestRecordingRef.current}>
            Retry Upload
          </Button>
          <Button onClick={() => setPhase('idle')}>Start Over</Button>
        </Row>
      </Card>
    )
  }

  if (phase === 'recording') {
    return (
      <Stage>
        <Hero>
          <RingBase $recording>
            <Dot />
          </RingBase>
          <Timer>{formatDuration(elapsedSeconds)}</Timer>
          <BodyText>Speak naturally. We&apos;ll structure it for you.</BodyText>
        </Hero>
        <ActionBar>
          <Button variant="primary" fullWidth onClick={stopRecording}>
            Stop Recording
          </Button>
        </ActionBar>
      </Stage>
    )
  }

  if (phase === 'stopped') {
    return (
      <>
        <Stage>
          <Hero>
            <RingBase $recording={false}>
              <Dot />
            </RingBase>
            <BodyText>Your recording is ready.</BodyText>
            {stopDecisionState === 'hidden' && (
              <Button variant="primary" onClick={() => setStopDecisionState('choice')}>
                Open Save / Discard
              </Button>
            )}
          </Hero>
        </Stage>

        {stopDecisionState !== 'hidden' && (
          <ModalOverlay role="presentation">
            <ModalSheet role="dialog" aria-modal="true">
              {stopDecisionState === 'choice' ? (
                <>
                  <h2>Save this recording?</h2>
                  <BodyText>You can save now or discard this moment.</BodyText>
                  <Row>
                    <Button variant="primary" onClick={() => onStopDecision('save-selected')}>
                      Save
                    </Button>
                    <Button onClick={() => onStopDecision('discard-selected')}>Discard</Button>
                  </Row>
                </>
              ) : (
                <>
                  <h2>Discard this recording?</h2>
                  <BodyText>This action cannot be undone.</BodyText>
                  <Row>
                    <Button variant="danger" onClick={() => onStopDecision('discard-confirmed')}>
                      Yes, Discard
                    </Button>
                    <Button onClick={() => onStopDecision('discard-canceled')}>Cancel</Button>
                  </Row>
                </>
              )}
            </ModalSheet>
          </ModalOverlay>
        )}
      </>
    )
  }

  return (
    <Stage>
      <Hero>
        <RingButton onClick={() => void startRecording()} aria-label="Start recording">
          <RingBase $recording={false}>
            <MicGlyph />
          </RingBase>
        </RingButton>
        <Heading>Record Moment</Heading>
        <BodyText>Capture today&apos;s memory in under a minute.</BodyText>
      </Hero>
    </Stage>
  )
}
