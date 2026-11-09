import { create } from 'zustand'
import { getMe } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'

interface AuthState {
  isLoggedIn: boolean
  email: string | null
  initialized: boolean
  setLoggedIn: (email: string) => void
  setLoggedOut: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  email: null,
  initialized: false,

  setLoggedIn: (email) => set({ isLoggedIn: true, email }),
  setLoggedOut: () => set({ isLoggedIn: false, email: null }),

  initialize: async () => {
    try {
      const me = await getMe()
      set({ isLoggedIn: true, email: me.email, initialized: true })
    } catch {
      set({ isLoggedIn: false, email: null, initialized: true })
    }
  },
}))

setUnauthorizedHandler(() => useAuthStore.getState().setLoggedOut())
