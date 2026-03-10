import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { RecordButton } from '../components/RecordButton'
import { APP_ROUTES } from '../app/routes'
import { SHORT_TRANSCRIPT_MESSAGE } from '../features/memories/constants'
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
const SHORT_HINT_DISPLAY_MS = 5200

function isLikelyTooShort(blob: Blob, elapsedSeconds: number): boolean {
  return elapsedSeconds < MIN_RECORDING_SECONDS || blob.size < MIN_RECORDING_BYTES
}

const RecordCanvas = styled.section`
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: clamp(24px, 6.8vh, 64px) 0 0;
  background:
    radial-gradient(circle at 50% 34%, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0) 52%),
    radial-gradient(circle at 50% 72%, rgba(203, 179, 148, 0.1), rgba(243, 237, 227, 0) 64%);
`

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const Title = styled.h1`
  margin: 0;
  font-size: clamp(3.1rem, 10.8vw, 4.8rem);
  line-height: 0.98;
  letter-spacing: -0.01em;
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-weight: 500;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.text} 95%, #2f251d);
`

const Subtitle = styled.p`
  font-size: clamp(1.65rem, 5.8vw, 2.3rem);
  line-height: 1.2;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.text} 86%, ${({ theme }) => theme.colors.textMuted});
`

const RecordCluster = styled.div`
  margin-top: clamp(54px, 10vh, 118px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(28px, 4vh, 46px);
`

const Timer = styled.p`
  font-size: clamp(3.45rem, 12vw, 5.5rem);
  line-height: 0.96;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.text} 95%, #2b221b);
`

const PhaseHint = styled.p`
  max-width: 320px;
  margin-top: calc(${({ theme }) => theme.space.x1} * -1);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const HintBanner = styled.p`
  width: min(360px, calc(100dvw - 48px));
  max-width: 100%;
  margin-top: ${({ theme }) => theme.space.x2};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.danger} 72%, ${({ theme }) => theme.colors.border});
  border-radius: ${({ theme }) => theme.radii.md};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surfaceStrong} 88%, #fff);
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
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 390 : window.innerWidth,
  )

  const largeButtonDiameter = viewportWidth < 390 ? 210 : 236

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
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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
        setErrorMessage(SHORT_TRANSCRIPT_MESSAGE)
        return
      }

      const session = startMemoryUpload(latestRecordingRef.current.blob, latestRecordingRef.current.recordedAt, childId)
      latestRecordingRef.current = null
      chunksRef.current = []
      setStopDecisionState('hidden')
      setPhase('idle')
      setElapsedSeconds(0)
      navigate(APP_ROUTES.memories)
      window.history.replaceState(
        {},
        '',
        `${APP_ROUTES.memories}?pending=${encodeURIComponent(session.clientId)}`,
      )
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

  const buttonStatus = phase === 'recording' ? 'recording' : phase === 'stopped' ? 'stopped' : 'idle'
  const timerSeconds = phase === 'idle' ? 0 : elapsedSeconds

  return (
    <>
      <RecordCanvas>
        <HeaderBlock>
          <Title>Little Moments</Title>
          <Subtitle>Capture a small moment</Subtitle>
        </HeaderBlock>

        <RecordCluster>
          <RecordButton
            status={buttonStatus}
            elapsedSec={timerSeconds}
            maxDurationSec={60}
            onStart={phase === 'idle' ? () => void startRecording() : NOOP}
            onStop={phase === 'recording' ? stopRecording : NOOP}
            diameter={largeButtonDiameter}
          />

          <Timer>{formatDuration(timerSeconds)}</Timer>

          {phase === 'recording' && <PhaseHint>Recording in progress.</PhaseHint>}
          {phase === 'stopped' && <PhaseHint>Your recording is ready to save.</PhaseHint>}

          {phase === 'idle' && errorMessage && <HintBanner role="status">{errorMessage}</HintBanner>}
        </RecordCluster>
      </RecordCanvas>

      {phase === 'stopped' && stopDecisionState !== 'hidden' && (
        <ModalOverlay role="presentation">
          <ModalSheet role="dialog" aria-modal="true" aria-label="Save or discard recording">
            <SheetHandle aria-hidden />
            {stopDecisionState === 'choice' ? (
              <>
                <h2>Save this recording?</h2>
                <PhaseHint>Save now, or discard this moment.</PhaseHint>
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
                <PhaseHint>This action cannot be undone.</PhaseHint>
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
