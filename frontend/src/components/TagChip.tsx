import { t } from '../styles/theme'

interface Props {
  name: string
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
}

const isPerson = (name: string) => name.startsWith('@')

export default function TagChip({ name, selected, onClick, onRemove }: Props) {
  const person = isPerson(name)
  const displayName = person ? name.slice(1) : name
  const prefix = person ? '👤' : '#'

  const bg = selected
    ? person ? t.coral : t.primary
    : person ? 'rgba(232,93,58,0.12)' : '#d4c8b4'

  const color = selected
    ? '#fff'
    : person ? t.coral : t.text2

  const border = selected
    ? person ? t.coral : t.primary
    : t.border

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: t.radiusSm,
        fontSize: 11, fontFamily: "'Courier New', Monaco, monospace",
        background: bg, color, border: `1px solid ${border}`,
        boxShadow: selected ? t.bevelIn : t.bevelOut,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap', userSelect: 'none',
      }}
    >
      {prefix}{displayName}
      {onRemove && (
        <span onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ fontSize: 10, cursor: 'pointer' }}>x</span>
      )}
    </span>
  )
}
