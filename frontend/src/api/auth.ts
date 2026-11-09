import client from './client'

export interface UserInfo { id: number; email: string }

export const signup = (email: string, password: string) =>
  client.post<UserInfo>('/auth/signup', { email, password }).then(r => r.data)

export const login = (email: string, password: string) =>
  client.post<{ email: string }>('/auth/login', { email, password }).then(r => r.data)

export const logout = () =>
  client.post('/auth/logout')

export const getMe = () =>
  client.get<UserInfo>('/auth/me').then(r => r.data)
