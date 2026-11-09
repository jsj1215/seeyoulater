import client from './client'

export interface Stats { total: number; folders: number; starred: number }

export const getStats = () =>
  client.get<Stats>('/stats').then(r => r.data)
