import { useState, useEffect } from 'react'
import { getTags } from '../api/tags'
import type { TagInfo } from '../api/bookmarks'

export function useTags() {
  const [tags, setTags] = useState<TagInfo[]>([])

  useEffect(() => {
    getTags().then(setTags).catch(() => {})
  }, [])

  return { tags, setTags }
}
