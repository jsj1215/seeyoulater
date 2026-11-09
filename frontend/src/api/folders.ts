import client from './client'

export interface FolderInfo {
  id: number
  name: string
  isPublic?: boolean
  bookmarkCount?: number
  createdAt: string
}

export const getFolders = () =>
  client.get<FolderInfo[]>('/folders').then(r => r.data)

export const createFolder = (name: string) =>
  client.post<FolderInfo>('/folders', { name }).then(r => r.data)

export const renameFolder = (id: number, name: string) =>
  client.put<FolderInfo>(`/folders/${id}`, { name }).then(r => r.data)

export const deleteFolder = (id: number) =>
  client.delete(`/folders/${id}`)

export const reorderFolders = (ids: number[]) =>
  client.put('/folders/order', { ids })
