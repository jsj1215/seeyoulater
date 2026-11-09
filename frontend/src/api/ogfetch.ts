import client from './client'

export interface OgMetadata {
  title: string | null
  thumbnailUrl: string | null
  description: string | null
}

export const fetchOg = (url: string) =>
  client.get<OgMetadata>('/og', { params: { url } }).then(r => r.data)
