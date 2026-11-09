import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTags } from '../hooks/useTags'
import { getTags } from '../api/tags'
import { getBookmarks } from '../api/bookmarks'
import type { Bookmark } from '../api/bookmarks'
import LinkCard from '../components/LinkCard'
import { t } from '../styles/theme'

const TrafficLights = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    {['#ff6b5b','#ffd055','#4dbb5f'].map((c,i) => (
      <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: `1px solid ${i===0?'#d94f42':i===1?'#d4a800':'#3a9a4a'}` }} />
    ))}
  </div>
)

export default function FromPage() {
  const navigate = useNavigate()
  const { tags, setTags } = useTags()
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(false)

  // 매 마운트마다 최신 태그 목록으로 갱신
  useEffect(() => {
    getTags().then(setTags).catch(() => {})
  }, [])

  const personTags = useMemo(() =>
    tags.filter(t => t.name.startsWith('@')), [tags])

  const selectedPerson = personTags.find(t => t.id === selectedPersonId)

  const handleSelect = async (tagId: number) => {
    if (selectedPersonId === tagId) {
      setSelectedPersonId(null)
      setBookmarks([])
      return
    }
    setSelectedPersonId(tagId)
    setLoading(true)
    try {
      const data = await getBookmarks({ tagIds: [tagId], size: 100 })
      setBookmarks(data.content)
    } catch {
      setBookmarks([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', paddingBottom: 90 }}>
      {/* Title Bar */}
      <div style={{ background: t.titleBar, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 32, zIndex: 20 }}>
        <TrafficLights />
        <button onClick={() => navigate('/')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: "'Courier New', Monaco, monospace", cursor: 'pointer', marginLeft: 8 }}>
          &lt; Back
        </button>
        <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontFamily: "'Courier New', Monaco, monospace", fontWeight: 'bold', marginRight: 60 }}>
          From 👤
        </span>
      </div>

      {/* Status */}
      <div style={{ background: t.surface2, borderBottom: `2px solid ${t.border}`, padding: '3px 16px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted }}>
        ● {personTags.length} person(s) · {selectedPerson ? `Showing links from @${selectedPerson.name.slice(1)}` : 'Select a person'}
      </div>

      <div style={{ padding: 12 }}>
        {personTags.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 14, color: t.text2, marginBottom: 8 }}>
              [ No people yet ]
            </div>
            <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 12, color: t.textMuted }}>
              링크 추가 시 From 필드에 이름을 입력하세요
            </div>
          </div>
        ) : (
          <>
            {/* Person grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {personTags.map(tag => {
                const isSelected = selectedPersonId === tag.id
                return (
                  <div key={tag.id} onClick={() => handleSelect(tag.id)}
                    style={{
                      background: isSelected ? t.primary : t.surface,
                      border: `2px solid ${isSelected ? t.borderDark : t.border}`,
                      boxShadow: isSelected ? t.bevelIn : t.bevelOut,
                      borderRadius: t.radius, padding: '14px 8px',
                      textAlign: 'center', cursor: 'pointer', transition: 'all 0.1s',
                    }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>👤</div>
                    <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 12, fontWeight: 'bold', color: isSelected ? t.textOnDark : t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tag.name.slice(1)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bookmarks from selected person */}
            {selectedPersonId && (
              <div>
                <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, color: t.textMuted, marginBottom: 8, padding: '0 4px' }}>
                  ● {selectedPerson ? `@${selectedPerson.name.slice(1)}` : ''}이 전달한 링크 — {bookmarks.length}개
                </div>
                {loading ? (
                  <div style={{ padding: 20, textAlign: 'center', fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.textMuted }}>Loading...</div>
                ) : bookmarks.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.textMuted }}>[ No bookmarks ]</div>
                ) : (
                  bookmarks.map(b => <LinkCard key={b.id} bookmark={b} />)
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
