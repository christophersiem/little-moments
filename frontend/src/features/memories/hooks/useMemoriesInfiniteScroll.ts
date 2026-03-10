import { useEffect, useRef, useState } from 'react'

interface UseMemoriesInfiniteScrollOptions {
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  loadMoreError: string
  loadMore: () => Promise<void>
  groupsLength: number
  selectedMonth: string
  selectedTags: string[]
  highlightsOnly: boolean
}

export function useMemoriesInfiniteScroll({
  hasMore,
  loading,
  loadingMore,
  loadMoreError,
  loadMore,
  groupsLength,
  selectedMonth,
  selectedTags,
  highlightsOnly,
}: UseMemoriesInfiniteScrollOptions) {
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)
  const hasShownLoadMoreHintRef = useRef(false)
  const [nearListEnd, setNearListEnd] = useState(false)
  const [showLoadMoreHint, setShowLoadMoreHint] = useState(false)

  useEffect(() => {
    hasShownLoadMoreHintRef.current = false
    setShowLoadMoreHint(false)
  }, [highlightsOnly, selectedMonth, selectedTags])

  useEffect(() => {
    const node = loadMoreSentinelRef.current
    if (!node) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setNearListEnd(Boolean(entries[0]?.isIntersecting))
      },
      {
        root: null,
        rootMargin: '0px 0px 220px 0px',
        threshold: 0,
      },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [groupsLength, hasMore])

  useEffect(() => {
    if (!nearListEnd || !hasMore || loading || loadingMore || loadMoreError) {
      return
    }
    void loadMore()
  }, [hasMore, loadMore, loadMoreError, loading, loadingMore, nearListEnd])

  useEffect(() => {
    if (!nearListEnd || !hasMore || loading || loadingMore || hasShownLoadMoreHintRef.current) {
      return
    }
    hasShownLoadMoreHintRef.current = true
    setShowLoadMoreHint(true)
    const timer = window.setTimeout(() => setShowLoadMoreHint(false), 2200)
    return () => window.clearTimeout(timer)
  }, [hasMore, loading, loadingMore, nearListEnd])

  return {
    loadMoreSentinelRef,
    showLoadMoreHint,
  }
}
