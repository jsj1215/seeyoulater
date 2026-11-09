import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFolders } from '../hooks/useFolders'
import { renameFolder, reorderFolders } from '../api/folders'
import { getErrorMessage } from '../api/client'
import { toggleVisibility } from '../api/plaza'
import { t } from '../styles/theme'

const FOLDER_COLORS = ['#e85d3a','#1a6b5a','#2c5f8a','#f0b429','#a855f7','#ec4899','#0891b2','#16a34a']

const TrafficLights = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    {['#ff6b5b','#ffd055','#4dbb5f'].map((c, i) => (
      <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: `1px solid ${i===0?'#d94f42':i===1?'#d4a800':'#3a9a4a'}` }} />
    ))}
  </div>
)

export default function FoldersPage() {
  const navigate = useNavigate()
  const { folders, setFolders, addFolder, removeFolder, reload } = useFolders()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [error, setError] = useState('')
  // 서버가 저장된 순서대로 내려주므로 기본은 사용자 지정 순서
  const [sortBy, setSortBy] = useState<'name-asc'|'name-desc'|'newest'|'oldest'|'custom'>('custom')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // custom 정렬은 서버가 저장된 순서대로 내려주는 folders 배열 순서를 그대로 사용
  const sortedFolders = useMemo(() => {
    if (sortBy === 'custom') return folders
    return [...folders].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      if (sortBy === 'oldest') return aTime - bTime
      return bTime - aTime
    })
  }, [folders, sortBy])

  const handleDragStart = (i: number) => {
    // 다른 정렬로 보고 있던 순서를 기준으로 드래그를 시작하도록 화면 순서를 그대로 고정
    if (sortBy !== 'custom') { setFolders(sortedFolders); setSortBy('custom') }
    setDragIndex(i)
  }
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i) }
  const handleDrop = async (i: number) => {
    const from = dragIndex
    setDragIndex(null)
    setDragOver(null)
    if (from === null || from === i) return
    const previous = folders
    const next = [...sortedFolders]
    const [moved] = next.splice(from, 1)
    next.splice(i, 0, moved)
    setFolders(next)
    setError('')
    try {
      await reorderFolders(next.map(f => f.id))
    } catch (err) {
      setFolders(previous)
      setError(getErrorMessage(err, '순서 저장 실패'))
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true); setError('')
    try {
      await addFolder(newName.trim())
      setNewName('')
    } catch (err) {
      setError(getErrorMessage(err, '생성 실패'))
    } finally { setCreating(false) }
  }

  const handleRename = async (id: number) => {
    if (!editName.trim()) return
    try {
      await renameFolder(id, editName.trim())
      reload()
      setEditingId(null)
    } catch (err) {
      setError(getErrorMessage(err, '이름 변경 실패'))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await removeFolder(id)
      setDeleteConfirm(null)
    } catch { setError('삭제 실패') }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: t.radiusSm,
    border: `2px solid ${t.border}`, background: t.surface2,
    color: t.text, fontSize: 13, fontFamily: "'Courier New', Monaco, monospace",
    boxShadow: t.bevelIn, outline: 'none', boxSizing: 'border-box',
  }
  const btnStyle = (primary = false): React.CSSProperties => ({
    padding: '8px 12px', borderRadius: t.radiusSm, cursor: 'pointer', fontSize: 12,
    fontFamily: "'Courier New', Monaco, monospace", fontWeight: primary ? 'bold' : 'normal',
    background: primary ? t.primary : t.surface2,
    color: primary ? t.textOnDark : t.text,
    border: `2px solid ${primary ? t.borderDark : t.border}`,
    boxShadow: t.bevelOut,
  })

  return (
    <div style={{ background: t.bg, minHeight: '100vh' }}>
      {/* Title Bar */}
      <div style={{ background: t.titleBar, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 32, zIndex: 20 }}>
        <TrafficLights />
        <button onClick={() => navigate('/')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: "'Courier New', Monaco, monospace", cursor: 'pointer', marginLeft: 8 }}>
          &lt; Back
        </button>
        <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontFamily: "'Courier New', Monaco, monospace", fontWeight: 'bold', marginRight: 60 }}>
          Folders
        </span>
      </div>

      {/* Status + Sort */}
      <div style={{ background: t.surface2, borderBottom: `2px solid ${t.border}`, padding: '3px 12px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>● {folders.length} folder(s)</span>
        <span style={{ marginLeft: 'auto' }}>Sort:</span>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{ fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", background: t.surface, border: `1px solid ${t.border}`, color: t.text, padding: '1px 4px', borderRadius: t.radiusSm, boxShadow: t.bevelIn, cursor: 'pointer' }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name-asc">Name A→Z</option>
          <option value="name-desc">Name Z→A</option>
          <option value="custom">Custom (drag)</option>
        </select>
      </div>

      <div style={{ padding: 16 }}>
        {/* Create new folder */}
        <div style={{ marginBottom: 16, background: t.surface, border: `2px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radius, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(180deg, #c8d4e0 0%, #a0b4c8 100%)', padding: '4px 12px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.text2 }}>
            New Folder
          </div>
          <div style={{ padding: 12, display: 'flex', gap: 8 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="폴더 이름 입력..." style={inputStyle} autoFocus />
            <button onClick={handleCreate} disabled={creating || !newName.trim()} style={btnStyle(true)}>
              [ + Add ]
            </button>
          </div>
          {error && <div style={{ padding: '0 12px 10px', fontSize: 12, color: t.danger, fontFamily: "'Courier New', Monaco, monospace" }}>! {error}</div>}
        </div>

        {/* Folder list */}
        <div style={{ background: t.surface, border: `2px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radius, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(180deg, #c8d4e0 0%, #a0b4c8 100%)', padding: '4px 12px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.text2 }}>
            All Folders
          </div>

          {sortedFolders.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.textMuted }}>
              [ No folders yet ]
            </div>
          ) : sortedFolders.map((folder, i) => {
              const color = FOLDER_COLORS[i % FOLDER_COLORS.length]
              const isEditing = editingId === folder.id
              const isDeleting = deleteConfirm === folder.id

              return (
                <div key={folder.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => { setDragIndex(null); setDragOver(null) }}
                  style={{ borderTop: i > 0 ? `1px solid ${t.border}` : 'none', opacity: dragIndex === i ? 0.4 : 1, background: dragOver === i ? t.surface2 : 'transparent', transition: 'background 0.1s' }}>
                  {/* Color strip + folder row */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 8, minWidth: 0, cursor: 'grab' }}>
                    <div style={{ width: 4, height: 36, background: color, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 20, flexShrink: 0 }}>📁</div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4, minWidth: 0 }}>
                          <input
                            autoFocus value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(folder.id); if (e.key === 'Escape') setEditingId(null) }}
                            style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '4px 8px', fontSize: 12, boxSizing: 'border-box' as const }}
                          />
                          <button onClick={() => handleRename(folder.id)} style={{ ...btnStyle(true), padding: '4px 8px', fontSize: 11, flexShrink: 0 }}>OK</button>
                          <button onClick={() => setEditingId(null)} style={{ ...btnStyle(), padding: '4px 8px', fontSize: 11, flexShrink: 0 }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 14, fontWeight: 'bold', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {folder.name}
                          </div>
                          <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, color: t.textMuted }}>
                            {folder.bookmarkCount ?? 0} bookmark(s)
                          </div>
                        </>
                      )}
                    </div>

                    {!isEditing && !isDeleting && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 160 }}>
                        <button
                          onClick={async () => { await toggleVisibility(folder.id); reload() }}
                          style={{ ...btnStyle(), padding: '4px 6px', fontSize: 11, color: folder.isPublic ? t.primary : t.textMuted, borderColor: folder.isPublic ? t.primary : t.border }}
                        >
                          {folder.isPublic ? '🌐' : '🔒'}
                        </button>
                        <button onClick={() => navigate(`/?folder=${folder.id}`)} style={{ ...btnStyle(), padding: '4px 6px', fontSize: 11 }}>Open</button>
                        <button onClick={() => { setEditingId(folder.id); setEditName(folder.name) }} style={{ ...btnStyle(), padding: '4px 6px', fontSize: 11 }}>Rename</button>
                        <button onClick={() => setDeleteConfirm(folder.id)} style={{ ...btnStyle(), padding: '4px 6px', fontSize: 11, color: t.danger }}>Delete</button>
                      </div>
                    )}

                    {isDeleting && (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted, whiteSpace: 'nowrap' }}>삭제?</span>
                        <button onClick={() => handleDelete(folder.id)} style={{ ...btnStyle(true), padding: '4px 8px', fontSize: 11, background: t.danger, flexShrink: 0 }}>Yes</button>
                        <button onClick={() => setDeleteConfirm(null)} style={{ ...btnStyle(), padding: '4px 8px', fontSize: 11, flexShrink: 0 }}>No</button>
                      </div>
                    )}
                  </div>
                </div>
              )
          })}
        </div>
      </div>
    </div>
  )
}
