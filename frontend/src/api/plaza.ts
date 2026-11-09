import client from './client'

export interface PublicFolderInfo {
  id: number
  name: string
  ownerName: string
  bookmarkCount: number
  createdAt: string
}

export interface PublicBookmark {
  id: number
  url: string
  title: string | null
  thumbnailUrl: string | null
  createdAt: string
}

export const getPublicFolders = () =>
  client.get<PublicFolderInfo[]>('/public/folders').then(r => r.data)

export const getPublicFolderBookmarks = (id: number) =>
  client.get<PublicBookmark[]>(`/public/folders/${id}/bookmarks`).then(r => r.data)

export const forkFolder = (id: number) =>
  client.post(`/folders/${id}/fork`).then(r => r.data)

export const toggleVisibility = (id: number) =>
  client.patch(`/folders/${id}/visibility`).then(r => r.data)
