import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createBookmark } from '../api/bookmarks'
import type { OgMetadata } from '../api/ogfetch'
import { useTags } from '../hooks/useTags'
import { useFolders } from '../hooks/useFolders'
import OgPreview from '../components/OgPreview'
import TagInput from '../components/TagInput'
import { t } from '../styles/theme'
import { getErrorMessage } from '../api/client'
import { LIMITS, isHttpUrl } from '../utils/validation'

const TrafficLights = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff6b5b', border: '1px solid #d94f42' }} />
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffd055', border: '1px solid #d4a800' }} />
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4dbb5f', border: '1px solid #3a9a4a' }} />
  </div>
)

export default function AddLinkPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { url?: string; title?: string } | null
  const { tags: allTags } = useTags()
  const { folders } = useFolders()

  // 로그인 전에 공유받은 링크는 sessionStorage에 보관되어 있으므로 초기값으로 사용
  const [url, setUrl] = useState(() => sessionStorage.getItem('shareUrl') || state?.url || '')
  const [title, setTitle] = useState(() =>
    sessionStorage.getItem('shareUrl') ? sessionStorage.getItem('shareTitle') || '' : state?.title || '')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [memo, setMemo] = useState('')
  const [tagNames, setTagNames] = useState<string[]>([])
  const [fromNames, setFromNames] = useState<string[]>([])
  const [folderId, setFolderId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [savePressed, setSavePressed] = useState(false)

  useEffect(() => {
    sessionStorage.removeItem('shareUrl')
    sessionStorage.removeItem('shareTitle')
  }, [])

  const handleOgFetched = (meta: OgMetadata) => {
    if (meta.title && !title) setTitle(meta.title)
    if (isHttpUrl(meta.thumbnailUrl)) setThumbnailUrl(meta.thumbnailUrl)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!url) return
    if (!isHttpUrl(url)) { showToast('http:// 또는 https:// 로 시작하는 URL을 입력하세요'); return }
    setLoading(true)
    try {
      const allTagNames = [...tagNames, ...fromNames]
      await createBookmark({ url, title, thumbnailUrl, memo, tagNames: allTagNames, folderId })
      navigate('/')
    } catch (err) {
      showToast(getErrorMessage(err, '저장에 실패했습니다'))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: t.radiusSm,
    border: `2px solid ${focusedField === field ? t.primary : t.border}`,
    background: t.surface2,
    color: t.text,
    fontSize: 14,
    outline: 'none',
    display: 'block',
    fontFamily: "'Courier New', Monaco, monospace",
    boxShadow: t.bevelIn,
  })

  return (
    <div style={{ background: t.bg, minHeight: '100vh', paddingBottom: 24 }}>
      {/* Title Bar Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        background: t.titleBar,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        gap: 10,
      }}>
        <TrafficLights />
        <button
          onClick={() => navigate(-1)}
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.8)',
            fontFamily: "'Courier New', Monaco, monospace",
            cursor: 'pointer',
            marginLeft: 8,
          }}
        >
          &lt; Back
        </button>
        <span style={{
          flex: 1,
          textAlign: 'center',
          color: '#fff',
          fontSize: 14,
          fontFamily: "'Courier New', Monaco, monospace",
          fontWeight: 'bold',
          marginRight: 60,
        }}>
          New Bookmark
        </span>
      </div>

      <form onSubmit={submit} style={{ padding: '20px 16px 0' }}>
        <label style={labelStyle}>URL *</label>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onFocus={() => setFocusedField('url')}
          onBlur={() => setFocusedField(null)}
          onPaste={e => {
            const pasted = e.clipboardData.getData('text')
            if (pasted.startsWith('http')) setTimeout(() => setUrl(pasted), 0)
          }}
          placeholder="https://..."
          type="url"
          required
          style={inputStyle('url')}
        />

        <OgPreview url={url} onFetched={handleOgFetched} />

        <label style={{ ...labelStyle, marginTop: 16 }}>TITLE</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={() => setFocusedField('title')}
          onBlur={() => setFocusedField(null)}
          placeholder="자동으로 불러와집니다"
          style={inputStyle('title')}
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>TAGS</label>
        <TagInput
          tags={tagNames}
          onChange={setTagNames}
          maxTags={LIMITS.tagCount - fromNames.length}
          suggestions={allTags.filter(tag => !tag.name.startsWith('@')).map(tag => tag.name)}
        />

        <label style={{ ...labelStyle, marginTop: 16, color: t.coral }}>FROM 👤</label>
        <TagInput
          tags={fromNames}
          onChange={setFromNames}
          maxTags={LIMITS.tagCount - tagNames.length}
          suggestions={allTags.filter(tag => tag.name.startsWith('@')).map(tag => tag.name.slice(1))}
          placeholder="이름 입력 후 Enter (예: 김민준)"
          personMode
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>FOLDER</label>
        <select
          value={folderId ?? ''}
          onChange={e => setFolderId(e.target.value === '' ? null : Number(e.target.value))}
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: t.radiusSm, border: `2px solid ${t.border}`, background: t.surface2, color: t.text, fontSize: 14, fontFamily: "'Courier New', Monaco, monospace", boxShadow: t.bevelIn, outline: 'none', cursor: 'pointer' }}
        >
          <option value="">[ No Folder ]</option>
          {folders.map(f => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
        </select>

        <label style={{ ...labelStyle, marginTop: 16 }}>MEMO</label>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          maxLength={LIMITS.memo}
          onFocus={() => setFocusedField('memo')}
          onBlur={() => setFocusedField(null)}
          placeholder="메모를 입력하세요..."
          rows={3}
          style={{ ...inputStyle('memo'), resize: 'none', verticalAlign: 'top' }}
        />

        <button
          type="submit"
          disabled={loading}
          onMouseDown={() => setSavePressed(true)}
          onMouseUp={() => setSavePressed(false)}
          onMouseLeave={() => setSavePressed(false)}
          style={{
            width: '100%',
            marginTop: 24,
            padding: '10px 16px',
            borderRadius: t.radiusSm,
            background: t.primary,
            color: t.textOnDark,
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: "'Courier New', Monaco, monospace",
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            border: `2px solid ${t.borderDark}`,
            boxShadow: (savePressed && !loading) ? t.bevelIn : t.bevelOut,
            letterSpacing: '0.03em',
          }}
        >
          {loading ? '[ Saving... ]' : '[ Save Bookmark ]'}
        </button>
      </form>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: t.surface,
          border: `2px solid ${t.border}`,
          color: t.text,
          padding: '8px 18px',
          borderRadius: t.radiusSm,
          fontSize: 13,
          fontFamily: "'Courier New', Monaco, monospace",
          zIndex: 200,
          whiteSpace: 'nowrap',
          boxShadow: t.bevelOut,
        }}>
          ! {toast}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 'bold',
  color: t.text2,
  marginBottom: 4,
  fontFamily: "'Courier New', Monaco, monospace",
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}
