import { useNavigate } from 'react-router-dom'
import { t } from '../styles/theme'

export default function MenuBar() {
  const navigate = useNavigate()

  const navBtn = (label: string, path: string) => (
    <button key={path} onClick={() => navigate(path)}
      style={{
        padding: '4px 8px', cursor: 'pointer',
        fontFamily: "'Courier New', Monaco, monospace", fontSize: 12,
        color: t.text2, background: 'transparent',
        border: 'none', borderRadius: t.radiusSm,
        whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >{label}</button>
  )

  return (
    <div style={{
      background: t.surface2, borderBottom: `2px solid ${t.border}`,
      padding: '3px 4px', display: 'flex', gap: 0, flexWrap: 'nowrap',
      overflowX: 'auto', scrollbarWidth: 'none',
      position: 'relative', zIndex: 100,
    }}>
      {navBtn('Home', '/')}
      {navBtn('All', '/view')}
      {navBtn('Folders', '/folders')}
      {navBtn('Tags', '/tags')}
      {navBtn('From', '/from')}
      {navBtn('Calendar', '/calendar')}
      {navBtn('Discover', '/plaza')}
    </div>
  )
}
