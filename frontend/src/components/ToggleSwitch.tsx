import { useId } from 'react'
import styled from 'styled-components'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  className?: string
}

const RootButton = styled.button`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
  text-align: left;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.md};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.md};
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`

const Row = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x3};
`

const Label = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.96875rem;
  font-weight: 500;
  line-height: 1.2;
`

const Description = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.78125rem;
  opacity: 0.78;
  line-height: 1.4;
`

const Track = styled.span<{ $checked: boolean }>`
  flex-shrink: 0;
  width: 52px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ theme, $checked }) => ($checked ? theme.colors.accentStrong : theme.colors.borderSoft)};
  background: ${({ theme, $checked }) => ($checked ? theme.colors.accent : theme.colors.border)};
  position: relative;
  transition: background-color 220ms ease, border-color 220ms ease;
`

const Thumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme, $checked }) => ($checked ? theme.colors.onAccent : theme.colors.surfaceStrong)};
  box-shadow: 0 1px 3px rgba(48, 39, 33, 0.22);
  transform: translateX(${({ $checked }) => ($checked ? '22px' : '0')});
  transition: transform 240ms cubic-bezier(0.22, 0.9, 0.35, 1), background-color 220ms ease;
`

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: ToggleSwitchProps) {
  const descriptionId = useId()

  const toggle = () => {
    if (disabled) {
      return
    }
    onChange(!checked)
  }

  return (
    <RootButton
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={description ? descriptionId : undefined}
      onClick={toggle}
      disabled={disabled}
      className={className}
    >
      <Row>
        <Label>{label}</Label>
        <Track $checked={checked} aria-hidden>
          <Thumb $checked={checked} />
        </Track>
      </Row>
      {description ? <Description id={descriptionId}>{description}</Description> : null}
    </RootButton>
  )
}
