import { useRef } from 'react'
import styled from 'styled-components'
import { BottomSheet } from '../../../components/BottomSheet'

interface MonthOption {
  key: string
  label: string
}

interface MonthPickerSheetProps {
  open: boolean
  monthOptions: MonthOption[]
  selectedMonth: string
  onSelect: (month: string) => void
  onClose: () => void
}

const List = styled.div`
  overflow-y: auto;
  padding-bottom: ${({ theme }) => theme.space.x2};
`

const Row = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 48px;
  border: none;
  border-bottom: 1px solid rgba(var(--lm-shadow), 0.05);
  background: ${({ theme, $active }) => ($active ? theme.colors.surface : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  padding: ${({ theme }) => `0 ${theme.space.x4}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
`

const Check = styled.span`
  color: ${({ theme }) => theme.colors.accentStrong};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

export function MonthPickerSheet({
  open,
  monthOptions,
  selectedMonth,
  onSelect,
  onClose,
}: MonthPickerSheetProps) {
  const firstRowRef = useRef<HTMLButtonElement | null>(null)

  const rows = [{ key: 'all', label: 'All months' }, ...monthOptions]

  return (
    <BottomSheet open={open} title="Month" onClose={onClose} initialFocusRef={firstRowRef}>
      <List>
        {rows.map((option, index) => (
          <Row
            key={option.key}
            ref={index === 0 ? firstRowRef : undefined}
            type="button"
            $active={selectedMonth === option.key}
            onClick={() => {
              onSelect(option.key)
              onClose()
            }}
          >
            <span>{option.label}</span>
            {selectedMonth === option.key ? <Check aria-hidden>✓</Check> : null}
          </Row>
        ))}
      </List>
    </BottomSheet>
  )
}
