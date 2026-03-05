import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { RecordButton } from '../components/RecordButton'
import { startMemoryUpload } from '../features/memories/hooks/uploadSessionStore'
import {
  transitionStopDecision,
  type StopDecisionEvent,
  type StopDecisionState,
} from '../features/memories/stopDecisionMachine'
import { formatDuration } from '../lib/utils'

interface RecordPageProps {
  navigate: (nextPath: string) => void
  childId: string
  onNavigationLockChange?: (locked: boolean) => void
}

type RecordPhase = 'idle' | 'recording' | 'stopped' | 'error'

interface RecordingPayload {
  blob: Blob
  recordedAt: string
}

const NOOP = () => undefined
const MIN_RECORDING_SECONDS = 2
const MIN_RECORDING_BYTES = 10000
const SHORT_RECORDING_HINT = 'Recording too short. Please speak at least 5 words.'
const SHORT_HINT_DISPLAY_MS = 5200

function isLikelyTooShort(blob: Blob, elapsedSeconds: number): boolean {
  return elapsedSeconds < MIN_RECORDING_SECONDS || blob.size < MIN_RECORDING_BYTES
}

const Stage = styled.section`
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
`

const CenterStage = styled(Stage)`
  justify-content: center;
`

const Hero = styled.div`
  margin-top: clamp(56px, 14vh, 120px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${({ theme }) => theme.space.x4};
`

