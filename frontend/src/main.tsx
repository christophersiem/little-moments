import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { Providers } from './app/Providers'
import rippleLogoUrl from './assets/logo-ripple-1.svg'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

function setFavicon(href: string): void {
  const linkDefinitions = [
    { selector: 'link[rel="icon"]', rel: 'icon' },
    { selector: 'link[rel="shortcut icon"]', rel: 'shortcut icon' },
    { selector: 'link[rel="apple-touch-icon"]', rel: 'apple-touch-icon' },
  ]

  for (const definition of linkDefinitions) {
    const existing = document.head.querySelector<HTMLLinkElement>(definition.selector)
    if (existing) {
      existing.href = href
      continue
    }

    const link = document.createElement('link')
    link.rel = definition.rel
    link.href = href
    document.head.appendChild(link)
  }
}

setFavicon(rippleLogoUrl)

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
)
