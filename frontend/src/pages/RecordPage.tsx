import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { APP_ROUTES } from '../app/routes'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { RecordButton } from '../components/RecordButton'
import { MAX_RECORDING_SECONDS, SHORT_TRANSCRIPT_MESSAGE } from '../features/memories/constants'
import { startDemoMemoryUpload, startMemoryUpload } from '../features/memories/hooks/uploadSessionStore'
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
  durationSeconds: number
}

const NOOP = () => undefined
const MIN_RECORDING_SECONDS = 3
const MIN_RECORDING_BYTES = 10000
const SHORT_HINT_DISPLAY_MS = 5200
const MAX_DURATION_HINT = `Max ${MAX_RECORDING_SECONDS}s`
const DEMO_DURATION_SECONDS = 8
const DEMO_TRANSCRIPT_TEMPLATE =
  'During bedtime, he remembered the story from yesterday and corrected me when I changed one part. Then he added his own ending and asked me to repeat it with his words. He noticed small details I had forgotten, like the color of the blanket and the name of the little fox in the story, and he smiled every time I got it right. After that, he acted out a few scenes with his stuffed bear and used clear full sentences to explain what should happen next. The whole routine felt calm and connected, and it showed strong memory, language growth, and growing confidence in expressing his ideas.'
const RECORDER_MIME_PREFERENCES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined
  }
  return RECORDER_MIME_PREFERENCES.find((value) => MediaRecorder.isTypeSupported(value))
}
const RECORDING_HINT_FADE_DELAY_MS = 3400

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
  position: relative;
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
  gap: ${({ theme }) => theme.space.x2};
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
  top: calc(100% + ${({ theme }) => theme.space.x5});
  left: 50%;
  transform: translateX(-50%);
  width: min(320px, calc(100vw - 48px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const Timer = styled.div`
  font-size: calc(${({ theme }) => theme.typography.timerSize} - 1.2rem);
  letter-spacing: 0.08em;
  color: ${({ theme }) => `color-mix(in srgb, ${theme.colors.text} 88%, ${theme.colors.textMuted})`};
`

const BodyText = styled.p<{ $dimmed?: boolean; $reducedMotion?: boolean }>`
  max-width: 280px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.bodySize};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.35 : 1)};
  transition: ${({ $reducedMotion }) => ($reducedMotion ? 'none' : 'opacity 760ms ease-in-out')};
`

const HelperText = styled.p`
  max-width: 280px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const InlineNotice = styled.p`
  width: min(360px, calc(100vw - 48px));
  margin: ${({ theme }) => `${theme.space.x2} 0 0`};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  border: 1px solid ${({ theme }) => theme.colors.accentStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  text-align: center;
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

const SheetValidationText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const UtilityRegion = styled.div`
  position: absolute;
  top: clamp(14px, 3.2vh, 24px);
  right: clamp(12px, 3.8vw, 20px);
  width: min(304px, calc(100vw - 36px));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space.x2};
  z-index: 7;
`

const UtilityBar = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;
`

const UtilityButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.colors.surfaceStrong} 72%, transparent)`};
  color: ${({ theme }) => theme.colors.textMuted};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: none;
  opacity: 0.76;
  transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => `color-mix(in srgb, ${theme.colors.surfaceStrong} 82%, transparent)`};
    opacity: 0.95;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
    opacity: 1;
  }
`

const UtilityIcon = styled.svg`
  width: 18px;
  height: 18px;
`

const UtilityMenu = styled.section`
  width: 100%;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme }) => theme.space.x2};
`

const UtilityMenuTitle = styled.p`
  margin: 0 0 ${({ theme }) => theme.space.x1};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.73rem;
  letter-spacing: 0.02em;
`

const PreferenceRow = styled.button<{ $checked: boolean }>`
  width: 100%;
  min-height: 56px;
  border: 1px solid ${({ theme, $checked }) => ($checked ? theme.colors.accentStrong : theme.colors.border)};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x2}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x2};
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, background-color 180ms ease;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const PreferenceText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const PreferenceLabel = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.2;
`

const PreferenceDescription = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.76rem;
  line-height: 1.35;
`

