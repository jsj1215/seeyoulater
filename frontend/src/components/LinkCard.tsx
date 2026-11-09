import { useState } from 'react'
import type { Bookmark } from '../api/bookmarks'
import type { PublicBookmark } from '../api/plaza'
import { updateRating } from '../api/bookmarks'
import TagChip from './TagChip'
import StarRating from './StarRating'
import { useNavigate } from 'react-router-dom'
import { t } from '../styles/theme'
import { isHttpUrl } from '../utils/validation'

import type { TagInfo } from '../api/bookmarks'

interface Props {
  // 공개 폴더 북마크는 rating/tags/folder/memo가 없으므로 읽기 전용으로 렌더링
  bookmark: Bookmark | PublicBookmark
  onRatingChange?: (id: number, rating: number) => void
  onTagClick?: (tag: TagInfo) => void
}

// 제3자 파비콘 서비스로 방문 도메인이 새지 않도록 사이트 자체 favicon.ico만 요청
function getFavicon(url: string) {
  if (!isHttpUrl(url)) return null
  return `${new URL(url).origin}/favicon.ico`
}

export default function LinkCard({ bookmark, onRatingChange, onTagClick }: Props) {
  const navigate = useNavigate()
  const [editPressed, setEditPressed] = useState(false)
  const full = 'tags' in bookmark ? bookmark : null
  const [rating, setRating] = useState(full?.rating ?? 0)
  const [showThumb, setShowThumb] = useState(false)
  const [faviconFailed, setFaviconFailed] = useState(false)

  const handleRating = async (newRating: number) => {
    setRating(newRating)
    try {
      await updateRating(bookmark.id, newRating)
      onRatingChange?.(bookmark.id, newRating)
    } catch {
      setRating(rating)
    }
  }

  const favicon = getFavicon(bookmark.url)
  const thumbnailUrl = isHttpUrl(bookmark.thumbnailUrl) ? bookmark.thumbnailUrl : null

  return (
    <div
      style={{ margin: '0 8px 8px', borderRadius: t.radiusSm, border: `1px solid ${t.border}`, background: t.surface, boxShadow: `1px 1px 0 ${t.borderDark}, -1px -1px 0 #fefef4`, overflow: 'visible', cursor: 'pointer', position: 'relative' }}
      onClick={() => isHttpUrl(bookmark.url) && window.open(bookmark.url, '_blank', 'noopener')}
      onMouseEnter={() => thumbnailUrl && setShowThumb(true)}
      onMouseLeave={() => setShowThumb(false)}
    >
      {/* Thumbnail hover popup */}
      {showThumb && thumbnailUrl && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
          zIndex: 50, pointerEvents: 'none',
          boxShadow: `2px 2px 0 ${t.borderDark}, -1px -1px 0 #fefef4`,
          border: `2px solid ${t.border}`, borderRadius: t.radiusSm, overflow: 'hidden',
        }}>
          <img src={thumbnailUrl} alt="" referrerPolicy="no-referrer" style={{ width: 220, height: 140, objectFit: 'cover', display: 'block' }}
            onError={e => { e.currentTarget.parentElement!.style.display = 'none' }} />
        </div>
      )}

      {/* Mini Title Bar */}
      <div style={{ background: 'linear-gradient(180deg, #c8d4e0 0%, #a0b4c8 100%)', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, borderRadius: `${t.radiusSm} ${t.radiusSm} 0 0`, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#c4b49a', border: `1px solid ${t.borderDark}` }} />
          ))}
        </div>
        {favicon && !faviconFailed ? (
          <img src={favicon} alt="" width={12} height={12} referrerPolicy="no-referrer" style={{ marginLeft: 4, flexShrink: 0 }}
            onError={() => setFaviconFailed(true)} />
        ) : (
          <span aria-hidden style={{ marginLeft: 4, flexShrink: 0, fontSize: 10, lineHeight: '12px' }}>🌐</span>
        )}
        <span style={{ fontSize: 10, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {bookmark.url}
        </span>
        {full?.folder && (
          <span style={{ fontSize: 10, fontFamily: "'Courier New', Monaco, monospace", color: t.primary, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
            📁 {full.folder.name}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0 }}>
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt="" referrerPolicy="no-referrer"
            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: t.radiusSm, border: `1px solid ${t.border}`, flexShrink: 0 }}
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        )}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: t.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bookmark.title || bookmark.url}
          </div>
          <div style={{ fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bookmark.url}
          </div>
          {full && <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
              <StarRating rating={rating} onChange={handleRating} size={13} />
            </div>
            {full.tags.map(tag => (
              <span key={tag.id} onClick={e => { e.stopPropagation(); onTagClick?.(tag) }}
                style={{ display: 'inline-flex' }}>
                <TagChip name={tag.name} />
              </span>
            ))}
          </div>}
        </div>
        {full && <button
          onClick={e => { e.stopPropagation(); navigate(`/edit/${bookmark.id}`) }}
          onMouseDown={() => setEditPressed(true)}
          onMouseUp={() => setEditPressed(false)}
          onMouseLeave={() => setEditPressed(false)}
          style={{ padding: '2px 5px', fontSize: 10, fontFamily: "'Courier New', Monaco, monospace", color: t.text2, flexShrink: 0, alignSelf: 'flex-start', background: '#d4c8b4', border: `1px solid ${t.border}`, borderRadius: t.radiusSm, boxShadow: editPressed ? t.bevelIn : t.bevelOut, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Edit
        </button>}
      </div>
    </div>
  )
}
