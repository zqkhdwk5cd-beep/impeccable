import React, { useEffect, useRef, useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { usePrivate } from '../context/PrivateContext'

export default function PrivateLock({ children }: { children: React.ReactNode }) {
  const { isUnlocked, hasPassword, unlock, setPassword, lock } = usePrivate()
  const [input, setInput] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Lock automatically when leaving this page
  useEffect(() => {
    return () => { lock() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isUnlocked) return <>{children}</>

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input) return
    setChecking(true)
    const ok = await unlock(input)
    if (!ok) { setError('باسورد خاطئ'); setInput('') }
    setChecking(false)
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input || input.length < 4) return setError('الباسورد قصير جداً (4 أحرف على الأقل)')
    if (input !== confirm) return setError('الباسوردان غير متطابقين')
    await setPassword(input)
    setInput('')
    setConfirm('')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-slate-900 px-6 py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Private</h2>
          <p className="text-slate-400 text-sm mt-1">
            {hasPassword ? 'أدخل الباسورد للمتابعة' : 'عيّن باسورد للقسم الخاص'}
          </p>
        </div>

        <form onSubmit={hasPassword ? handleUnlock : handleSetPassword} className="p-6 space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? 'text' : 'password'}
              value={input}
              onChange={(e) => { setInput(e.target.value); setError('') }}
              placeholder={hasPassword ? 'الباسورد' : 'باسورد جديد'}
              className="input w-full pl-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {!hasPassword && (
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError('') }}
              placeholder="تأكيد الباسورد"
              className="input w-full"
            />
          )}

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={checking || !input}
            className="btn-primary w-full justify-center"
          >
            {checking ? 'جاري التحقق...' : hasPassword ? 'فتح' : 'تعيين الباسورد'}
          </button>
        </form>
      </div>
    </div>
  )
}
