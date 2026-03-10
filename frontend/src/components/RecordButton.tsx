import { useRef } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { RippleLogo } from './RippleLogo'

export type RecordButtonStatus = 'idle' | 'recording' | 'stopped' | 'processing' | 'disabled'

export interface RecordButtonProps {
  status: RecordButtonStatus
  maxDurationSec?: number
  elapsedSec: number
  onStart: () => void
  onStop: () => void
  ariaLabelIdle?: string
  ariaLabelRecording?: string
  diameter?: number
  title?: string
  helperText?: string
}

type VisualState = 'idle' | 'recording' | 'stopped'

const RECORDING_TAP_DEBOUNCE_MS = 300

const idleBreath = keyframes`
  0% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.018);
  }
  100% {
    transform: scale(1);
  }
`

const idleGlow = keyframes`
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.68;
  }
  100% {
    opacity: 0.5;
  }
`

const recordingPulse = keyframes`
  0%, 100% {
    opacity: 0.78;
    transform: scale(1);
  }
  50% {
    opacity: 0.92;
    transform: scale(1.012);
  }
`

const Root = styled.div`
  --record-shell: color-mix(in srgb, ${({ theme }) => theme.colors.surfaceStrong} 88%, #fff);
  --record-shell-edge: color-mix(in srgb, ${({ theme }) => theme.colors.border} 84%, ${({ theme }) => theme.colors.background});
  --record-inner: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 92%, #fff);
  --record-accent: ${({ theme }) => theme.colors.accentStrong};
  --record-icon: color-mix(in srgb, ${({ theme }) => theme.colors.accentStrong} 82%, ${({ theme }) => theme.colors.text});

  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
`

const TapTarget = styled.button<{ $hitSize: number; $disabled: boolean }>`
  width: ${({ $hitSize }) => `${$hitSize}px`};
  height: ${({ $hitSize }) => `${$hitSize}px`};
  max-width: 100%;
  max-height: 100%;
  min-width: 72px;
  min-height: 72px;
  border: none;
  background: transparent;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);

  &:active:not(:disabled) {
    transform: scale(0.982);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--record-accent) 65%, transparent);
    outline-offset: 5px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Visual = styled.span<{ $diameter: number; $state: VisualState }>`
  position: relative;
  width: ${({ $diameter }) => `${$diameter}px`};
  height: ${({ $diameter }) => `${$diameter}px`};
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ${({ $state }) =>
    $state === 'idle' &&
    css`
      animation: ${idleBreath} 6.5s ease-in-out infinite;
      will-change: transform;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
`

const AmbientGlow = styled.span<{ $state: VisualState }>`
  position: absolute;
  inset: -24px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.82) 0%,
    rgba(249, 241, 228, 0.44) 42%,
    rgba(244, 236, 223, 0) 76%
  );
  opacity: ${({ $state }) => ($state === 'recording' ? 0.72 : 0.56)};

  ${({ $state }) =>
    $state === 'idle' &&
    css`
      animation: ${idleGlow} 6.5s ease-in-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const OuterRing = styled.span<{ $state: VisualState }>`
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--record-shell-edge) 88%, #fff);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 18px 28px rgba(var(--lm-shadow), 0.1);
  pointer-events: none;

  ${({ $state }) =>
    $state === 'recording' &&
    css`
      border-color: color-mix(in srgb, var(--record-accent) 35%, var(--record-shell-edge));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        0 20px 30px rgba(var(--lm-shadow), 0.14),
        0 0 0 8px color-mix(in srgb, var(--record-accent) 11%, transparent);
      animation: ${recordingPulse} 1.6s ease-in-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const OuterPlate = styled.span<{ $state: VisualState }>`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--record-shell-edge) 88%, #fff);
  background: linear-gradient(180deg, var(--record-shell), color-mix(in srgb, var(--record-shell) 88%, ${({ theme }) => theme.colors.background}));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    inset 0 -10px 18px rgba(154, 127, 98, 0.12),
    0 14px 24px rgba(var(--lm-shadow), 0.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ${({ $state }) =>
    $state === 'stopped' &&
    css`
      opacity: 0.9;
    `}
`

const InnerPlate = styled.span<{ $state: VisualState }>`
  position: relative;
  width: calc(100% - 30px);
  height: calc(100% - 30px);
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--record-shell-edge) 72%, #fff);
  background: ${({ $state }) =>
    $state === 'recording'
      ? 'linear-gradient(180deg, color-mix(in srgb, #fff 84%, #f6e9d8), color-mix(in srgb, #f2e3cc 62%, #f7eee2))'
      : 'linear-gradient(180deg, var(--record-inner), color-mix(in srgb, var(--record-inner) 84%, #f3e7d8))'};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    inset 0 -6px 12px rgba(173, 145, 112, 0.11),
    0 8px 14px rgba(var(--lm-shadow), 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const Accent = styled.svg<{ $state: VisualState }>`
  position: absolute;
  top: 18%;
  left: 56%;
  width: 76px;
  height: 38px;
  transform: translateX(-50%);
  color: color-mix(in srgb, ${({ theme }) => theme.colors.textMuted} 70%, ${({ theme }) => theme.colors.accentStrong});
  opacity: ${({ $state }) => ($state === 'recording' ? 0.72 : 0.56)};
  pointer-events: none;
`

const LogoMark = styled(RippleLogo)<{ $size: number }>`
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  color: var(--record-icon);
  transform: translateY(4px);
`

const SpinnerRow = styled.div`
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.textMuted} 24%, transparent);
  border-top-color: ${({ theme }) => theme.colors.accentStrong};
  animation: spin 900ms linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`

const Title = styled.p`
  margin-top: 16px;
  color: ${({ theme }) => theme.colors.text};
