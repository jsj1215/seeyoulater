import { useEffect, useRef, useState } from 'react'
import { t } from '../styles/theme'

interface Props { onSearch: (keyword: string) => void }

export default function SearchBar({ onSearch }: Props) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(value), 300)
    return () => clearTimeout(timer.current)
  }, [value, onSearch])

  return (
    <div style={{ padding: '6px 0' }}>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search bookmarks..."
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '6px 10px',
          borderRadius: t.radiusSm,
          border: `2px solid ${focused ? t.primary : t.border}`,
          background: t.surface,
          color: t.text,
          fontSize: 13,
          outline: 'none',
          fontFamily: "'Courier New', Monaco, monospace",
          boxShadow: t.bevelIn,
          display: 'block',
        }}
      />
    </div>
  )
}
