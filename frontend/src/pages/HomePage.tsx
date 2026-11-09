import { useEffect, useCallback, useState } from 'react'
import { useBookmarks } from '../hooks/useBookmarks'
import { useFolders } from '../hooks/useFolders'
import SearchBar from '../components/SearchBar'
import LinkCard from '../components/LinkCard'
import { t } from '../styles/theme'
import { createFolder } from '../api/folders'
import type { FolderInfo } from '../api/folders'
import { getStats } from '../api/stats'
import type { Stats } from '../api/stats'
import { getErrorMessage } from '../api/client'

type ViewMode = 'list' | 'folders'

const FOLDER_COLORS = ['#e85d3a','#1a6b5a','#2c5f8a','#f0b429','#a855f7','#ec4899','#0891b2','#16a34a']

const TrafficLights = ({ size = 10 }: { size?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#ff6b5b', border: '1px solid #d94f42' }} />
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#ffd055', border: '1px solid #d4a800' }} />
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#4dbb5f', border: '1px solid #3a9a4a' }} />
  </div>
)

function FolderCard({ folder, name, color, onClick }: { folder: FolderInfo | null; name: string; color?: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const accent = color ?? t.primary
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? t.surface2 : t.surface, border: `2px solid ${hovered ? accent : t.border}`, boxShadow: hovered ? t.bevelIn : t.bevelOut, borderRadius: t.radiusSm, overflow: 'hidden', cursor: 'pointer', textAlign: 'center', transition: 'all 0.1s' }}
    >
      {/* Colored top strip */}
      <div style={{ height: 6, background: accent }} />
      <div style={{ padding: '12px 8px 14px' }}>
        <div style={{ fontSize: 28, marginBottom: 6, lineHeight: 1 }}>
          {folder === null ? '🗂️' : folder.id === -1 ? '📂' : '📁'}
        </div>
        <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, color: hovered ? accent : t.text, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { bookmarks, loading, hasMore, loadMore, reset } = useBookmarks()
  const { folders, reload: reloadFolders } = useFolders()
  const [keyword, setKeyword] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    getStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    if (viewMode === 'list') {
      reset(keyword || undefined,
        selectedTagIds.length ? selectedTagIds : undefined,
        selectedFolderId)
      Promise.resolve().then(loadMore)
    }
  }, [keyword, selectedTagIds, selectedFolderId, viewMode])

  const handleSearch = useCallback((kw: string) => setKeyword(kw), [])

  const handleFolderCardClick = (id: number | null) => {
    setSelectedFolderId(id)
    setSelectedTagIds([])
    setViewMode('list')
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await createFolder(newFolderName.trim())
      reloadFolders()
      setNewFolderName('')
      setShowNewFolder(false)
    } catch (err) {
      alert(getErrorMessage(err, '폴더 생성 실패'))
    }
  }

  const now = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

  const activeLabel = viewMode === 'folders'
    ? 'By Folder'
    : selectedFolderId === null
      ? 'All Bookmarks'
      : selectedFolderId === -1
        ? 'Unfiled'
        : (folders.find(f => f.id === selectedFolderId)?.name ?? 'Folder')

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Title Bar */}
      <div style={{
        background: t.titleBar, padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 32, zIndex: 20,
      }}>
        <TrafficLights size={10} />
        <span style={{ color: '#fff', fontSize: 16, fontFamily: "'Courier New', Monaco, monospace", fontWeight: 'bold' }}>
          seeyoulater
        </span>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace" }}>
          {now}
        </span>
      </div>

      {/* Functional Menu Bar */}

      {/* Status bar */}
      <div style={{
        background: t.surface2, borderBottom: `1px solid ${t.border}`,
        padding: '3px 16px', fontSize: 11,
        fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>●</span>
        <span>{activeLabel}</span>
        {selectedTagIds.length > 0 && <span>· {selectedTagIds.length} tag(s)</span>}
        {viewMode === 'list' && <span style={{ marginLeft: 'auto' }}>{bookmarks.length} item(s)</span>}
        {viewMode === 'folders' && <span style={{ marginLeft: 'auto' }}>{folders.length + 1} folder(s)</span>}
      </div>

      {/* FOLDER VIEW */}
      {viewMode === 'folders' ? (
        <div style={{ padding: 12 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}>
            <FolderCard folder={null} name="All Bookmarks" color={t.blue} onClick={() => handleFolderCardClick(null)} />
            <FolderCard folder={{ id: -1, name: 'Unfiled', createdAt: '' }} name="Unfiled" color={t.textMuted} onClick={() => handleFolderCardClick(-1)} />
            {folders.map((f, i) => (
              <FolderCard key={f.id} folder={f} name={f.name} color={FOLDER_COLORS[i % FOLDER_COLORS.length]} onClick={() => handleFolderCardClick(f.id)} />
            ))}
            {/* New folder tile */}
            <div
              onClick={() => setShowNewFolder(true)}
              style={{
                background: t.surface,
                border: `2px dashed ${t.border}`,
                borderRadius: t.radiusSm,
                padding: '16px 12px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1, color: t.textMuted }}>+</div>
              <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 12, color: t.textMuted }}>
                New Folder
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          {stats && (
            <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, background: t.surface }}>
              {[
                { label: 'LINKS', value: stats.total, icon: '📌' },
                { label: 'FOLDERS', value: stats.folders, icon: '📁' },
                { label: 'STARRED', value: stats.starred, icon: '★' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, padding: '8px 0', textAlign: 'center', borderRight: i < 2 ? `1px solid ${t.border}` : 'none', boxShadow: t.bevelIn }}>
                  <div style={{ fontSize: 16, lineHeight: 1, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 16, fontWeight: 'bold', color: t.text }}>{s.value}</div>
                  <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 9, color: t.textMuted, letterSpacing: '0.05em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div style={{ padding: '8px 12px 0' }}>
            <SearchBar onSearch={handleSearch} />
          </div>

          {/* Bookmarks list */}
          {bookmarks.length === 0 && !loading ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 40, color: t.textMuted, marginBottom: 16 }}>[___]</div>
              <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 14, color: t.text2, marginBottom: 8 }}>[ No items found ]</div>
              <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 12, color: t.textMuted }}>File → New Bookmark to get started</div>
            </div>
          ) : (
            <div style={{ paddingTop: 10 }}>
              {bookmarks.map(b => (<LinkCard key={b.id} bookmark={b} onTagClick={tag => setSelectedTagIds(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])} />))}
            </div>
          )}

          {loading && (
            <div style={{ padding: 20, textAlign: 'center', color: t.textMuted, fontSize: 13, fontFamily: "'Courier New', Monaco, monospace" }}>
              Loading...
            </div>
          )}
          {hasMore && !loading && (
            <div style={{ padding: '12px 16px', textAlign: 'center' }}>
              <button onClick={loadMore} style={{ padding: '8px 24px', fontFamily: "'Courier New', Monaco, monospace", fontSize: 12, background: t.surface, border: `2px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radiusSm, cursor: 'pointer', color: t.text2 }}>
                [ Load More ]
              </button>
            </div>
          )}
        </>
      )}

      

      {/* New Folder Modal */}
      {showNewFolder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: t.surface, border: `2px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radius, overflow: 'hidden', width: 280 }}>
            <div style={{ background: t.titleBar, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrafficLights size={8} />
              <span style={{ color: '#fff', fontSize: 12, fontFamily: "'Courier New', Monaco, monospace", margin: '0 auto' }}>New Folder</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontFamily: "'Courier New', Monaco, monospace", color: t.text2, marginBottom: 8 }}>FOLDER NAME</div>
              <input
                autoFocus value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                placeholder="e.g. Design Resources"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: t.surface2, border: `2px solid ${t.border}`, boxShadow: t.bevelIn, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.text, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
                  style={{ flex: 1, padding: '8px', background: t.surface2, border: `2px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleCreateFolder}
                  style={{ flex: 1, padding: '8px', background: t.primary, color: t.textOnDark, border: `2px solid ${t.borderDark}`, boxShadow: t.bevelOut, borderRadius: t.radiusSm, fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, fontWeight: 'bold', cursor: 'pointer' }}>
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
