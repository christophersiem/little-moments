import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AppearanceProvider,
  getStoredAppearanceMode,
  initializeAppearance,
  useAppearance,
} from './appearance'

interface MatchMediaController {
  setMatches: (nextMatches: boolean) => void
}

function mockMatchMedia(initialMatches: boolean): MatchMediaController {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  const mediaQueryList: MediaQueryList = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type, listener) => {
      listeners.add(listener as (event: MediaQueryListEvent) => void)
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener as (event: MediaQueryListEvent) => void)
    },
    addListener: (listener) => {
      listeners.add(listener)
    },
    removeListener: (listener) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => true,
  }

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQueryList))

  return {
    setMatches(nextMatches: boolean) {
      mediaQueryList.matches = nextMatches
      const event = { matches: nextMatches, media: mediaQueryList.media } as MediaQueryListEvent
      listeners.forEach((listener) => listener(event))
      mediaQueryList.onchange?.(event)
    },
  }
}

function AppearanceHarness() {
  const { mode, resolvedTheme, setMode } = useAppearance()

  return (
    <>
      <p data-testid="mode">{mode}</p>
      <p data-testid="resolvedTheme">{resolvedTheme}</p>
      <button type="button" onClick={() => setMode('dark')}>
        Set Dark
      </button>
      <button type="button" onClick={() => setMode('system')}>
        Set System
      </button>
    </>
  )
}

describe('appearance', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('reads only valid stored appearance modes', () => {
    window.localStorage.setItem('lm-appearance', 'dark')
    expect(getStoredAppearanceMode()).toBe('dark')

    window.localStorage.setItem('lm-appearance', 'invalid-mode')
    expect(getStoredAppearanceMode()).toBeNull()
  })

  it('initializes theme from storage or system preference', () => {
    const media = mockMatchMedia(true)

    expect(initializeAppearance()).toBe('system')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    window.localStorage.setItem('lm-appearance', 'light')
    media.setMatches(true)

    expect(initializeAppearance()).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('updates mode, persists choice, and reacts to system changes in provider', () => {
    const media = mockMatchMedia(false)

    render(
      <AppearanceProvider>
        <AppearanceHarness />
      </AppearanceProvider>,
    )

    expect(screen.getByTestId('mode')).toHaveTextContent('system')
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    fireEvent.click(screen.getByRole('button', { name: 'Set Dark' }))
    expect(screen.getByTestId('mode')).toHaveTextContent('dark')
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark')
    expect(window.localStorage.getItem('lm-appearance')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    fireEvent.click(screen.getByRole('button', { name: 'Set System' }))
    expect(screen.getByTestId('mode')).toHaveTextContent('system')
    expect(window.localStorage.getItem('lm-appearance')).toBeNull()
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('light')

    act(() => {
      media.setMatches(true)
    })
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
