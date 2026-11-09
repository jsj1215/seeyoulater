import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function ShareTargetPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { isLoggedIn, initialized } = useAuthStore()

  useEffect(() => {
    if (!initialized) return
    const url = params.get('url') || params.get('text') || ''
    const title = params.get('title') || ''
    if (!isLoggedIn) {
      sessionStorage.setItem('shareUrl', url)
      sessionStorage.setItem('shareTitle', title)
      navigate('/login')
      return
    }
    navigate('/add', { state: { url, title } })
  }, [initialized, isLoggedIn])

  return <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>링크 처리 중...</div>
}
