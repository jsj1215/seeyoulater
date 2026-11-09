import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, initialized } = useAuthStore()
  if (!initialized) return <div style={{ padding: 20 }}>로딩 중...</div>
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}
