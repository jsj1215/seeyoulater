import { useEffect, useRef, useCallback, useState } from 'react'
import type { RefCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBookmarks } from '../api/bookmarks'
import type { Bookmark } from '../api/bookmarks'
import LinkCard from '../components/LinkCard'
import SearchBar from '../components/SearchBar'
import { t } from '../styles/theme'

type SortMode = 'newest' | 'oldest' | 'starred'

const TrafficLights = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    {['#ff6b5b','#ffd055','#4dbb5f'].map((c,i) => (
      <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: `1px solid ${i===0?'#d94f42':i===1?'#d4a800':'#3a9a4a'}` }} />
    ))}
  </div>
)

export default function ViewPage() {
  const navigate = useNavigate()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sort, setSort] = useState<SortMode>('newest')
  const [keyword, setKeyword] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const pageRef = useRef(0)
  const loadingRef = useRef(false)
  const observerRef = useRef<IntersectionObserver | undefined>(undefined)

  const loadMore = useCallback(async (reset = false) => {
    if (loadingRef.current || (!reset && !hasMore)) return
    loadingRef.current = true
    setLoading(true)
    const page = reset ? 0 : pageRef.current
    try {
      const data = await getBookmarks({
        page,
        size: 20,
        keyword: keyword || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        sortBy: sort,
        starredOnly: sort === 'starred' ? true : undefined,
      })
      setBookmarks(prev => page === 0 ? data.content : [...prev, ...data.content])
      setHasMore(!data.last)
      pageRef.current = page + 1
    } catch {
      // 목록 조회 실패 시 기존 목록을 유지
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [sort, keyword, hasMore, selectedTagIds])

  useEffect(() => {
    // loadMore(true)가 0페이지 결과로 목록과 hasMore를 함께 교체함
    pageRef.current = 0
    loadMore(true)
  }, [sort, keyword, selectedTagIds])

  const handleBottom: RefCallback<HTMLDivElement> = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect()
    if (!node) return
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) loadMore()
    })
    observerRef.current.observe(node)
  }, [hasMore, loading, loadMore])

  const handleSearch = useCallback((kw: string) => setKeyword(kw), [])

  const sortBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 11,
    fontFamily: "'Courier New', Monaco, monospace",
    background: active ? t.primary : t.surface2,
    color: active ? t.textOnDark : t.text2,
    border: `2px solid ${active ? t.borderDark : t.border}`,
    boxShadow: active ? t.bevelIn : t.bevelOut,
    borderRadius: t.radiusSm, cursor: 'pointer', fontWeight: active ? 'bold' : 'normal',
  })

  return (
    <div style={{ background: t.bg, minHeight: '100vh', paddingBottom: 90 }}>
      {/* Title Bar */}
      <div style={{ background: t.titleBar, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 32, zIndex: 20 }}>
        <TrafficLights />
        <button onClick={() => navigate('/')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: "'Courier New', Monaco, monospace", cursor: 'pointer', marginLeft: 8 }}>
          &lt; Back
        </button>
        <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontFamily: "'Courier New', Monaco, monospace", fontWeight: 'bold', marginRight: 60 }}>
          All Bookmarks
        </span>
      </div>

      {/* Sort controls */}
      <div style={{ background: t.surface2, borderBottom: `2px solid ${t.border}`, padding: '6px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, color: t.textMuted, marginRight: 4 }}>Sort:</span>
        <button style={sortBtnStyle(sort === 'newest')} onClick={() => setSort('newest')}>Newest</button>
        <button style={sortBtnStyle(sort === 'oldest')} onClick={() => setSort('oldest')}>Oldest</button>
        <button style={sortBtnStyle(sort === 'starred')} onClick={() => setSort('starred')}>★ Starred</button>
        <span style={{ marginLeft: 'auto', fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, color: t.textMuted }}>{bookmarks.length} item(s)</span>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px 0' }}>
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Bookmarks */}
      {bookmarks.length === 0 && !loading ? (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 32, color: t.textMuted, marginBottom: 12 }}>[___]</div>
          <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.text2 }}>
            {sort === 'starred' ? '[ 별점 준 링크가 없습니다 ]' : '[ No bookmarks ]'}
          </div>
        </div>
      ) : (
        <div style={{ paddingTop: 10 }}>
          {bookmarks.map(b => (<LinkCard key={b.id} bookmark={b} onTagClick={tag => setSelectedTagIds(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])} />))}
        </div>
      )}

      {loading && (
        <div style={{ padding: 16, textAlign: 'center', color: t.textMuted, fontSize: 13, fontFamily: "'Courier New', Monaco, monospace" }}>Loading...</div>
      )}
      <div ref={handleBottom} style={{ height: 1 }} />
    </div>
  )
}
