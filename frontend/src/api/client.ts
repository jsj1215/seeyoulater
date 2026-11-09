import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  // 배열을 tagIds=1&tagIds=2 형태로 보냄. axios 기본값(tagIds[]=1)은 Spring @RequestParam List가 받지 못함
  paramsSerializer: { indexes: null },
})

// 인증 확인/로그인 요청의 401은 화면에서 직접 처리하므로 전역 로그아웃 대상에서 제외
const AUTH_PATHS = ['/auth/me', '/auth/login', '/auth/signup', '/auth/logout']

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !AUTH_PATHS.includes(error.config?.url)) {
      // 로그아웃 상태로 전환하면 ProtectedRoute가 /login으로 보냄
      onUnauthorized?.()
    }
    return Promise.reject(error)
  }
)

// 서버 에러 응답({ message } 또는 { error })에서 사용자에게 보여줄 메시지를 꺼냄
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown; error?: unknown } | undefined
    const msg = data?.message ?? data?.error
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

export const getErrorStatus = (err: unknown): number | undefined =>
  axios.isAxiosError(err) ? err.response?.status : undefined

export default client