`

const Helper = styled.p`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.textMuted};
  max-width: 280px;
`

export function RecordButton({
  status,
  maxDurationSec,
  elapsedSec,
  onStart,
  onStop,
  ariaLabelIdle = 'Start recording',
  ariaLabelRecording = 'Stop recording',
  diameter = 96,
  title,
  helperText,
}: RecordButtonProps) {
  const lastRecordingTapRef = useRef(0)

  void maxDurationSec
  void elapsedSec

  const isRecording = status === 'recording'
  const isProcessing = status === 'processing'
  const isStopped = status === 'stopped' || status === 'disabled' || status === 'processing'
  const disabled = isStopped || isProcessing
  const visualState: VisualState = isRecording ? 'recording' : isStopped ? 'stopped' : 'idle'
  const logoSize = Math.round(Math.max(diameter * 0.24, 24))

  const onActivate = () => {
    if (status === 'idle') {
      onStart()
      return
    }

    if (status === 'recording') {
      const now = Date.now()
      if (now - lastRecordingTapRef.current < RECORDING_TAP_DEBOUNCE_MS) {
        return
      }
      lastRecordingTapRef.current = now
      onStop()
    }
  }

  return (
    <Root>
      <TapTarget
        type="button"
        $hitSize={Math.max(diameter + 26, 72)}
        $disabled={disabled}
        disabled={disabled}
        aria-label={isRecording ? ariaLabelRecording : ariaLabelIdle}
        aria-pressed={isRecording}
        onClick={onActivate}
      >
        <Visual $diameter={diameter} $state={visualState}>
          <AmbientGlow $state={visualState} />
          <OuterRing $state={visualState} />
          <OuterPlate $state={visualState}>
            <InnerPlate $state={visualState}>
              <Accent viewBox="0 0 76 38" fill="none" aria-hidden $state={visualState}>
                <path
                  d="M4 19C16 10 34 8.5 50 14"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M51 14C58 17.5 63 23.5 64 31"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 14.8C25 16 28.5 18.8 31 22.6"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Accent>
              <LogoMark
                $size={logoSize}
                animate={isRecording ? 'recording' : visualState === 'stopped' ? 'stopped' : 'idle'}
              />
            </InnerPlate>
          </OuterPlate>
        </Visual>
      </TapTarget>

      {isProcessing && (
        <SpinnerRow>
          <Spinner aria-hidden />
          Processing...
        </SpinnerRow>
      )}

      {title ? <Title>{title}</Title> : null}
      {helperText ? <Helper>{helperText}</Helper> : null}
    </Root>
  )
}
