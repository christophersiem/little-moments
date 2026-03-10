import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_ROUTES } from '../app/routes'
import { renderWithProviders } from '../test/renderWithProviders'
import { SettingsPage } from './SettingsPage'

describe('SettingsPage appearance selector', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('keeps only the selected radio option tabbable', () => {
    window.localStorage.setItem('lm-appearance', 'dark')

    renderWithProviders(<SettingsPage navigate={vi.fn()} onLogout={vi.fn()} />)

    const systemOption = screen.getByRole('radio', { name: 'System' })
    const lightOption = screen.getByRole('radio', { name: 'Light' })
    const darkOption = screen.getByRole('radio', { name: 'Dark' })

    expect(systemOption).toHaveAttribute('tabindex', '-1')
    expect(lightOption).toHaveAttribute('tabindex', '-1')
    expect(darkOption).toHaveAttribute('tabindex', '0')
    expect(darkOption).toHaveAttribute('aria-checked', 'true')
  })

  it('supports arrow-key roving selection and updates mode', async () => {
    window.localStorage.setItem('lm-appearance', 'dark')

    renderWithProviders(<SettingsPage navigate={vi.fn()} onLogout={vi.fn()} />)

    const systemOption = screen.getByRole('radio', { name: 'System' })
    const lightOption = screen.getByRole('radio', { name: 'Light' })
    const darkOption = screen.getByRole('radio', { name: 'Dark' })

    darkOption.focus()
    fireEvent.keyDown(darkOption, { key: 'ArrowRight' })

    await waitFor(() => expect(systemOption).toHaveFocus())
    expect(systemOption).toHaveAttribute('aria-checked', 'true')
    expect(window.localStorage.getItem('lm-appearance')).toBeNull()

    fireEvent.keyDown(systemOption, { key: 'ArrowRight' })

    await waitFor(() => expect(lightOption).toHaveFocus())
    expect(lightOption).toHaveAttribute('aria-checked', 'true')
    expect(window.localStorage.getItem('lm-appearance')).toBe('light')
  })

  it('still navigates to account settings', () => {
    const navigate = vi.fn()

    renderWithProviders(<SettingsPage navigate={navigate} onLogout={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /account/i }))
    expect(navigate).toHaveBeenCalledWith(APP_ROUTES.settingsAccount)
  })
})
