import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BOTTOM_NAVIGATION_ITEMS } from '../app/navigation'
import { APP_ROUTES } from '../app/routes'
import { TopNav } from './TopNav'
import { renderWithProviders } from '../test/renderWithProviders'

describe('TopNav', () => {
  it('navigates between memories, record and settings', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    renderWithProviders(
      <TopNav pathname={APP_ROUTES.memories} navigate={navigate} items={BOTTOM_NAVIGATION_ITEMS} canRecord />,
    )

    await user.click(screen.getByRole('button', { name: /record/i }))
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /memories/i }))

    expect(navigate).toHaveBeenNthCalledWith(1, APP_ROUTES.record)
    expect(navigate).toHaveBeenNthCalledWith(2, APP_ROUTES.settings)
    expect(navigate).toHaveBeenNthCalledWith(3, APP_ROUTES.memories)
  })

  it('blocks navigation while recording lock is active', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()
    const onLockedNavigationAttempt = vi.fn()

    renderWithProviders(
      <TopNav
        pathname={APP_ROUTES.record}
        navigate={navigate}
        items={BOTTOM_NAVIGATION_ITEMS}
        canRecord
        navigationLocked
        onLockedNavigationAttempt={onLockedNavigationAttempt}
      />,
    )

    const memoriesButton = screen.getByRole('button', { name: /memories/i })
    expect(memoriesButton).toHaveAttribute('aria-disabled', 'true')

    await user.click(memoriesButton)

    expect(onLockedNavigationAttempt).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('blocks record navigation when user has no record permission', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()
    const onLockedNavigationAttempt = vi.fn()

    renderWithProviders(
      <TopNav
        pathname={APP_ROUTES.memories}
        navigate={navigate}
        items={BOTTOM_NAVIGATION_ITEMS}
        canRecord={false}
        onLockedNavigationAttempt={onLockedNavigationAttempt}
      />,
    )

    const recordButton = screen.getByRole('button', { name: /record/i })
    expect(recordButton).toHaveAttribute('aria-disabled', 'true')

    await user.click(recordButton)

    expect(onLockedNavigationAttempt).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
  })
})
