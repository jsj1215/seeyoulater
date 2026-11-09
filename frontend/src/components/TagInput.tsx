import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import TagChip from './TagChip'
import { t } from '../styles/theme'
import { LIMITS } from '../utils/validation'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  personMode?: boolean
  // 이 입력에서 더 추가할 수 있는 최대 개수 (태그와 FROM을 합쳐 30개 제한)
  maxTags?: number
}

export default function TagInput({ tags, onChange, suggestions = [], placeholder, personMode = false, maxTags = LIMITS.tagCount }: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)

  const add = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || tags.length >= maxTags) { setInput(''); return }
    const final = personMode ? (trimmed.startsWith('@') ? trimmed : `@${trimmed}`) : trimmed
    if (!tags.includes(final)) onChange([...tags, final])
    setInput('')
  }

  const remove = (name: string) => onChange(tags.filter(tag => tag !== name))

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1])
  }

  const filtered = suggestions.filter(s => {
    const sLower = s.toLowerCase()
    const inputLower = input.toLowerCase()
    const tagKey = personMode ? `@${s}` : s
    return sLower.includes(inputLower) && !tags.includes(tagKey)
  })

  const focusColor = personMode ? t.coral : t.primary

  return (
    <div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        padding: '8px 10px', border: `2px solid ${focused ? focusColor : t.border}`,
        borderRadius: t.radiusSm, minHeight: 44,
        background: t.surface, boxShadow: t.bevelIn,
        boxSizing: 'border-box', width: '100%',
      }}>
        {tags.map(tag => <TagChip key={tag} name={tag} onRemove={() => remove(tag)} />)}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={personMode ? LIMITS.tagName - 1 : LIMITS.tagName}
          disabled={tags.length >= maxTags}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); if (input.trim()) add(input) }}
          placeholder={tags.length >= maxTags ? `최대 ${LIMITS.tagCount}개` : tags.length === 0 ? (placeholder ?? 'Add tag, press Enter') : ''}
          style={{
            border: 'none', outline: 'none', fontSize: 13,
            minWidth: 120, flex: 1, background: 'transparent',
            color: t.text, fontFamily: "'Courier New', Monaco, monospace",
          }}
        />
      </div>
      {input && filtered.length > 0 && (
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 0, marginTop: 2, overflow: 'hidden', background: t.surface, boxShadow: t.bevelOut }}>
          {filtered.slice(0, 5).map(s => (
            <div key={s} onClick={() => add(s)}
              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, color: personMode ? t.coral : t.text2, fontFamily: "'Courier New', Monaco, monospace", borderBottom: `1px solid ${t.border}` }}
              onMouseEnter={e => (e.currentTarget.style.background = t.surface2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {personMode ? `👤 ${s}` : `#${s}`}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
