import styled from 'styled-components'

interface MemoryEditStateActionsProps {
  saveLabel: string
  cancelLabel: string
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

const EditIcon = styled.svg`
  width: 18px;
  height: 18px;
`

const EditStateActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
`

const EditStateIconButton = styled.button<{ $kind: 'save' | 'cancel' }>`
  width: ${({ theme }) => theme.layout.minTouchTarget};
  height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid
    ${({ theme, $kind }) => ($kind === 'save' ? theme.colors.accentStrong : theme.colors.border)};
  background: ${({ theme, $kind }) => ($kind === 'save' ? theme.colors.accent : theme.colors.surfaceStrong)};
  color: ${({ theme, $kind }) => ($kind === 'save' ? theme.colors.onAccent : theme.colors.textMuted)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`

function SaveIcon() {
  return (
    <EditIcon viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 12.5L10 17L18.5 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </EditIcon>
  )
}

function CancelIcon() {
  return (
    <EditIcon viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 7L17 17M17 7L7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </EditIcon>
  )
}

export function MemoryEditStateActions({
  saveLabel,
  cancelLabel,
  saving,
  onSave,
  onCancel,
}: MemoryEditStateActionsProps) {
  return (
    <EditStateActions>
      <EditStateIconButton $kind="save" type="button" aria-label={saveLabel} disabled={saving} onClick={onSave}>
        <SaveIcon />
      </EditStateIconButton>
      <EditStateIconButton
        $kind="cancel"
        type="button"
        aria-label={cancelLabel}
        disabled={saving}
        onClick={onCancel}
      >
        <CancelIcon />
      </EditStateIconButton>
    </EditStateActions>
  )
}
