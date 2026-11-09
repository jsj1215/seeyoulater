import client from './client'
import type { TagInfo } from './bookmarks'

export const getTags = () =>
  client.get<TagInfo[]>('/tags').then(r => r.data)

export const renameTag = (id: number, name: string) =>
  client.put<TagInfo>(`/tags/${id}`, { name }).then(r => r.data)

export const deleteTag = (id: number) =>
  client.delete(`/tags/${id}`)

export const reorderTags = (ids: number[]) =>
  client.put('/tags/order', { ids })
