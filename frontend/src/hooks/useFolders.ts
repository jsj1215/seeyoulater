import { useState, useEffect, useCallback } from 'react'
import { getFolders, createFolder, deleteFolder } from '../api/folders'
import type { FolderInfo } from '../api/folders'

export function useFolders() {
  const [folders, setFolders] = useState<FolderInfo[]>([])

  const load = useCallback(() => {
    getFolders().then(setFolders).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const addFolder = async (name: string) => {
    const f = await createFolder(name)
    setFolders(prev => [...prev, f])
    return f
  }

  const removeFolder = async (id: number) => {
    await deleteFolder(id)
    setFolders(prev => prev.filter(f => f.id !== id))
  }

  return { folders, setFolders, addFolder, removeFolder, reload: load }
}
