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
    animation-timing-function: cubic-bezier(0.2, 0.72, 0.26, 1);
  }
  42% {
    transform: scale(1.02);
    animation-timing-function: linear;
  }
  72% {
    transform: scale(1);
    animation-timing-function: cubic-bezier(0.24, 0, 0.2, 1);
  }
  100% {
    transform: scale(1);
  }
`

const idleAuraPulse = keyframes`
  0% {
    opacity: 0.48;
  }
  38% {
    opacity: 0.66;
  }
  72% {
    opacity: 0.46;
  }
  100% {
    opacity: 0.48;
  }
`

const recordingHaloPulse = keyframes`
  0%, 100% {
    opacity: 0.78;
    transform: scale(1);
  }
  50% {
    opacity: 0.92;
    transform: scale(1.015);
  }
`

const Root = styled.div`
  --lm-surface: ${({ theme }) => theme.colors.surfaceStrong};
  --lm-shell: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 82%, #fff);
  --lm-shell-shadow: rgba(var(--lm-shadow), 0.2);
  --lm-warm-shadow: rgba(152, 126, 98, 0.22);
  --lm-line: color-mix(in srgb, ${({ theme }) => theme.colors.border} 84%, ${({ theme }) => theme.colors.background});
  --lm-muted: ${({ theme }) => theme.colors.textMuted};
  --lm-accent: ${({ theme }) => theme.colors.accentStrong};

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
    outline: 2px solid color-mix(in srgb, var(--lm-accent) 64%, transparent);
    outline-offset: 4px;
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
      animation: ${idleBreath} 7.2s infinite;
      will-change: transform;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
`

const HaloAura = styled.span<{ $state: VisualState }>`
  position: absolute;
  inset: -30px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(252, 246, 237, 0.58) 42%,
    rgba(250, 242, 230, 0.18) 66%,
    rgba(248, 240, 228, 0) 100%
  );
  opacity: ${({ $state }) => ($state === 'recording' ? 0.75 : 0.6)};

  ${({ $state }) =>
    $state === 'idle' &&
    css`
      animation: ${idleAuraPulse} 7.2s infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const HaloRing = styled.span<{ $state: VisualState }>`
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--lm-line) 84%, #fff);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 22px 34px rgba(var(--lm-shadow), 0.13);
  pointer-events: none;

  ${({ $state }) =>
    $state === 'recording' &&
    css`
      border-color: color-mix(in srgb, var(--lm-accent) 32%, var(--lm-line));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.88),
        0 22px 34px rgba(var(--lm-shadow), 0.16),
        0 0 0 9px color-mix(in srgb, var(--lm-accent) 10%, transparent);
      animation: ${recordingHaloPulse} 1.8s ease-in-out infinite;
    `}

  ${({ $state }) =>
    $state === 'stopped' &&
    css`
      opacity: 0.8;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.82),
        0 16px 24px rgba(var(--lm-shadow), 0.09);
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const OuterPlate = styled.span<{ $state: VisualState }>`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--lm-line) 94%, #fff);
  background: linear-gradient(180deg, var(--lm-shell), color-mix(in srgb, var(--lm-surface) 90%, #f8efe2));
  box-shadow:
    inset 0 2px 2px rgba(255, 255, 255, 0.82),
    inset 0 -12px 18px rgba(173, 147, 117, 0.17),
    0 14px 26px var(--lm-shell-shadow),
    0 28px 40px rgba(120, 98, 76, 0.09);
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ${({ $state }) =>
    $state === 'recording' &&
    css`
      box-shadow:
        inset 0 2px 2px rgba(255, 255, 255, 0.82),
        inset 0 -12px 18px rgba(190, 157, 123, 0.24),
        0 16px 30px var(--lm-shell-shadow),
        0 0 0 8px color-mix(in srgb, var(--lm-accent) 8%, transparent);
    `}
`

const InnerPlate = styled.span<{ $state: VisualState }>`
  position: relative;
  width: calc(100% - 34px);
  height: calc(100% - 34px);
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--lm-line) 82%, #fff);
  background: ${({ $state }) =>
    $state === 'recording'
      ? 'linear-gradient(180deg, color-mix(in srgb, #fff 82%, #f6e9d8), color-mix(in srgb, #f0dfc8 52%, #f7efe4))'
      : 'linear-gradient(180deg, color-mix(in srgb, #fff 86%, #f5ede2), color-mix(in srgb, #f6ebe0 74%, #f0e2d1))'};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    inset 0 -8px 14px rgba(177, 148, 117, 0.11),
    0 8px 18px rgba(var(--lm-shadow), 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const DecorativeAccent = styled.svg<{ $state: VisualState }>`
  position: absolute;
  top: 15%;
  left: 54%;
  width: 82px;
  height: 46px;
  transform: translateX(-50%);
  color: color-mix(in srgb, var(--lm-muted) 72%, #8b7357);
  opacity: ${({ $state }) => ($state === 'recording' ? 0.7 : 0.58)};
  pointer-events: none;
`

const LogoWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(6px);
`

const LogoMark = styled(RippleLogo)<{ $size: number; $state: VisualState }>`
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  display: block;
  color: ${({ $state }) =>
    $state === 'recording' ? 'color-mix(in srgb, #8f7252 80%, #6d5239)' : 'color-mix(in srgb, #8b6f50 82%, #74593f)'};
  opacity: ${({ $state }) => ($state === 'stopped' ? 0.88 : 1)};
  transition: color 220ms ease, opacity 220ms ease;
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
  border: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.textMuted} 26%, transparent);
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
  const logoSize = Math.round(Math.max(diameter * 0.24, 26))

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
        $hitSize={Math.max(diameter + 42, 72)}
        $disabled={disabled}
        disabled={disabled}
        aria-label={isRecording ? ariaLabelRecording : ariaLabelIdle}
        aria-pressed={isRecording}
        onClick={onActivate}
      >
        <Visual $diameter={diameter} $state={visualState}>
          <HaloAura $state={visualState} />
          <HaloRing $state={visualState} />
          <OuterPlate $state={visualState}>
            <InnerPlate $state={visualState}>
              <DecorativeAccent viewBox="0 0 82 46" fill="none" aria-hidden $state={visualState}>
                <path
                  d="M6 23C18 11.5 40 9 59 16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M60 16C67.5 19.5 73 26 74.5 34"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M26 16.5C31.5 17.5 35 20.5 37.5 25"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 19C20 19 24 20.5 27.5 23"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </DecorativeAccent>

              <LogoWrap>
                <LogoMark
                  $size={logoSize}
                  $state={visualState}
                  animate={isRecording ? 'recording' : visualState === 'stopped' ? 'stopped' : 'idle'}
                />
              </LogoWrap>
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
