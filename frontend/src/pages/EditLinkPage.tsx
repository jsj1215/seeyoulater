import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBookmark, updateBookmark, deleteBookmark } from '../api/bookmarks'
import { useTags } from '../hooks/useTags'
import { useFolders } from '../hooks/useFolders'
import OgPreview from '../components/OgPreview'
import TagInput from '../components/TagInput'
import type { OgMetadata } from '../api/ogfetch'
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

export default function EditLinkPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tags: allTags } = useTags()
  const { folders } = useFolders()

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [memo, setMemo] = useState('')
  const [tagNames, setTagNames] = useState<string[]>([])
  const [fromNames, setFromNames] = useState<string[]>([])
  const [folderId, setFolderId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [savePressed, setSavePressed] = useState(false)
  const [cancelPressed, setCancelPressed] = useState(false)
  const [deletePressed, setDeletePressed] = useState(false)

  useEffect(() => {
    if (!id) return
    getBookmark(Number(id)).then(b => {
      setUrl(b.url)
      setTitle(b.title || '')
      setThumbnailUrl(b.thumbnailUrl || '')
      setMemo(b.memo || '')
      setTagNames(b.tags.filter(tag => !tag.name.startsWith('@')).map(tag => tag.name))
      setFromNames(b.tags.filter(tag => tag.name.startsWith('@')).map(tag => tag.name))
      setFolderId(b.folder?.id ?? null)
    }).catch(() => navigate('/'))
  }, [id])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleOgFetched = (meta: OgMetadata) => {
    if (isHttpUrl(meta.thumbnailUrl)) setThumbnailUrl(meta.thumbnailUrl)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isHttpUrl(url)) { showToast('http:// 또는 https:// 로 시작하는 URL을 입력하세요'); return }
    setLoading(true)
    try {
      await updateBookmark(Number(id), { url, title, thumbnailUrl, memo, tagNames: [...tagNames, ...fromNames], folderId })
      navigate('/')
    } catch (err) {
      showToast(getErrorMessage(err, '수정에 실패했습니다'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBookmark(Number(id))
      navigate('/')
    } catch {
      showToast('삭제에 실패했습니다')
      setShowConfirm(false)
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
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: t.titleBar,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        </div>
        <span style={{
          color: '#fff',
          fontSize: 14,
          fontFamily: "'Courier New', Monaco, monospace",
          fontWeight: 'bold',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>
          Edit Bookmark
        </span>
        <button
          onClick={() => setShowConfirm(true)}
          style={{
            color: '#ffb3a7',
            fontSize: 12,
            fontFamily: "'Courier New', Monaco, monospace",
            cursor: 'pointer',
          }}
        >
          [ Delete ]
        </button>
      </div>

      <form onSubmit={submit} style={{ padding: '20px 16px 0' }}>
        <label style={labelStyle}>URL *</label>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onFocus={() => setFocusedField('url')}
          onBlur={() => setFocusedField(null)}
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
          style={inputStyle('title')}
        />

        <label style={{ ...labelStyle, marginTop: 16 }}>TAGS</label>
        <TagInput tags={tagNames} onChange={setTagNames} maxTags={LIMITS.tagCount - fromNames.length} suggestions={allTags.filter(tag => !tag.name.startsWith('@')).map(tag => tag.name)} />

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
          {loading ? '[ Saving... ]' : '[ Save Changes ]'}
        </button>
      </form>

      {/* Delete confirm modal — Mac OS window style */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
        }}>
          <div style={{
            background: t.surface,
            border: `2px solid ${t.border}`,
            borderRadius: t.radius,
            boxShadow: t.bevelOut,
            width: '100%',
            maxWidth: 300,
            margin: 24,
            overflow: 'hidden',
          }}>
            {/* Modal title bar */}
            <div style={{
              background: t.titleBar,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              position: 'relative',
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff6b5b', border: '1px solid #d94f42' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffd055', border: '1px solid #d4a800' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4dbb5f', border: '1px solid #3a9a4a' }} />
              </div>
              <span style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#fff',
                fontSize: 12,
                fontFamily: "'Courier New', Monaco, monospace",
                fontWeight: 'bold',
              }}>
                Confirm Delete
              </span>
            </div>
            {/* Modal body */}
            <div style={{ padding: '20px 20px 16px' }}>
              <p style={{
                color: t.text,
                fontSize: 13,
                fontFamily: "'Courier New', Monaco, monospace",
                marginBottom: 20,
                lineHeight: 1.5,
              }}>
                이 링크를 삭제하면 복구할 수 없습니다.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  onMouseDown={() => setCancelPressed(true)}
                  onMouseUp={() => setCancelPressed(false)}
                  onMouseLeave={() => setCancelPressed(false)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: t.radiusSm,
                    background: '#d4c8b4',
                    color: t.text2,
                    fontWeight: 'bold',
                    fontSize: 13,
                    fontFamily: "'Courier New', Monaco, monospace",
                    border: `2px solid ${t.border}`,
                    boxShadow: cancelPressed ? t.bevelIn : t.bevelOut,
                    cursor: 'pointer',
                  }}
                >
                  [ Cancel ]
                </button>
                <button
                  onClick={handleDelete}
                  onMouseDown={() => setDeletePressed(true)}
                  onMouseUp={() => setDeletePressed(false)}
                  onMouseLeave={() => setDeletePressed(false)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: t.radiusSm,
                    background: t.danger,
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: 13,
                    fontFamily: "'Courier New', Monaco, monospace",
                    border: `2px solid #8a1500`,
                    boxShadow: deletePressed ? t.bevelIn : t.bevelOut,
                    cursor: 'pointer',
                  }}
                >
                  [ Delete ]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
