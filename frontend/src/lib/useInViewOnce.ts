import { useEffect, useMemo, useRef, useState, type RefCallback } from 'react'

interface UseInViewOnceOptions {
  rootMargin?: string
  threshold?: number
}

interface UseInViewOnceResult<T extends Element> {
  ref: RefCallback<T>
  isInView: boolean
}

function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useInViewOnce<T extends Element>({
  rootMargin = '0px 0px -6% 0px',
  threshold = 0.12,
}: UseInViewOnceOptions = {}): UseInViewOnceResult<T> {
  const [isInView, setIsInView] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialReducedMotion)
  const targetRef = useRef<T | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setPrefersReducedMotion(mediaQuery.matches)

    onChange()
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsInView(true)
      return undefined
    }

    if (isInView || typeof IntersectionObserver === 'undefined') {
      if (typeof IntersectionObserver === 'undefined') {
        setIsInView(true)
      }
      return undefined
    }

    const element = targetRef.current
    if (!element) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setIsInView(true)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [isInView, prefersReducedMotion, rootMargin, threshold])

  const ref = useMemo<RefCallback<T>>(
    () => (element) => {
      targetRef.current = element
    },
    [],
  )

  return { ref, isInView }
}
