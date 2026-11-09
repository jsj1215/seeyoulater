import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPublicFolders, getPublicFolderBookmarks, forkFolder } from '../api/plaza'
import type { PublicFolderInfo, PublicBookmark } from '../api/plaza'
import { getErrorMessage, getErrorStatus } from '../api/client'
import LinkCard from '../components/LinkCard'
import { t } from '../styles/theme'

const FOLDER_COLORS = ['#e85d3a','#1a6b5a','#2c5f8a','#f0b429','#a855f7','#ec4899','#0891b2','#16a34a']

const TrafficLights = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    {['#ff6b5b','#ffd055','#4dbb5f'].map((c,i) => (
      <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: `1px solid ${i===0?'#d94f42':i===1?'#d4a800':'#3a9a4a'}` }} />
    ))}
  </div>
)

export default function PlazaPage() {
  const navigate = useNavigate()
  const [folders, setFolders] = useState<PublicFolderInfo[]>([])
  const [selectedFolder, setSelectedFolder] = useState<PublicFolderInfo | null>(null)
  const [bookmarks, setBookmarks] = useState<PublicBookmark[]>([])
  const [loadingBookmarks, setLoadingBookmarks] = useState(false)
  const [forking, setForking] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    getPublicFolders().then(setFolders).catch(() => {})
  }, [])

  const openFolder = async (folder: PublicFolderInfo) => {
    setSelectedFolder(folder)
    setLoadingBookmarks(true)
    try {
      const data = await getPublicFolderBookmarks(folder.id)
      setBookmarks(data)
    } catch {
      setBookmarks([])
    } finally {
      setLoadingBookmarks(false)
    }
  }

  const handleFork = async (folderId: number) => {
    setForking(folderId)
    try {
      await forkFolder(folderId)
      setToast('폴더를 내 계정으로 가져왔습니다!')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setToast(getErrorStatus(err) === 400
        ? '내가 공개한 폴더는 가져올 수 없습니다'
        : getErrorMessage(err, '가져오기 실패'))
      setTimeout(() => setToast(''), 3000)
    } finally {
      setForking(null)
    }
  }

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px', borderRadius: t.radiusSm, cursor: 'pointer', fontSize: 12,
    fontFamily: "'Courier New', Monaco, monospace",
    background: t.surface2, color: t.text,
    border: `2px solid ${t.border}`, boxShadow: t.bevelOut,
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
          Discover — Public Folders
        </span>
      </div>

      <div style={{ background: t.surface2, borderBottom: `2px solid ${t.border}`, padding: '3px 16px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted }}>
        ● {folders.length} public folder(s) shared by the community
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 58px)', minWidth: 0, overflow: 'hidden' }}>
        {/* Left: folder list */}
        <div style={{ width: 140, minWidth: 100, borderRight: `2px solid ${t.border}`, overflowY: 'auto', background: t.surface, flexShrink: 0 }}>
          {folders.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontFamily: "'Courier New', Monaco, monospace", fontSize: 12, color: t.textMuted }}>
              [ No public folders yet ]
            </div>
          ) : (
            folders.map((f, i) => (
              <div key={f.id}
                onClick={() => openFolder(f)}
                style={{
                  padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${t.border}`,
                  background: selectedFolder?.id === f.id ? t.surface2 : 'transparent',
                  borderLeft: `4px solid ${FOLDER_COLORS[i % FOLDER_COLORS.length]}`,
                }}
              >
                <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, fontWeight: 'bold', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📁 {f.name}
                </div>
                <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 10, color: t.textMuted, marginTop: 2 }}>
                  by @{f.ownerName}
                </div>
                <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 10, color: t.textMuted }}>
                  {f.bookmarkCount} links
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: folder content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
          {!selectedFolder ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 32, color: t.textMuted, marginBottom: 12 }}>🌐</div>
              <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.text2 }}>
                [ 왼쪽에서 폴더를 선택하세요 ]
              </div>
            </div>
          ) : (
            <>
              {/* Folder header */}
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}`, background: t.surface, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, fontWeight: 'bold', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📁 {selectedFolder.name}
                  </div>
                  <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 10, color: t.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    by @{selectedFolder.ownerName} · {selectedFolder.bookmarkCount} links
                  </div>
                </div>
                <button
                  onClick={() => handleFork(selectedFolder.id)}
                  disabled={forking === selectedFolder.id}
                  style={{ ...btnStyle, background: t.primary, color: t.textOnDark, border: `2px solid ${t.borderDark}`, fontWeight: 'bold', opacity: forking === selectedFolder.id ? 0.6 : 1, flexShrink: 0, fontSize: 11, padding: '4px 8px', whiteSpace: 'nowrap' }}
                >
                  {forking === selectedFolder.id ? '가져오는 중...' : '📥 가져오기'}
                </button>
              </div>

              {/* Bookmarks */}
              <div style={{ paddingTop: 10 }}>
                {loadingBookmarks ? (
                  <div style={{ padding: 24, textAlign: 'center', fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.textMuted }}>Loading...</div>
                ) : bookmarks.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.textMuted }}>[ No bookmarks ]</div>
                ) : (
                  bookmarks.map(b => <LinkCard key={b.id} bookmark={b} />)
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: t.surface, border: `2px solid ${t.border}`, boxShadow: t.bevelOut, color: t.text, padding: '8px 18px', borderRadius: t.radiusSm, fontSize: 13, fontFamily: "'Courier New', Monaco, monospace", zIndex: 200 }}>
          ● {toast}
        </div>
      )}
    </div>
  )
}
