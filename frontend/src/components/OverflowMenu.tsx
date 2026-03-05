import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

export interface OverflowMenuAction {
  id: string
  label: string
  tone?: 'default' | 'destructive'
  disabled?: boolean
  onSelect: () => void
}

interface OverflowMenuProps {
  actions: OverflowMenuAction[]
  ariaLabel?: string
  disabled?: boolean
}

const Wrap = styled.div`
  position: relative;
`

const TriggerButton = styled.button`
  min-width: ${({ theme }) => theme.layout.minTouchTarget};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  width: ${({ theme }) => theme.layout.minTouchTarget};
  height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`

const Menu = styled.div`
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.space.x1});
  right: 0;
  min-width: 188px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space.x1};
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 30;
`

const MenuItem = styled.button<{ $tone: 'default' | 'destructive' }>`
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: none;
  background: transparent;
  text-align: left;
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  font-size: ${({ theme }) => theme.typography.bodySize};
  color: ${({ theme, $tone }) => ($tone === 'destructive' ? theme.colors.danger : theme.colors.text)};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

export function OverflowMenu({ actions, ariaLabel = 'Member actions', disabled = false }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!open) {
      return
    }

    const onWindowPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', onWindowPointerDown)
    window.addEventListener('keydown', onWindowKeyDown)

    return () => {
      window.removeEventListener('mousedown', onWindowPointerDown)
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    const firstButton = menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    firstButton?.focus()
  }, [open])

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus()
    }
    wasOpenRef.current = open
  }, [open])

  if (actions.length === 0) {
    return null
  }

  return (
    <Wrap ref={wrapRef}>
      <TriggerButton
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        &#8942;
      </TriggerButton>
      {open && (
        <Menu role="menu" ref={menuRef}>
          {actions.map((action) => (
            <MenuItem
              key={action.id}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              $tone={action.tone ?? 'default'}
              onClick={() => {
                action.onSelect()
                setOpen(false)
              }}
            >
              {action.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </Wrap>
  )
}
