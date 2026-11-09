import { useEffect, useRef, useState } from 'react'
import { fetchOg } from '../api/ogfetch'
import type { OgMetadata } from '../api/ogfetch'
import { getErrorMessage, getErrorStatus } from '../api/client'
import { isHttpUrl } from '../utils/validation'
import { t } from '../styles/theme'

interface Props {
  url: string
  onFetched: (meta: OgMetadata) => void
}

export default function OgPreview({ url, onFetched }: Props) {
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<OgMetadata | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!isHttpUrl(url)) return
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      setErrorMsg('')
      try {
        const data = await fetchOg(url)
        setMeta(data)
        onFetched(data)
      } catch (err) {
        setMeta(null)
        if (getErrorStatus(err) === 429) setErrorMsg(getErrorMessage(err, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요'))
      } finally {
        setLoading(false)
      }
    }, 500)
    return () => clearTimeout(timer.current)
  }, [url])

  if (!url) return null
  // http(s)가 아닌 값이면 이전 미리보기 결과를 보여주지 않음
  const visibleMeta = isHttpUrl(url) ? meta : null
  const visibleError = isHttpUrl(url) ? errorMsg : ''

  if (loading) return (
    <div style={{
      padding: '10px 14px',
      color: t.textMuted,
      fontSize: 12,
      fontFamily: "'Courier New', Monaco, monospace",
      background: t.surface2,
      border: `1px solid ${t.border}`,
      borderRadius: t.radiusSm,
      margin: '8px 0',
      boxShadow: t.bevelIn,
    }}>
      [ Loading preview... ]
    </div>
  )

  if (!visibleMeta?.title && !visibleMeta?.thumbnailUrl) return (
    <div style={{
      padding: '10px 14px',
      color: t.textMuted,
      fontSize: 12,
      fontFamily: "'Courier New', Monaco, monospace",
      background: t.surface2,
      border: `1px solid ${t.border}`,
      borderRadius: t.radiusSm,
      margin: '8px 0',
      boxShadow: t.bevelIn,
    }}>
      {visibleError ? `! ${visibleError}` : '[ No preview available ]'}
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      padding: 12,
      background: t.surface2,
      border: `1px solid ${t.border}`,
      borderRadius: t.radiusSm,
      margin: '8px 0',
      boxShadow: t.bevelIn,
    }}>
      {isHttpUrl(visibleMeta.thumbnailUrl) && (
        <img
          src={visibleMeta.thumbnailUrl}
          alt=""
          referrerPolicy="no-referrer"
          style={{
            width: 52,
            height: 52,
            objectFit: 'cover',
            borderRadius: t.radiusSm,
            border: `1px solid ${t.border}`,
            flexShrink: 0,
          }}
          onError={e => (e.currentTarget.style.display = 'none')}
        />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: t.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {visibleMeta.title}
        </div>
        {visibleMeta.description && (
          <div style={{
            fontSize: 12,
            color: t.text2,
            marginTop: 3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: "'Courier New', Monaco, monospace",
          }}>
            {visibleMeta.description}
          </div>
        )}
      </div>
    </div>
  )
}
