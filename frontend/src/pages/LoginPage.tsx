import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { t } from '../styles/theme'
import { getErrorMessage, getErrorStatus } from '../api/client'

const TrafficLights = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff6b5b', border: '1px solid #d94f42' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffd055', border: '1px solid #d4a800' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#4dbb5f', border: '1px solid #3a9a4a' }} />
  </div>
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [pressedBtn, setPressedBtn] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(getErrorStatus(err) === 429
        ? getErrorMessage(err, '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요')
        : '이메일 또는 비밀번호가 올바르지 않습니다')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    padding: '8px 10px',
    borderRadius: t.radiusSm,
    border: `2px solid ${t.border}`,
    background: t.surface2,
    color: t.text,
    fontSize: 14,
    outline: 'none',
    display: 'block',
    fontFamily: "'Courier New', Monaco, monospace",
    boxShadow: focusedField === field
      ? `${t.bevelIn}, 0 0 0 1px ${t.primary}`
      : t.bevelIn,
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 320 }}>
        {/* Mac OS Window */}
        <div style={{
          background: t.surface,
          border: `2px solid ${t.border}`,
          boxShadow: t.bevelOut,
          borderRadius: t.radius,
          overflow: 'hidden',
        }}>
          {/* Title Bar */}
          <div style={{
            background: t.titleBar,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            position: 'relative',
          }}>
            <TrafficLights />
            <span style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#fff',
              fontSize: 12,
              fontFamily: "'Courier New', Monaco, monospace",
              fontWeight: 'bold',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}>
              seeyoulater.app
            </span>
          </div>

          {/* Window Body */}
          <div style={{ padding: '24px 20px' }}>
            {/* Logo */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: "'Courier New', Monaco, monospace",
                fontSize: 28,
                fontWeight: 'bold',
                color: t.primary,
                letterSpacing: '-1px',
                lineHeight: 1,
              }}>
                seeyoulater_
              </div>
              <div style={{
                fontFamily: "'Courier New', Monaco, monospace",
                fontSize: 12,
                color: t.textMuted,
                marginTop: 6,
              }}>
                // save it. see it later.
              </div>
            </div>

            <form onSubmit={submit}>
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="user@example.com"
                required
                style={inputStyle('email')}
              />

              <label style={{ ...labelStyle, marginTop: 12 }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                required
                style={inputStyle('password')}
              />

              {error && (
                <p style={{
                  color: t.danger,
                  fontSize: 12,
                  marginTop: 8,
                  fontFamily: "'Courier New', Monaco, monospace",
                }}>
                  ! {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                onMouseDown={() => setPressedBtn(true)}
                onMouseUp={() => setPressedBtn(false)}
                onMouseLeave={() => setPressedBtn(false)}
                style={{
                  width: '100%',
                  marginTop: 20,
                  padding: '8px 16px',
                  borderRadius: t.radiusSm,
                  background: '#d4c8b4',
                  color: t.text,
                  fontSize: 14,
                  fontWeight: 'bold',
                  fontFamily: "'Courier New', Monaco, monospace",
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  border: `2px solid ${t.border}`,
                  boxShadow: (pressedBtn && !loading) ? t.bevelIn : t.bevelOut,
                  letterSpacing: '0.03em',
                }}
              >
                {loading ? '[ logging in... ]' : '[ Login ]'}
              </button>
            </form>

            <p style={{
              marginTop: 16,
              textAlign: 'center',
              fontSize: 12,
              color: t.text2,
              fontFamily: "'Courier New', Monaco, monospace",
            }}>
              계정이 없으신가요?{' '}
              <Link to="/signup" style={{ color: t.primary, fontWeight: 'bold' }}>회원가입</Link>
            </p>
          </div>

          {/* Status Bar */}
          <div style={{
            background: t.surface2,
            borderTop: `1px solid ${t.border}`,
            padding: '4px 10px',
            fontSize: 11,
            fontFamily: "'Courier New', Monaco, monospace",
            color: t.textMuted,
          }}>
            {loading ? '● Connecting...' : '● Ready'}
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 'bold',
  color: t.text2,
  marginBottom: 4,
  fontFamily: "'Courier New', Monaco, monospace",
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}
