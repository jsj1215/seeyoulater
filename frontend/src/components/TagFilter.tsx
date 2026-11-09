import type { TagInfo } from '../api/bookmarks'
import TagChip from './TagChip'
import { t } from '../styles/theme'

interface Props {
  tags: TagInfo[]
  selectedIds: number[]
  onToggle: (id: number) => void
}

export default function TagFilter({ tags, selectedIds, onToggle }: Props) {
  if (tags.length === 0) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      overflowX: 'auto',
      padding: '6px 0 10px',
      scrollbarWidth: 'none',
      minWidth: 0,
      flexWrap: 'nowrap',
    }}>
      <span style={{ fontSize: 11, color: t.textMuted, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.05em' }}>
        ✦ 태그
      </span>
      {tags.map(tag => (
        <TagChip
          key={tag.id}
          name={tag.name}
          selected={selectedIds.includes(tag.id)}
          onClick={() => onToggle(tag.id)}
        />
      ))}
    </div>
  )
}
