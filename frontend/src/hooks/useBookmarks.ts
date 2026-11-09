import { useState, useCallback, useRef } from 'react'
import { getBookmarks } from '../api/bookmarks'
import type { Bookmark } from '../api/bookmarks'

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const loadingRef = useRef(false)
  const paramsRef = useRef<{ keyword?: string; tagIds?: number[]; folderId?: number | null }>({})

  const reset = useCallback((keyword?: string, tagIds?: number[], folderId?: number | null) => {
    pageRef.current = 0
    paramsRef.current = { keyword, tagIds, folderId }
    setBookmarks([])
    setHasMore(true)
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    const page = pageRef.current
    try {
      const data = await getBookmarks({ page, size: 10, ...paramsRef.current })
      setBookmarks(prev => page === 0 ? data.content : [...prev, ...data.content])
      setHasMore(!data.last)
      pageRef.current = page + 1
    } catch {
      // 목록 조회 실패 시 기존 목록을 유지
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [hasMore])

  return { bookmarks, loading, hasMore, loadMore, reset, setBookmarks }
}
