import React, { useState } from 'react'
import { api } from '../lib/api'
import { Store, User, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface Props {
  onSetup: () => void
}

export default function SetupPage({ onSetup }: Props) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.username || !form.password) {
      setError('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }
    if (form.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setLoading(true)
    setError('')
    try {
      const user = await api.auth.createAdmin({
        name: form.name,
        username: form.username,
        password: form.password,
      })
      login(user)
      toast.success('تم إنشاء الحساب بنجاح')
      onSetup()
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في إنشاء الحساب')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Team Store</h1>
          <p className="text-slate-400 mt-1">مرحباً بك! أنشئ حساب المدير للبدء</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">إعداد الحساب الرئيسي</h2>
          <p className="text-sm text-slate-500 mb-6">هذا هو حساب المدير الرئيسي. يمكنك إضافة موظفين لاحقاً من الإعدادات.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">الاسم الكامل *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="مثال: أحمد محمد"
                autoFocus
              />
            </div>
            <div>
              <label className="label">اسم المستخدم *</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input"
                placeholder="مثال: admin"
              />
            </div>
            <div>
              <label className="label">كلمة المرور *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder="6 أحرف على الأقل"
              />
            </div>
            <div>
              <label className="label">تأكيد كلمة المرور *</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="input"
                placeholder="أعد إدخال كلمة المرور"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب والبدء'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
