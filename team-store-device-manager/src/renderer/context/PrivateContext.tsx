import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'
import bcrypt from 'bcryptjs'

interface PrivateContextType {
  isUnlocked: boolean
  hasPassword: boolean
  unlock: (password: string) => Promise<boolean>
  lock: () => void
  setPassword: (password: string) => Promise<void>
  removePassword: () => Promise<void>
}

const PrivateContext = createContext<PrivateContextType | null>(null)

export function PrivateProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [hash, setHash] = useState<string | null>(null)

  useEffect(() => {
    api.settings.get('private_password_hash').then((v) => setHash(v || null)).catch(() => {})
  }, [])

  const hasPassword = !!hash

  const unlock = async (password: string): Promise<boolean> => {
    if (!hash) { setIsUnlocked(true); return true }
    const ok = bcrypt.compareSync(password, hash)
    if (ok) setIsUnlocked(true)
    return ok
  }

  const lock = () => setIsUnlocked(false)

  const setPassword = async (password: string) => {
    const newHash = bcrypt.hashSync(password, 10)
    await api.settings.update({ private_password_hash: newHash })
    setHash(newHash)
  }

  const removePassword = async () => {
    await api.settings.update({ private_password_hash: '' })
    setHash(null)
    setIsUnlocked(false)
  }

  return (
    <PrivateContext.Provider value={{ isUnlocked, hasPassword, unlock, lock, setPassword, removePassword }}>
      {children}
    </PrivateContext.Provider>
  )
}

export function usePrivate() {
  const ctx = useContext(PrivateContext)
  if (!ctx) throw new Error('usePrivate must be used within PrivateProvider')
  return ctx
}
