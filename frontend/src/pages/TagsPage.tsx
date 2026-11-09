import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTags } from '../hooks/useTags'
import { deleteTag, renameTag, reorderTags } from '../api/tags'
import client, { getErrorMessage } from '../api/client'
import { t } from '../styles/theme'
import type { TagInfo } from '../api/bookmarks'
import { LIMITS } from '../utils/validation'

const TrafficLights = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    {['#ff6b5b', '#ffd055', '#4dbb5f'].map((c, i) => (
      <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: `1px solid ${i === 0 ? '#d94f42' : i === 1 ? '#d4a800' : '#3a9a4a'}` }} />
    ))}
  </div>
)

export default function TagsPage() {
  const navigate = useNavigate()
  const { tags, setTags } = useTags()
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  // 서버가 저장된 순서대로 내려주므로 기본은 사용자 지정 순서
  const [sortBy, setSortBy] = useState<'name-asc'|'name-desc'|'custom'>('custom')
  const [dragIndex, setDragIndex] = useState<{list: 'person'|'regular', i: number} | null>(null)
  const [dragOver, setDragOver] = useState<{list: 'person'|'regular', i: number} | null>(null)

  // custom 정렬은 tags 배열 순서(서버 저장 순서)를 그대로 사용
  const { sortedPersonTags, sortedRegularTags } = useMemo(() => {
    const applySort = (arr: TagInfo[]) => {
      if (sortBy === 'custom') return arr
      return [...arr].sort((a, b) =>
        sortBy === 'name-desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name))
    }
    return {
      sortedPersonTags: applySort(tags.filter(t => t.name.startsWith('@'))),
      sortedRegularTags: applySort(tags.filter(t => !t.name.startsWith('@'))),
    }
  }, [tags, sortBy])

  const handleDragStart = (list: 'person'|'regular', i: number) => {
    // 이름순으로 보던 화면 순서를 기준으로 드래그를 시작하도록 순서를 고정
    if (sortBy !== 'custom') { setTags([...sortedPersonTags, ...sortedRegularTags]); setSortBy('custom') }
    setDragIndex({ list, i })
  }

  const handleDrag = async (list: 'person'|'regular', fromI: number, toI: number) => {
    setDragIndex(null); setDragOver(null)
    if (fromI === toI) return
    const source = list === 'person' ? [...sortedPersonTags] : [...sortedRegularTags]
    const [moved] = source.splice(fromI, 1)
    source.splice(toI, 0, moved)
    const next = list === 'person' ? [...source, ...sortedRegularTags] : [...sortedPersonTags, ...source]
    const previous = tags
    setTags(next)
    setError('')
    try {
      await reorderTags(next.map(t => t.id))
    } catch (err) {
      setTags(previous)
      setError(getErrorMessage(err, '순서 저장 실패'))
    }
  }

  const handleCreate = async () => {
    if (!newTagName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await client.post<TagInfo>('/tags', { name: newTagName.trim() })
      setTags(prev => [...prev, res.data])
      setNewTagName('')
    } catch (err) {
      setError(getErrorMessage(err, '태그 생성 실패'))
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async (id: number) => {
    if (!editName.trim()) return
    const original = tags.find(t => t.id === id)
    const newName = original?.name.startsWith('@') ? `@${editName.trim()}` : editName.trim()
    try {
      const updated = await renameTag(id, newName)
      setTags(prev => prev.map(t => t.id === id ? updated : t))
      setEditingId(null)
    } catch (err) {
      setError(getErrorMessage(err, '이름 변경 실패'))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteTag(id)
      setTags(prev => prev.filter(t => t.id !== id))
      setDeleteConfirm(null)
    } catch {
      setError('삭제 실패')
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: t.radiusSm,
    border: `2px solid ${t.border}`, background: t.surface2,
    color: t.text, fontSize: 14,
    fontFamily: "'Courier New', Monaco, monospace",
    boxShadow: t.bevelIn, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh' }}>
      {/* Title Bar */}
      <div style={{ background: t.titleBar, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 32, zIndex: 20 }}>
        <TrafficLights />
        <button onClick={() => navigate('/')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: "'Courier New', Monaco, monospace", cursor: 'pointer', marginLeft: 8 }}>
          &lt; Back
        </button>
        <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontFamily: "'Courier New', Monaco, monospace", fontWeight: 'bold', marginRight: 60 }}>
          Tags Manager
        </span>
      </div>

      {/* Menu strip + Sort */}
      <div style={{ background: t.surface2, borderBottom: `2px solid ${t.border}`, padding: '3px 12px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>● {tags.length} tag(s)</span>
        <span style={{ marginLeft: 'auto' }}>Sort:</span>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{ fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", background: t.surface, border: `1px solid ${t.border}`, color: t.text, padding: '1px 4px', borderRadius: t.radiusSm, boxShadow: t.bevelIn, cursor: 'pointer' }}>
          <option value="name-asc">A→Z</option>
          <option value="name-desc">Z→A</option>
          <option value="custom">Custom (drag)</option>
        </select>
      </div>

      <div style={{ padding: 16 }}>
        {/* Create new tag */}
        <div style={{ marginBottom: 20, background: t.surface, border: `2px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radius, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(180deg, #c8d4e0 0%, #a0b4c8 100%)', padding: '4px 12px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.text2 }}>
            New Tag
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="태그 이름 입력..."
                maxLength={LIMITS.tagName}
                style={inputStyle}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newTagName.trim()}
                style={{ padding: '8px 14px', background: t.primary, color: t.textOnDark, border: `2px solid ${t.borderDark}`, boxShadow: t.bevelOut, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, fontWeight: 'bold', cursor: 'pointer', opacity: creating ? 0.6 : 1 }}
              >
                [ + Add ]
              </button>
            </div>
            {error && <div style={{ marginTop: 6, fontSize: 12, color: t.danger, fontFamily: "'Courier New', Monaco, monospace" }}>! {error}</div>}
          </div>
        </div>

        {/* Person tags (@) */}
        {tags.some(t => t.name.startsWith('@')) && (
          <div style={{ marginBottom: 16, background: t.surface, border: `2px solid rgba(232,93,58,0.3)`, boxShadow: t.bevelOut, borderRadius: t.radius, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(180deg, #f0a090 0%, #c86050 100%)', padding: '4px 12px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: '#fff' }}>
              👤 From (People)
            </div>
            {sortedPersonTags.map((tag, i) => (
              <div key={tag.id}
                draggable
                onDragStart={() => handleDragStart('person', i)}
                onDragOver={e => { e.preventDefault(); setDragOver({list:'person',i}) }}
                onDrop={() => dragIndex?.list === 'person' && handleDrag('person', dragIndex.i, i)}
                onDragEnd={() => { setDragIndex(null); setDragOver(null) }}
                style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderTop: i > 0 ? `1px solid ${t.border}` : 'none', background: deleteConfirm === tag.id ? '#fff5f5' : dragOver?.list === 'person' && dragOver.i === i ? t.surface2 : 'transparent', opacity: dragIndex?.list === 'person' && dragIndex.i === i ? 0.4 : 1, cursor: 'grab', minWidth: 0 }}>
                {editingId === tag.id ? (
                  <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0 }}>
                    <input autoFocus value={editName} maxLength={LIMITS.tagName - 1} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(tag.id); if (e.key === 'Escape') setEditingId(null) }}
                      style={{ flex: 1, minWidth: 0, padding: '4px 8px', fontSize: 12, fontFamily: "'Courier New', Monaco, monospace", background: t.surface2, border: `2px solid ${t.border}`, boxShadow: t.bevelIn, borderRadius: t.radiusSm, color: t.text, outline: 'none', boxSizing: 'border-box' as const }} />
                    <button onClick={() => handleRename(tag.id)} style={{ padding: '3px 8px', background: t.primary, color: t.textOnDark, border: `1px solid ${t.borderDark}`, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>OK</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '3px 8px', background: t.surface2, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                  </div>
                ) : (
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.coral }}>👤 {tag.name.slice(1)}</span>
                )}
                {deleteConfirm === tag.id ? (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted, whiteSpace: 'nowrap' }}>삭제?</span>
                    <button onClick={() => handleDelete(tag.id)} style={{ padding: '3px 8px', background: t.danger, color: '#fff', border: `1px solid #a00`, borderRadius: t.radiusSm, boxShadow: t.bevelOut, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} style={{ padding: '3px 8px', background: t.surface2, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, boxShadow: t.bevelOut, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>No</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => { setEditingId(tag.id); setEditName(tag.name.startsWith('@') ? tag.name.slice(1) : tag.name) }} style={{ padding: '3px 8px', background: t.surface2, border: `1px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, color: t.text2, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => setDeleteConfirm(tag.id)} style={{ padding: '3px 8px', background: t.surface2, border: `1px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, color: t.textMuted, cursor: 'pointer' }}>Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tag list (regular) */}
        <div style={{ background: t.surface, border: `2px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radius, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(180deg, #c8d4e0 0%, #a0b4c8 100%)', padding: '4px 12px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.text2 }}>
            # Tags
          </div>
          {tags.filter(tag => !tag.name.startsWith('@')).length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.textMuted }}>
              [ No tags yet ]
            </div>
          ) : (
            sortedRegularTags.map((tag, i) => (
              <div key={tag.id}
                draggable
                onDragStart={() => handleDragStart('regular', i)}
                onDragOver={e => { e.preventDefault(); setDragOver({list:'regular',i}) }}
                onDrop={() => dragIndex?.list === 'regular' && handleDrag('regular', dragIndex.i, i)}
                onDragEnd={() => { setDragIndex(null); setDragOver(null) }}
                style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderTop: i > 0 ? `1px solid ${t.border}` : 'none', background: deleteConfirm === tag.id ? '#fff5f5' : dragOver?.list === 'regular' && dragOver.i === i ? t.surface2 : 'transparent', opacity: dragIndex?.list === 'regular' && dragIndex.i === i ? 0.4 : 1, cursor: 'grab', minWidth: 0 }}>
                {editingId === tag.id ? (
                  <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0 }}>
                    <input autoFocus value={editName} maxLength={LIMITS.tagName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(tag.id); if (e.key === 'Escape') setEditingId(null) }}
                      style={{ flex: 1, minWidth: 0, padding: '4px 8px', fontSize: 12, fontFamily: "'Courier New', Monaco, monospace", background: t.surface2, border: `2px solid ${t.border}`, boxShadow: t.bevelIn, borderRadius: t.radiusSm, color: t.text, outline: 'none', boxSizing: 'border-box' as const }} />
                    <button onClick={() => handleRename(tag.id)} style={{ padding: '3px 8px', background: t.primary, color: t.textOnDark, border: `1px solid ${t.borderDark}`, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>OK</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '3px 8px', background: t.surface2, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                  </div>
                ) : (<>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.text }}>
                    # {tag.name}
                  </span>
                  {deleteConfirm === tag.id ? (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted, whiteSpace: 'nowrap' }}>삭제?</span>
                      <button onClick={() => handleDelete(tag.id)} style={{ padding: '3px 8px', background: t.danger, color: '#fff', border: `1px solid #a00`, borderRadius: t.radiusSm, boxShadow: t.bevelOut, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>Yes</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ padding: '3px 8px', background: t.surface2, border: `1px solid ${t.border}`, borderRadius: t.radiusSm, boxShadow: t.bevelOut, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>No</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => { setEditingId(tag.id); setEditName(tag.name) }} style={{ padding: '3px 8px', background: t.surface2, border: `1px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, color: t.text2, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => setDeleteConfirm(tag.id)} style={{ padding: '3px 8px', background: t.surface2, border: `1px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, color: t.textMuted, cursor: 'pointer' }}>Delete</button>
                    </div>
                  )}
                </>)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