const CenterHero = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: calc(${({ theme }) => theme.layout.bottomNavHeight} + ${({ theme }) => theme.space.x2});
`

const RecordAnchor = styled.div`
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
`

const RecordingMeta = styled.div`
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.space.x4});
  left: 50%;
  transform: translateX(-50%);
  width: min(320px, calc(100vw - 48px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const Timer = styled.div`
  font-size: ${({ theme }) => theme.typography.timerSize};
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text};
`

const BodyText = styled.p`
  max-width: 280px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.bodySize};
`

const HintBanner = styled.p`
  width: min(360px, calc(100vw - 48px));
  margin: ${({ theme }) => `${theme.space.x3} 0 0`};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  border: 1px solid ${({ theme }) => theme.colors.danger};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.typography.bodySize};
  line-height: ${({ theme }) => theme.typography.bodyLineHeight};
  text-align: center;
`

const PrivacyText = styled.p`
  max-width: 320px;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
`

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: ${({ theme }) =>
    `${theme.space.x3} ${theme.space.x3} calc(${theme.layout.bottomNavHeight} + ${theme.space.x3} + env(safe-area-inset-bottom, 0px))`};
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

const SheetHandle = styled.div`
  align-self: center;
  width: 40px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.border};
`

const SheetActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

export function RecordPage({ navigate, childId, onNavigationLockChange }: RecordPageProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const latestRecordingRef = useRef<RecordingPayload | null>(null)
  const intervalRef = useRef<number | null>(null)

  const [phase, setPhase] = useState<RecordPhase>('idle')
  const [stopDecisionState, setStopDecisionState] = useState<StopDecisionState>('hidden')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

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

  useEffect(() => {
    if (phase !== 'idle' || !errorMessage) {
      return
    }
    const timer = window.setTimeout(() => setErrorMessage(''), SHORT_HINT_DISPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [errorMessage, phase])

  useEffect(() => {
    onNavigationLockChange?.(phase === 'recording')
  }, [onNavigationLockChange, phase])

  useEffect(() => {
    if (phase !== 'stopped' || stopDecisionState === 'hidden') {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stopDecisionState === 'confirm-discard') {
        onStopDecision('discard-canceled')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, stopDecisionState])

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
    setElapsedSeconds(0)
    setStopDecisionState('hidden')

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
    } catch {
      cleanupStream()
      setErrorMessage('Microphone access is needed to record a moment.')
      setPhase('error')
    }
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
      if (!childId) {
        setErrorMessage('No child selected for this memory.')
        setPhase('error')
        return
      }

      if (isLikelyTooShort(latestRecordingRef.current.blob, elapsedSeconds)) {
        latestRecordingRef.current = null
        chunksRef.current = []
        setStopDecisionState('hidden')
        setPhase('idle')
        setElapsedSeconds(0)
        setErrorMessage(SHORT_RECORDING_HINT)
        return
      }

      const session = startMemoryUpload(latestRecordingRef.current.blob, latestRecordingRef.current.recordedAt, childId)
      latestRecordingRef.current = null
      chunksRef.current = []
      setStopDecisionState('hidden')
      setPhase('idle')
      setElapsedSeconds(0)
      navigate('/memories')
      window.history.replaceState({}, '', `/memories?pending=${encodeURIComponent(session.clientId)}`)
    }
  }

  if (phase === 'error') {
    return (
      <Card>
        <h2>Could not continue.</h2>
        <ErrorText>{errorMessage}</ErrorText>
        <Stack>
          <Button variant="primary" fullWidth onClick={() => setPhase('idle')}>
            Start over
          </Button>
        </Stack>
      </Card>
    )
  }

  if (phase === 'recording') {
    return (
      <CenterStage>
        <CenterHero>
          <RecordAnchor>
            <RecordButton
              status="recording"
              elapsedSec={elapsedSeconds}
              maxDurationSec={60}
              onStart={NOOP}
              onStop={stopRecording}
              diameter={188}
            />
            <RecordingMeta>
              <Timer>{formatDuration(elapsedSeconds)}</Timer>
              <BodyText>Speak naturally. We will structure this moment for you.</BodyText>
            </RecordingMeta>
          </RecordAnchor>
        </CenterHero>
      </CenterStage>
    )
  }

  if (phase === 'stopped') {
    return (
      <>
        <Stage>
          <Hero>
            <RecordButton
              status="stopped"
              elapsedSec={elapsedSeconds}
              maxDurationSec={60}
              onStart={NOOP}
              onStop={NOOP}
              diameter={96}
            />
            <BodyText>Your recording is ready to save.</BodyText>
          </Hero>
        </Stage>

        {stopDecisionState !== 'hidden' && (
          <ModalOverlay role="presentation">
            <ModalSheet role="dialog" aria-modal="true" aria-label="Save or discard recording">
              <SheetHandle aria-hidden />
              {stopDecisionState === 'choice' ? (
                <>
                  <h2>Save this recording?</h2>
                  <BodyText>Save now, or discard this moment.</BodyText>
                  <PrivacyText>Audio is transcribed to text and not stored as audio.</PrivacyText>
                  <SheetActions>
                    <Button variant="primary" fullWidth autoFocus onClick={() => onStopDecision('save-selected')}>
                      Save recording
                    </Button>
                    <Button fullWidth onClick={() => onStopDecision('discard-selected')}>
                      Discard recording
                    </Button>
                  </SheetActions>
                </>
              ) : (
                <>
                  <h2>Discard this recording?</h2>
                  <BodyText>This action cannot be undone.</BodyText>
                  <SheetActions>
                    <Button variant="danger" fullWidth autoFocus onClick={() => onStopDecision('discard-confirmed')}>
                      Yes, discard recording
                    </Button>
                    <Button fullWidth onClick={() => onStopDecision('discard-canceled')}>
                      Keep recording
                    </Button>
                  </SheetActions>
                </>
              )}
            </ModalSheet>
          </ModalOverlay>
        )}
      </>
    )
  }

  return (
    <CenterStage>
      <CenterHero>
        <RecordButton
          status="idle"
          elapsedSec={0}
          maxDurationSec={60}
          onStart={() => void startRecording()}
          onStop={NOOP}
          diameter={188}
        />
        {errorMessage && <HintBanner role="status">{errorMessage}</HintBanner>}
      </CenterHero>
    </CenterStage>
  )
}
