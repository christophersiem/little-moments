import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  initialFocusRef?: RefObject<HTMLElement | null>
}

const ANIMATION_MS = 220

const Overlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
`

const Backdrop = styled.button<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  border: none;
  margin: 0;
  padding: 0;
  background: rgba(0, 0, 0, 0.12);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity ${ANIMATION_MS}ms ease;
`

const Panel = styled.section<{ $visible: boolean }>`
  position: fixed;
  left: 50%;
  bottom: 16px;
  width: min(92vw, 360px);
  max-width: 360px;
  height: min(55vh, 520px);
  max-height: 75vh;
  background: ${({ theme }) => theme.colors.surfaceStrong};
  border: 1px solid rgba(67, 57, 49, 0.1);
  border-radius: 24px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.14), 0 -6px 18px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  transform: ${({ $visible }) =>
    $visible
      ? 'translateX(-50%) translateY(0) scale(1)'
      : 'translateX(-50%) translateY(24px) scale(0.98)'};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition:
    transform ${ANIMATION_MS}ms ease,
    opacity ${ANIMATION_MS}ms ease;
  will-change: transform;
  overflow: hidden;
  pointer-events: auto;

  @media (max-width: 360px) {
    width: 94vw;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Handle = styled.div`
  align-self: center;
  margin-top: ${({ theme }) => theme.space.x2};
  margin-bottom: ${({ theme }) => theme.space.x2};
  width: 36px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: rgba(var(--lm-shadow), 0.18);
`

const Header = styled.header`
  min-height: 48px;
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x4}`};
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid rgba(var(--lm-shadow), 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.x3};
  background: ${({ theme }) => theme.colors.surfaceStrong};
`

const Title = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.h2Size};
  color: ${({ theme }) => theme.colors.text};
`

const CloseButton = styled.button`
  border: none;
  margin: 0;
  padding: 0;
  min-width: ${({ theme }) => theme.layout.minTouchTarget};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
`

const Footer = styled.footer`
  position: sticky;
  bottom: 0;
  border-top: 1px solid rgba(var(--lm-shadow), 0.05);
  background: ${({ theme }) => theme.colors.surfaceStrong};
`

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  )
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function BottomSheet({ open, title, onClose, children, footer, initialFocusRef }: BottomSheetProps) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)
  const panelRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const closeDelay = useMemo(() => (prefersReducedMotion() ? 0 : ANIMATION_MS), [])

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setMounted(true)
      const frame = window.requestAnimationFrame(() => setVisible(true))
      return () => window.cancelAnimationFrame(frame)
    }

    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), closeDelay)
    return () => window.clearTimeout(timer)
  }, [closeDelay, open])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const originalOverflow = document.body.style.overflow
    const originalTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.touchAction = originalTouchAction
    }
  }, [mounted])

  useEffect(() => {
    if (!open || !mounted) {
      return
    }

    const timer = window.setTimeout(() => {
      const target = initialFocusRef?.current
      if (target) {
        target.focus()
        return
      }
      const panel = panelRef.current
      if (!panel) {
        return
      }
      const first = getFocusableElements(panel)[0]
      ;(first ?? panel).focus()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [initialFocusRef, mounted, open])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const panel = panelRef.current
      if (!panel) {
        return
      }

      const focusable = getFocusableElements(panel)
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (!active || active === first || !panel.contains(active)) {
          event.preventDefault()
          last.focus()
        }
        return
      }

      if (active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mounted, onClose])

  useEffect(() => {
    if (open) {
      return
    }
    const trigger = triggerRef.current
    if (!trigger) {
      return
    }
    const timer = window.setTimeout(() => {
      trigger.focus()
    }, closeDelay)
    return () => window.clearTimeout(timer)
  }, [closeDelay, open])

  if (!mounted) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const sheetContent = (
    <Overlay $visible={visible}>
      <Backdrop type="button" $visible={visible} onClick={onClose} aria-label={`Close ${title}`} />
      <Panel
        ref={panelRef}
        $visible={visible}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <Handle aria-hidden />
        <Header>
          <Title id={titleId}>{title}</Title>
          <CloseButton type="button" onClick={onClose} aria-label={`Close ${title}`}>
            ✕
          </CloseButton>
        </Header>
        <Content>{children}</Content>
        {footer ? <Footer>{footer}</Footer> : null}
      </Panel>
    </Overlay>
  )

  return createPortal(sheetContent, document.body)
}
