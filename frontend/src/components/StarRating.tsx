import { useState } from 'react'
import { t } from '../styles/theme'

interface Props {
  rating: number
  onChange?: (rating: number) => void
  size?: number
  readonly?: boolean
}

export default function StarRating({ rating, onChange, size = 16, readonly = false }: Props) {
  const [hovered, setHovered] = useState(0)

  const displayed = hovered || rating

  return (
    <div
      style={{ display: 'inline-flex', gap: 2, cursor: readonly ? 'default' : 'pointer' }}
      onMouseLeave={() => !readonly && setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onMouseEnter={() => !readonly && setHovered(star)}
          onClick={() => {
            if (readonly || !onChange) return
            onChange(star === rating ? 0 : star)
          }}
          style={{
            fontSize: size,
            lineHeight: 1,
            color: star <= displayed ? t.yellow : t.border,
            transition: 'color 0.1s',
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}
