import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, apiStatus, fetchCsrfCookie } from '../../lib/api-client'
import { setLanguage } from '../../i18n'
import type { User } from '../../types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  updateLocale: (locale: User['locale']) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore the session on page load. 401 simply means "not signed in".
  useEffect(() => {
    api
      .get<{ data: User }>('/user')
      .then((res) => {
        setUser(res.data.data)
        void setLanguage(res.data.data.locale)
      })
      .catch((err) => {
        if (apiStatus(err) !== 401) console.error(err)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await fetchCsrfCookie()
    const res = await api.post<{ data: User }>('/login', { email, password })
    setUser(res.data.data)
    void setLanguage(res.data.data.locale) // user preference wins after sign-in
    return res.data.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const updateLocale = useCallback(
    async (locale: User['locale']) => {
      await setLanguage(locale)
      if (user) {
        const res = await api.patch<{ data: User }>('/user/profile', { locale })
        setUser(res.data.data)
      }
    },
    [user],
  )

  const value = useMemo(() => ({ user, loading, login, logout, updateLocale }), [user, loading, login, logout, updateLocale])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export const homeFor = (role: User['role']) => (role === 'admin' ? '/admin/dashboard' : '/pos')
