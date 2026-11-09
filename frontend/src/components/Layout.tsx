import type { ReactNode } from 'react'
import { useAuthStore } from '../store/authStore'
import MenuBar from './MenuBar'
import BottomNav from './BottomNav'
import { t } from '../styles/theme'

interface Props { children: ReactNode }

export default function Layout({ children }: Props) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  return (
    <div style={{
      maxWidth: 390,
      margin: '0 auto',
      minHeight: '100vh',
      background: t.bg,
      position: 'relative',
      border: '1px solid #c4b49a',
      boxShadow: '2px 2px 8px rgba(0,0,0,0.2)',
    }}>
      {/* Global sticky MenuBar — always above page title bars */}
      {isLoggedIn && (
        <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
          <MenuBar />
        </div>
      )}
      {children}
      {/* Global BottomNav — all pages */}
      {isLoggedIn && <BottomNav />}
    </div>
  )
}
