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

const RecordSurface = styled.section`
  position: relative;
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0) 52%),
    linear-gradient(180deg, #f5efe3, #f1e9dc 52%, #efe7da 100%);
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 18% 24%, rgba(154, 130, 102, 0.05), transparent 36%),
      radial-gradient(circle at 84% 72%, rgba(158, 132, 103, 0.045), transparent 42%),
      radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.15), transparent 62%);
    pointer-events: none;
  }
`

const Content = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  min-height: 100%;
  padding: clamp(44px, 8.2vh, 86px) ${({ theme }) => theme.space.x3} clamp(46px, 8vh, 92px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: clamp(26px, 4.8vh, 44px);
`

const Intro = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const BrandTitle = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-size: clamp(3.2rem, 10.4vw, 4.9rem);
  font-weight: 500;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.text} 95%, #2f241a);
`

const Subtitle = styled.p`
  font-size: clamp(1.14rem, 3.9vw, 1.52rem);
  line-height: 1.25;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.textMuted} 80%, ${({ theme }) => theme.colors.text});
`

const RecorderStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(24px, 4vh, 38px);
`

const Timer = styled.p`
  margin: 0;
  font-size: clamp(3.3rem, 11.6vw, 5.2rem);
  line-height: 0.92;
  letter-spacing: 0.045em;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.text} 96%, #2b2018);
`

const SupportText = styled.p`
  margin-top: -2px;
  max-width: 320px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const HintBanner = styled.p`
  width: min(360px, calc(100dvw - 48px));
  max-width: 100%;
  margin-top: ${({ theme }) => theme.space.x1};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.danger} 70%, ${({ theme }) => theme.colors.border});
  border-radius: ${({ theme }) => theme.radii.md};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surfaceStrong} 90%, #fff);
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

  const buttonDiameter = viewportWidth < 390 ? 196 : 224

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

  const displayStatus = phase === 'recording' ? 'recording' : phase === 'stopped' ? 'stopped' : 'idle'
  const timerValue = phase === 'idle' ? 0 : elapsedSeconds

  return (
    <>
      <RecordSurface>
        <Content>
          <Intro>
            <BrandTitle>Little Moments</BrandTitle>
            <Subtitle>Capture a small moment</Subtitle>
          </Intro>

          <RecorderStack>
            <RecordButton
              status={displayStatus}
              elapsedSec={timerValue}
              maxDurationSec={60}
              onStart={phase === 'idle' ? () => void startRecording() : NOOP}
              onStop={phase === 'recording' ? stopRecording : NOOP}
              diameter={buttonDiameter}
            />

            <Timer>{formatDuration(timerValue)}</Timer>
            {phase === 'recording' ? <SupportText>Listening gently in the background.</SupportText> : null}
            {phase === 'stopped' ? <SupportText>Your recording is ready to save.</SupportText> : null}
            {phase === 'idle' ? <SupportText>A quiet place for memories.</SupportText> : null}
            {phase === 'idle' && errorMessage ? <HintBanner role="status">{errorMessage}</HintBanner> : null}
          </RecorderStack>
        </Content>
      </RecordSurface>

      {phase === 'stopped' && stopDecisionState !== 'hidden' && (
        <ModalOverlay role="presentation">
          <ModalSheet role="dialog" aria-modal="true" aria-label="Save or discard recording">
            <SheetHandle aria-hidden />
            {stopDecisionState === 'choice' ? (
              <>
                <h2>Save this recording?</h2>
                <SupportText>Save now, or discard this moment.</SupportText>
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
                <SupportText>This action cannot be undone.</SupportText>
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
