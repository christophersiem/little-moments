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

const idleButtonBreath = keyframes`
  0% {
    transform: scale(1);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  30% {
    transform: scale(1.045);
    animation-timing-function: linear;
  }
  40% {
    transform: scale(1.045);
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  70% {
    transform: scale(1);
    animation-timing-function: linear;
  }
  100% {
    transform: scale(1);
  }
`

const idleHaloBreath = keyframes`
  0% {
    opacity: 0.26;
    box-shadow:
      0 0 0 7px color-mix(in srgb, var(--lm-accent) 10%, transparent),
      0 10px 18px rgba(var(--lm-shadow-rgb), 0.11);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  30% {
    opacity: 0.58;
    box-shadow:
      0 0 0 17px color-mix(in srgb, var(--lm-accent) 18%, transparent),
      0 12px 22px rgba(var(--lm-shadow-rgb), 0.17);
    animation-timing-function: linear;
  }
  40% {
    opacity: 0.58;
    box-shadow:
      0 0 0 17px color-mix(in srgb, var(--lm-accent) 18%, transparent),
      0 12px 22px rgba(var(--lm-shadow-rgb), 0.17);
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  70% {
    opacity: 0.26;
    box-shadow:
      0 0 0 7px color-mix(in srgb, var(--lm-accent) 10%, transparent),
      0 10px 18px rgba(var(--lm-shadow-rgb), 0.11);
    animation-timing-function: linear;
  }
  100% {
    opacity: 0.26;
    box-shadow:
      0 0 0 7px color-mix(in srgb, var(--lm-accent) 10%, transparent),
      0 10px 18px rgba(var(--lm-shadow-rgb), 0.11);
  }
`

const recordingHaloPulse = keyframes`
  0%, 100% {
    opacity: 0.34;
  }
  50% {
    opacity: 0.5;
  }
`

const Root = styled.div`
  --lm-accent: ${({ theme }) => theme.colors.accent};
  --lm-accent-strong: ${({ theme }) => theme.colors.accentStrong};
  --lm-accent-contrast: ${({ theme }) => theme.colors.onAccent};
  --lm-bg: ${({ theme }) => theme.colors.background};
  --lm-surface: ${({ theme }) => theme.colors.surfaceStrong};
  --lm-border: ${({ theme }) => theme.colors.border};
  --lm-text: ${({ theme }) => theme.colors.text};
  --lm-muted: ${({ theme }) => theme.colors.textMuted};
  --lm-shadow-rgb: var(--lm-shadow);

  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--lm-text);
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
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--lm-accent) 40%, transparent);
    outline-offset: 5px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      transform: translateY(-1px);
    }
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
      transform-origin: center;
      animation: ${idleButtonBreath} 8s infinite;
      will-change: transform;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
`

const Halo = styled.span<{ $state: VisualState }>`
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--lm-accent) 30%, transparent);
  pointer-events: none;

  ${({ $state }) =>
    $state === 'idle' &&
    css`
      transform-origin: center;
      animation: ${idleHaloBreath} 8s infinite;
    `}

  ${({ $state }) =>
    $state === 'recording' &&
    css`
      box-shadow:
        0 0 0 10px color-mix(in srgb, var(--lm-accent) 12%, transparent),
        0 10px 18px rgba(var(--lm-shadow-rgb), 0.16);
      animation: ${recordingHaloPulse} 1.8s ease-in-out infinite;
    `}

  ${({ $state }) =>
    $state === 'stopped' &&
    css`
      opacity: 0.14;
      box-shadow: 0 8px 14px rgba(var(--lm-shadow-rgb), 0.1);
    `}

  transition: opacity 260ms ease, box-shadow 260ms ease;

  @media (hover: hover) and (pointer: fine) {
    ${TapTarget}:hover:not(:disabled) & {
      box-shadow:
        0 0 0 12px color-mix(in srgb, var(--lm-accent) 14%, transparent),
        0 14px 22px rgba(var(--lm-shadow-rgb), 0.18);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const SoftOuterRing = styled.span<{ $state: VisualState }>`
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid
    ${({ $state }) =>
      $state === 'recording'
        ? 'color-mix(in srgb, var(--lm-accent-strong) 75%, transparent)'
        : $state === 'stopped'
          ? 'color-mix(in srgb, var(--lm-border) 78%, var(--lm-accent))'
          : 'color-mix(in srgb, var(--lm-accent) 52%, transparent)'};
  pointer-events: none;
`

const Core = styled.span<{ $state: VisualState; $disabled: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid
    ${({ $state }) =>
      $state === 'recording'
        ? 'color-mix(in srgb, var(--lm-accent-strong) 78%, var(--lm-accent))'
        : $state === 'stopped'
          ? 'color-mix(in srgb, var(--lm-border) 80%, var(--lm-accent))'
          : 'color-mix(in srgb, var(--lm-accent) 66%, transparent)'};
  background: ${({ $state }) =>
    $state === 'recording'
      ? 'color-mix(in srgb, var(--lm-accent-strong) 78%, var(--lm-accent))'
      : $state === 'stopped'
        ? 'color-mix(in srgb, var(--lm-surface) 94%, var(--lm-border))'
        : 'var(--lm-accent)'};
  box-shadow: 0 10px 18px rgba(var(--lm-shadow-rgb), ${({ $disabled }) => ($disabled ? 0.1 : 0.16)});
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`

const LogoMark = styled(RippleLogo)<{ $size: number; $state: VisualState }>`
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  display: block;
  color: var(--lm-bg);
  opacity: ${({ $state }) => ($state === 'recording' ? 1 : 0.98)};
  transition: color 220ms ease, opacity 220ms ease;
`

const SpinnerRow = styled.div`
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
  color: var(--lm-muted);
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--lm-muted) 22%, transparent);
  border-top-color: var(--lm-accent-strong);
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
  color: var(--lm-text);
`

const Helper = styled.p`
  margin-top: 8px;
  color: var(--lm-muted);
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
  const logoSize = Math.round(Math.max(diameter * 0.34, 24))

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
        $hitSize={Math.max(diameter + 12, 72)}
        $disabled={disabled}
        disabled={disabled}
        aria-label={isRecording ? ariaLabelRecording : ariaLabelIdle}
        aria-pressed={isRecording}
        onClick={onActivate}
      >
        <Visual $diameter={diameter} $state={visualState}>
          <Halo $state={visualState} />
          <SoftOuterRing $state={visualState} />
          <Core $state={visualState} $disabled={disabled}>
            <LogoMark
              $size={logoSize}
              $state={visualState}
              animate={isRecording ? 'recording' : visualState === 'stopped' ? 'stopped' : 'idle'}
            />
          </Core>
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
