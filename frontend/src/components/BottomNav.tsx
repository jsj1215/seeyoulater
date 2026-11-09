import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { t } from '../styles/theme'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const isHome = location.pathname === '/'
  const [homePressed, setHomePressed] = useState(false)
  const [addPressed, setAddPressed] = useState(false)
  const [logoutPressed, setLogoutPressed] = useState(false)

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 390,
      display: 'flex',
      alignItems: 'center',
      background: t.surface2,
      borderTop: `2px solid ${t.border}`,
      boxShadow: `0 -1px 0 #fefef4`,
      zIndex: 100,
      padding: '6px 0',
    }}>
      {/* Home */}
      <button
        onClick={() => navigate('/')}
        onMouseDown={() => setHomePressed(true)}
        onMouseUp={() => setHomePressed(false)}
        onMouseLeave={() => setHomePressed(false)}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          padding: '6px 0',
          cursor: 'pointer',
        }}
      >
        <span style={{
          display: 'inline-block',
          padding: '4px 10px',
          background: isHome ? t.primary : '#d4c8b4',
          color: isHome ? t.textOnDark : t.text2,
          border: `1px solid ${t.border}`,
          borderRadius: t.radiusSm,
          boxShadow: homePressed ? t.bevelIn : t.bevelOut,
          fontFamily: "'Courier New', Monaco, monospace",
          fontSize: 12,
        }}>
          홈
        </span>
      </button>

      {/* Add */}
      <button
        onClick={() => navigate('/add')}
        onMouseDown={() => setAddPressed(true)}
        onMouseUp={() => setAddPressed(false)}
        onMouseLeave={() => setAddPressed(false)}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          padding: '4px 0',
          cursor: 'pointer',
        }}
      >
        <span style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          background: t.primary,
          color: '#fff',
          fontSize: 22,
          fontWeight: 300,
          lineHeight: 1,
          border: `2px solid ${t.borderDark}`,
          borderRadius: t.radiusSm,
          boxShadow: addPressed ? t.bevelIn : t.bevelOut,
        }}>+</span>
        <span style={{
          fontSize: 10,
          fontFamily: "'Courier New', Monaco, monospace",
          color: t.text2,
        }}>저장</span>
      </button>

      {/* Logout */}
      <button
        onClick={logout}
        onMouseDown={() => setLogoutPressed(true)}
        onMouseUp={() => setLogoutPressed(false)}
        onMouseLeave={() => setLogoutPressed(false)}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          padding: '6px 0',
          cursor: 'pointer',
        }}
      >
        <span style={{
          display: 'inline-block',
          padding: '4px 10px',
          background: '#d4c8b4',
          color: t.text2,
          border: `1px solid ${t.border}`,
          borderRadius: t.radiusSm,
          boxShadow: logoutPressed ? t.bevelIn : t.bevelOut,
          fontFamily: "'Courier New', Monaco, monospace",
          fontSize: 12,
        }}>
          나가기
        </span>
      </button>
    </nav>
  )
}