const DemoSection = styled.div`
  margin-top: ${({ theme }) => theme.space.x2};
  padding-top: ${({ theme }) => theme.space.x2};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const DemoLabel = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.86rem;
  font-weight: 500;
`

const DemoTextArea = styled.textarea`
  width: 100%;
  min-height: 108px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: ${({ theme }) => theme.typography.secondarySize};
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
`

const PreferenceTrack = styled.span<{ $checked: boolean }>`
  flex-shrink: 0;
  width: 46px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme, $checked }) => ($checked ? theme.colors.accentStrong : theme.colors.border)};
  background: ${({ theme, $checked }) => ($checked ? theme.colors.accent : theme.colors.border)};
  position: relative;
  transition: background-color 200ms ease, border-color 200ms ease;
`

const PreferenceThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme, $checked }) => ($checked ? theme.colors.onAccent : theme.colors.surfaceStrong)};
  box-shadow: 0 1px 2px rgba(48, 39, 33, 0.2);
  transform: translateX(${({ $checked }) => ($checked ? '20px' : '0')});
  transition: transform 220ms cubic-bezier(0.22, 0.9, 0.35, 1), background-color 200ms ease;
`

export function RecordPage({ navigate, childId, onNavigationLockChange }: RecordPageProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const latestRecordingRef = useRef<RecordingPayload | null>(null)
  const intervalRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)
  const preferenceMenuRef = useRef<HTMLDivElement | null>(null)

  const [phase, setPhase] = useState<RecordPhase>('idle')
  const [stopDecisionState, setStopDecisionState] = useState<StopDecisionState>('hidden')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [recordingNotice, setRecordingNotice] = useState('')
  const [keepAudio, setKeepAudio] = useState(false)
  const [demoModeEnabled, setDemoModeEnabled] = useState(false)
  const [demoTranscript, setDemoTranscript] = useState(DEMO_TRANSCRIPT_TEMPLATE)
  const [showRecordingOptions, setShowRecordingOptions] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 390 : window.innerWidth,
  )
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [recordingHintDimmed, setRecordingHintDimmed] = useState(false)

  const largeButtonDiameter = viewportWidth < 390 ? 176 : 196
  const stoppedButtonDiameter = viewportWidth < 390 ? 90 : 98

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
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setPrefersReducedMotion(mediaQuery.matches)
    setPrefersReducedMotion(mediaQuery.matches)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange)
      return () => mediaQuery.removeEventListener('change', onChange)
    }

    mediaQuery.addListener(onChange)
    return () => mediaQuery.removeListener(onChange)
  }, [])
  
  useEffect(() => {
    if (phase !== 'idle' || !errorMessage) {
      return
    }
    const timer = window.setTimeout(() => setErrorMessage(''), SHORT_HINT_DISPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [errorMessage, phase])

  useEffect(() => {
    if (!recordingNotice) {
      return
    }
    const timer = window.setTimeout(() => setRecordingNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [recordingNotice])

  useEffect(() => {
    onNavigationLockChange?.(phase === 'recording')
  }, [onNavigationLockChange, phase])

  useEffect(() => {
    if (phase !== 'idle') {
      setShowRecordingOptions(false)
    }
  }, [phase])

  useEffect(() => {
    if (!showRecordingOptions) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (preferenceMenuRef.current?.contains(target)) {
        return
      }
      setShowRecordingOptions(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowRecordingOptions(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showRecordingOptions])

  useEffect(() => {
    elapsedRef.current = elapsedSeconds
  }, [elapsedSeconds])

  useEffect(() => {
    if (phase !== 'recording') {
      setRecordingHintDimmed(false)
      return
    }

    if (prefersReducedMotion) {
      setRecordingHintDimmed(true)
      return
    }

    setRecordingHintDimmed(false)
    const fadeTimer = window.setTimeout(() => setRecordingHintDimmed(true), RECORDING_HINT_FADE_DELAY_MS)
    return () => window.clearTimeout(fadeTimer)
  }, [phase, prefersReducedMotion])

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
    setRecordingNotice('')
    setElapsedSeconds(0)
    elapsedRef.current = 0
    setStopDecisionState('hidden')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const preferredMimeType = pickRecorderMimeType()
      const recorder = preferredMimeType ? new MediaRecorder(stream, { mimeType: preferredMimeType }) : new MediaRecorder(stream)
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
        latestRecordingRef.current = {
          blob,
          recordedAt: recordingEndedAt,
          durationSeconds: Math.max(elapsedRef.current, 1),
        }
        setPhase('stopped')
        setStopDecisionState(transitionStopDecision('hidden', 'recording-stopped').state)
      }

      recorder.start(300)
      setPhase('recording')
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((current) => {
          const next = current + 1
          if (next >= MAX_RECORDING_SECONDS) {
            window.setTimeout(() => {
              stopRecording()
              setRecordingNotice(`Stopped at ${MAX_RECORDING_SECONDS} seconds (max).`)
            }, 0)
          }
          return Math.min(next, MAX_RECORDING_SECONDS)
        })
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

      const session = startMemoryUpload(
        latestRecordingRef.current.blob,
        latestRecordingRef.current.recordedAt,
        childId,
        keepAudio,
        latestRecordingRef.current.durationSeconds,
      )
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

  const saveBlockedForShortRecording =
    stopDecisionState === 'choice' &&
    Boolean(latestRecordingRef.current) &&
    isLikelyTooShort(latestRecordingRef.current.blob, elapsedSeconds)

  const onSubmitDemoTranscript = () => {
    const normalizedTranscript = demoTranscript.trim()
    if (!normalizedTranscript) {
      setErrorMessage('Demo transcript is empty.')
      return
    }
    if (!childId) {
      setErrorMessage('No child selected for this memory.')
      return
    }

    setErrorMessage('')
    setRecordingNotice('')
    const recordedAt = new Date().toISOString()
    const session = startDemoMemoryUpload(
      normalizedTranscript,
      recordedAt,
      childId,
      DEMO_DURATION_SECONDS,
    )
    navigate(APP_ROUTES.memories)
    window.history.replaceState(
      {},
      '',
      `${APP_ROUTES.memories}?pending=${encodeURIComponent(session.clientId)}`,
    )
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
    const dimHelperText = prefersReducedMotion || recordingHintDimmed

    return (
      <CenterStage>
        <CenterHero>
          <RecordAnchor>
            <RecordButton
              status="recording"
              elapsedSec={elapsedSeconds}
              maxDurationSec={MAX_RECORDING_SECONDS}
              onStart={NOOP}
              onStop={stopRecording}
              diameter={largeButtonDiameter}
            />
            <RecordingMeta>
              <Timer>{formatDuration(elapsedSeconds)}</Timer>
              <BodyText $dimmed={dimHelperText} $reducedMotion={prefersReducedMotion}>
                Speak naturally. We&apos;ll take care of the rest.
              </BodyText>
              <HelperText>{MAX_DURATION_HINT}</HelperText>
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
              maxDurationSec={MAX_RECORDING_SECONDS}
              onStart={NOOP}
              onStop={NOOP}
              diameter={stoppedButtonDiameter}
            />
            <BodyText>Your recording is ready to save.</BodyText>
            {recordingNotice && <InlineNotice role="status">{recordingNotice}</InlineNotice>}
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
                  <PrivacyText>
                    {keepAudio
                      ? 'Audio will be kept so you can replay the original recording.'
                      : 'Audio is transcribed to text and not stored as audio.'}
                  </PrivacyText>
                  <SheetActions>
                    <Button
                      variant="primary"
                      fullWidth
                      autoFocus
                      disabled={saveBlockedForShortRecording}
                      onClick={() => onStopDecision('save-selected')}
                    >
                      Save recording
                    </Button>
                    <Button
                      fullWidth
                      onClick={() =>
                        onStopDecision(saveBlockedForShortRecording ? 'discard-confirmed' : 'discard-selected')
                      }
                    >
                      Discard recording
                    </Button>
                  </SheetActions>
                  {saveBlockedForShortRecording && <SheetValidationText>{SHORT_TRANSCRIPT_MESSAGE}</SheetValidationText>}
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
        <UtilityRegion ref={preferenceMenuRef}>
          <UtilityBar>
            <UtilityButton
              type="button"
              aria-label="Recording options"
              aria-expanded={showRecordingOptions}
              aria-haspopup="dialog"
              onClick={() => setShowRecordingOptions((current) => !current)}
            >
              <UtilityIcon viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 8.75C10.21 8.75 8.75 10.21 8.75 12C8.75 13.79 10.21 15.25 12 15.25C13.79 15.25 15.25 13.79 15.25 12C15.25 10.21 13.79 8.75 12 8.75Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 12C19 11.48 18.95 10.98 18.84 10.5L20.5 9.21L18.79 6.29L16.77 7.03C16.02 6.39 15.13 5.92 14.16 5.67L13.85 3.5H10.15L9.84 5.67C8.87 5.92 7.98 6.39 7.23 7.03L5.21 6.29L3.5 9.21L5.16 10.5C5.05 10.98 5 11.48 5 12C5 12.52 5.05 13.02 5.16 13.5L3.5 14.79L5.21 17.71L7.23 16.97C7.98 17.61 8.87 18.08 9.84 18.33L10.15 20.5H13.85L14.16 18.33C15.13 18.08 16.02 17.61 16.77 16.97L18.79 17.71L20.5 14.79L18.84 13.5C18.95 13.02 19 12.52 19 12Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </UtilityIcon>
            </UtilityButton>
          </UtilityBar>
          {showRecordingOptions ? (
            <UtilityMenu role="region" aria-label="Recording options">
              <UtilityMenuTitle>Recording options</UtilityMenuTitle>
              <PreferenceRow
                type="button"
                role="switch"
                aria-checked={keepAudio}
                aria-label="Keep original audio"
                $checked={keepAudio}
                onClick={() => setKeepAudio((current) => !current)}
              >
                <PreferenceText>
                  <PreferenceLabel>Keep original audio</PreferenceLabel>
                  <PreferenceDescription>Optional. Keep the voice note so you can replay it later.</PreferenceDescription>
                </PreferenceText>
                <PreferenceTrack $checked={keepAudio} aria-hidden>
                  <PreferenceThumb $checked={keepAudio} />
                </PreferenceTrack>
              </PreferenceRow>
              <DemoSection>
                <PreferenceRow
                  type="button"
                  role="switch"
                  aria-checked={demoModeEnabled}
                  aria-label="Demo mode"
                  $checked={demoModeEnabled}
                  onClick={() => setDemoModeEnabled((current) => !current)}
                >
                  <PreferenceText>
                    <PreferenceLabel>Demo mode</PreferenceLabel>
                    <PreferenceDescription>Send a prepared transcript without recording audio.</PreferenceDescription>
                  </PreferenceText>
                  <PreferenceTrack $checked={demoModeEnabled} aria-hidden>
                    <PreferenceThumb $checked={demoModeEnabled} />
                  </PreferenceTrack>
                </PreferenceRow>
                {demoModeEnabled ? (
                  <>
                    <DemoLabel>Demo transcript</DemoLabel>
                    <DemoTextArea
                      value={demoTranscript}
                      onChange={(event) => setDemoTranscript(event.target.value)}
                      aria-label="Demo transcript"
                    />
                    <Button type="button" variant="primary" fullWidth onClick={onSubmitDemoTranscript}>
                      Send demo transcript
                    </Button>
                  </>
                ) : null}
              </DemoSection>
            </UtilityMenu>
          ) : null}
        </UtilityRegion>
        <RecordButton
          status="idle"
          elapsedSec={0}
          maxDurationSec={MAX_RECORDING_SECONDS}
          onStart={() => void startRecording()}
          onStop={NOOP}
          diameter={largeButtonDiameter}
        />
        {recordingNotice && <InlineNotice role="status">{recordingNotice}</InlineNotice>}
        {errorMessage && <HintBanner role="status">{errorMessage}</HintBanner>}
      </CenterHero>
    </CenterStage>
  )
}
