import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin = '0px'
  readonly thresholds: ReadonlyArray<number> = [0]

  disconnect(): void {}

  observe(_target: Element): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  unobserve(_target: Element): void {}
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
