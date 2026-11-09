import client from './client'
import type { BookmarkPage } from './bookmarks'

export const getBookmarkDates = (year: number, month: number) =>
  client.get<string[]>('/bookmarks/dates', { params: { year, month } }).then(r => r.data)

export const getBookmarksByDate = (date: string, page = 0) =>
  client.get<BookmarkPage>('/bookmarks', { params: { date, page, size: 50 } }).then(r => r.data)
