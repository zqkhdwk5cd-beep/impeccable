import React, { createContext, useContext, useState, useEffect } from 'react'

interface AuthUser {
  id: number
  name: string
  username: string
  role: 'admin' | 'employee'
}

interface AuthContextValue {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  isAdmin: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem('ts_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = (u: AuthUser) => {
    setUser(u)
    sessionStorage.setItem('ts_user', JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('ts_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
