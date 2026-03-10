import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { Providers } from '../app/providers'

export function renderWithProviders(element: ReactElement) {
  return render(<Providers>{element}</Providers>)
}
