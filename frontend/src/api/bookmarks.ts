import client from './client'
import type { FolderInfo } from './folders'

export interface TagInfo { id: number; name: string }
export interface Bookmark {
  id: number
  url: string
  title: string | null
  thumbnailUrl: string | null
  memo: string | null
  tags: TagInfo[]
  folder: FolderInfo | null
  rating: number
  createdAt: string
  updatedAt: string
}

export interface BookmarkPage {
  content: Bookmark[]
  totalElements: number
  totalPages: number
  number: number
  last: boolean
}

export interface BookmarkRequest {
  url: string
  title?: string
  thumbnailUrl?: string
  memo?: string
  tagNames?: string[]
  folderId?: number | null
}

export const getBookmarks = (params: {
  page?: number; size?: number; keyword?: string; tagIds?: number[]; folderId?: number | null
  sortBy?: 'newest' | 'oldest' | 'starred'; starredOnly?: boolean
}) => client.get<BookmarkPage>('/bookmarks', { params }).then(r => r.data)

export const createBookmark = (data: BookmarkRequest) =>
  client.post<Bookmark>('/bookmarks', data).then(r => r.data)

export const getBookmark = (id: number) =>
  client.get<Bookmark>(`/bookmarks/${id}`).then(r => r.data)

export const updateBookmark = (id: number, data: BookmarkRequest) =>
  client.put<Bookmark>(`/bookmarks/${id}`, data).then(r => r.data)

export const updateRating = (id: number, rating: number) =>
  client.patch<Bookmark>(`/bookmarks/${id}/rating`, { rating }).then(r => r.data)

export const deleteBookmark = (id: number) =>
  client.delete(`/bookmarks/${id}`)
