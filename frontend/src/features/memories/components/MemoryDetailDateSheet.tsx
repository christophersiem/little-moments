import type { RefObject } from 'react'
import styled from 'styled-components'
import { BottomSheet } from '../../../components/BottomSheet'
import { Button } from '../../../components/Button'

interface MemoryDetailDateSheetProps {
  open: boolean
  saving: boolean
  dateInputRef: RefObject<HTMLInputElement | null>
  dateValue: string
  timeValue: string
  onDateChange: (nextValue: string) => void
  onTimeChange: (nextValue: string) => void
  onClose: () => void
  onCancel: () => void
  onSave: () => void
}

const DateSheetContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
  padding: ${({ theme }) => theme.space.x4};
`

const DateField = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const DateTextInput = styled.input`
  min-height: 48px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: 0 ${({ theme }) => theme.space.x3};
  font-size: ${({ theme }) => theme.typography.bodySize};
  font-family: inherit;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const DateSheetFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space.x2};
  padding: ${({ theme }) => theme.space.x3};
`

export function MemoryDetailDateSheet({
  open,
  saving,
  dateInputRef,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  onClose,
  onCancel,
  onSave,
}: MemoryDetailDateSheetProps) {
  return (
    <BottomSheet
      open={open}
      title="Edit date and time"
      onClose={onClose}
      initialFocusRef={dateInputRef}
      footer={
        <DateSheetFooter>
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="button" disabled={saving} onClick={onSave}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DateSheetFooter>
      }
    >
      <DateSheetContent>
        <DateField>
          Date
          <DateTextInput
            ref={dateInputRef}
            type="date"
            value={dateValue}
            onChange={(event) => onDateChange(event.target.value)}
            aria-label="Memory date"
          />
        </DateField>
        <DateField>
          Time
          <DateTextInput
            type="time"
            value={timeValue}
            onChange={(event) => onTimeChange(event.target.value)}
            aria-label="Memory time"
            step={60}
          />
        </DateField>
      </DateSheetContent>
    </BottomSheet>
  )
}
