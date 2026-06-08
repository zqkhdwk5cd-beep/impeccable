import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { Store, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await api.auth.login(form.username, form.password)
      if (result.success && result.user) {
        login(result.user)
        navigate('/')
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة')
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في تسجيل الدخول')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Team Store</h1>
          <p className="text-slate-400 mt-1">نظام إدارة الأجهزة</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">تسجيل الدخول</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="input pr-9"
                  placeholder="أدخل اسم المستخدم"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pr-9"
                  placeholder="أدخل كلمة المرور"
                />
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
