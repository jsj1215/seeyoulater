// 백엔드 입력 제한과 맞춘 값
export const LIMITS = {
  memo: 10000,
  tagCount: 30,
  tagName: 100,
  passwordMin: 8,
  passwordMax: 72,
} as const

export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
