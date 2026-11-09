import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { login as apiLogin, logout as apiLogout, signup as apiSignup } from '../api/auth'

// PWA가 만든 Cache Storage에 이전 사용자 데이터가 남지 않도록 비움
async function clearCacheStorage() {
  if (typeof caches === 'undefined') return
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map(key => caches.delete(key)))
  } catch {
    // 캐시 정리 실패는 로그아웃을 막지 않음
  }
}

export function useAuth() {
  const { isLoggedIn, email, initialized, setLoggedIn, setLoggedOut } = useAuthStore()
  const navigate = useNavigate()

  const login = async (email: string, password: string) => {
    await apiLogin(email, password)
    setLoggedIn(email)
  }

  const signup = async (email: string, password: string) => {
    await apiSignup(email, password)
    setLoggedIn(email)
  }

  const logout = async () => {
    try {
      await apiLogout()
    } finally {
      setLoggedOut()
      await clearCacheStorage()
      navigate('/login', { replace: true })
    }
  }

  return { isLoggedIn, email, initialized, login, signup, logout }
}
