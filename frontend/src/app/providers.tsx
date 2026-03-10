import type { ReactNode } from 'react'
import { ThemeProvider } from 'styled-components'
import { AppearanceProvider } from './appearance'
import { GlobalStyle } from '../styles/GlobalStyle'
import { theme } from '../styles/theme'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppearanceProvider>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        {children}
      </ThemeProvider>
    </AppearanceProvider>
  )
}

export const Providers = AppProviders
