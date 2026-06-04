import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Save, Store, Shield, Users, RefreshCw } from 'lucide-react'

const SETTING_KEYS = ['store_name', 'store_address', 'store_phone', 'invoice_start_number', 'default_policy_text', 'currency', 'backup_location', 'daily_backup_enabled', 'backups_to_keep']

export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'employee' })
  const [newPwd, setNewPwd] = useState({ current: '', next: '', confirm: '' })
  const [changingPwd, setChangingPwd] = useState(false)

  const load = async () => {
    try {
      const [s, u] = await Promise.all([api.settings.getAll(), api.users.getAll()])
      setSettings(s)
      setUsers(u)
    } catch (e: any) { toast.error(e.message) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const s = (k: string) => settings[k] || ''
  const update = (k: string, v: string) => setSettings((p) => ({ ...p, [k]: v }))

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.settings.update(settings, user?.id)
      toast.success('تم حفظ الإعدادات')
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name || !newUser.username || !newUser.password) return toast.error('جميع الحقول مطلوبة')
    try {
      await api.users.create(newUser)
      toast.success('تم إضافة المستخدم')
      setShowNewUser(false)
      setNewUser({ name: '', username: '', password: '', role: 'employee' })
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd.next !== newPwd.confirm) return toast.error('كلمتا المرور غير متطابقتين')
    if (newPwd.next.length < 6) return toast.error('كلمة المرور قصيرة جداً')
    setChangingPwd(true)
    try {
      await api.users.changePassword(user!.id, newPwd.next)
      toast.success('تم تغيير كلمة المرور')
      setNewPwd({ current: '', next: '', confirm: '' })
    } catch (e: any) { toast.error(e.message) }
    setChangingPwd(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">جاري التحميل...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title">الإعدادات</h1>
        <button onClick={saveSettings} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" /> {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      {/* Store settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold flex items-center gap-2"><Store className="w-4 h-4 text-brand-600" /> إعدادات المتجر</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">اسم المتجر</label><input value={s('store_name')} onChange={(e) => update('store_name', e.target.value)} className="input" /></div>
            <div><label className="label">رقم الهاتف</label><input value={s('store_phone')} onChange={(e) => update('store_phone', e.target.value)} className="input" dir="ltr" /></div>
          </div>
          <div><label className="label">العنوان</label><input value={s('store_address')} onChange={(e) => update('store_address', e.target.value)} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">رقم بداية الفاتورة</label><input type="number" min="1" value={s('invoice_start_number')} onChange={(e) => update('invoice_start_number', e.target.value)} className="input" dir="ltr" /></div>
            <div><label className="label">العملة</label>
              <select value={s('currency')} onChange={(e) => update('currency', e.target.value)} className="input">
                <option value="EGP">EGP - جنيه مصري</option>
                <option value="USD">USD - دولار</option>
                <option value="SAR">SAR - ريال سعودي</option>
                <option value="AED">AED - درهم</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">نص سياسة الاستبدال الافتراضي</label>
            <textarea value={s('default_policy_text')} onChange={(e) => update('default_policy_text', e.target.value)} className="input h-40 resize-none" />
          </div>
        </div>
      </div>

      {/* Backup settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4 text-brand-600" /> إعدادات النسخ الاحتياطي</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">عدد النسخ للاحتفاظ بها</label>
              <input type="number" min="1" max="100" value={s('backups_to_keep')} onChange={(e) => update('backups_to_keep', e.target.value)} className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">النسخ اليومي التلقائي</label>
              <select value={s('daily_backup_enabled')} onChange={(e) => update('daily_backup_enabled', e.target.value)} className="input">
                <option value="true">مفعل</option>
                <option value="false">معطل</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">مجلد النسخ الاحتياطي (اتركه فارغاً للافتراضي)</label>
            <input value={s('backup_location')} onChange={(e) => update('backup_location', e.target.value)} className="input" dir="ltr" placeholder="C:\Backups\TeamStore" />
          </div>
          {s('last_backup_date') && (
            <div className="text-sm text-slate-500">
              آخر نسخة: {new Date(s('last_backup_date')).toLocaleString('ar-EG')}
            </div>
          )}
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-brand-600" /> تغيير كلمة المرور</h2>
        </div>
        <form onSubmit={changePwd} className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">كلمة المرور الجديدة</label><input type="password" value={newPwd.next} onChange={(e) => setNewPwd({ ...newPwd, next: e.target.value })} className="input" /></div>
            <div><label className="label">تأكيد كلمة المرور</label><input type="password" value={newPwd.confirm} onChange={(e) => setNewPwd({ ...newPwd, confirm: e.target.value })} className="input" /></div>
          </div>
          <button type="submit" disabled={changingPwd} className="btn-secondary">{changingPwd ? 'جاري التغيير...' : 'تغيير كلمة المرور'}</button>
        </form>
      </div>

      {/* Users (admin only) */}
      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-brand-600" /> المستخدمون</h2>
            <button onClick={() => setShowNewUser(true)} className="btn-secondary btn-sm">إضافة مستخدم</button>
          </div>
          {showNewUser && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <form onSubmit={addUser} className="grid grid-cols-4 gap-3">
                <input placeholder="الاسم *" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="input" />
                <input placeholder="اسم المستخدم *" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="input" dir="ltr" />
                <input type="password" placeholder="كلمة المرور *" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input" />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="input">
                  <option value="employee">موظف</option><option value="admin">مدير</option>
                </select>
                <div className="col-span-4 flex gap-2">
                  <button type="submit" className="btn-primary btn-sm">حفظ</button>
                  <button type="button" onClick={() => setShowNewUser(false)} className="btn-secondary btn-sm">إلغاء</button>
                </div>
              </form>
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900">{u.name}</div>
                  <div className="text-sm text-slate-500 font-mono">@{u.username}</div>
                </div>
                <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                  {u.role === 'admin' ? 'مدير' : 'موظف'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
