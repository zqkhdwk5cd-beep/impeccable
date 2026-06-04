import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Save, Store, Shield, Users, RefreshCw, Smartphone, Plus, Trash2, ChevronUp, ChevronDown, UserCheck } from 'lucide-react'

const SETTING_KEYS = ['store_name', 'store_address', 'store_phone', 'invoice_start_number', 'default_policy_text', 'currency', 'backup_location', 'daily_backup_enabled', 'backups_to_keep']

type OptionType = 'model' | 'storage' | 'color'
interface DeviceOption { id: number; type: OptionType; value: string; sort_order: number }

function OptionsTab({ type, label }: { type: OptionType; label: string }) {
  const [items, setItems] = useState<DeviceOption[]>([])
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)

  const load = async () => {
    try {
      const data = await api.deviceOptions.getByType(type)
      setItems(data as DeviceOption[])
    } catch (e: any) { toast.error(e.message) }
  }
  useEffect(() => { load() }, [type])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newValue.trim()) return
    setAdding(true)
    try {
      await api.deviceOptions.add(type, newValue.trim())
      setNewValue('')
      await load()
      toast.success(`تمت إضافة "${newValue.trim()}"`)
    } catch (e: any) { toast.error(e.message) }
    setAdding(false)
  }

  const remove = async (item: DeviceOption) => {
    if (!confirm(`حذف "${item.value}"؟`)) return
    try {
      await api.deviceOptions.delete(item.id)
      await load()
      toast.success('تم الحذف')
    } catch (e: any) { toast.error(e.message) }
  }

  const move = async (item: DeviceOption, dir: 'up' | 'down') => {
    try {
      await api.deviceOptions.reorder(item.id, dir)
      await load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={`أضف ${label} جديد...`}
          className="input flex-1"
        />
        <button type="submit" disabled={adding || !newValue.trim()} className="btn-primary">
          <Plus className="w-4 h-4" />
          إضافة
        </button>
      </form>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">لا توجد خيارات — أضف واحداً</div>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              <span className="font-medium text-slate-800">{item.value}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(item, 'up')}
                  disabled={i === 0}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => move(item, 'down')}
                  disabled={i === items.length - 1}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(item)}
                  className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="text-xs text-slate-400">{items.length} خيار</div>
    </div>
  )
}

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
  const [optionsTab, setOptionsTab] = useState<OptionType>('model')
  const [salespeople, setSalespeople] = useState<any[]>([])
  const [newSpName, setNewSpName] = useState('')

  const load = async () => {
    try {
      const [s, u, sp] = await Promise.all([
        api.settings.getAll(),
        api.users.getAll(),
        api.salespeople.getAll(),
      ])
      setSettings(s)
      setUsers(u)
      setSalespeople(sp)
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

      {/* Device Options */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand-600" /> خيارات الأجهزة
          </h2>
        </div>
        <div className="card-body space-y-4">
          <p className="text-sm text-slate-500">أضف أو احذف الخيارات التي تظهر في فورم شراء الجهاز وبيعه.</p>
          <div className="flex border-b border-slate-200 gap-1">
            {([['model','الموديلات'],['storage','المساحات'],['color','الألوان']] as [OptionType,string][]).map(([t, lbl]) => (
              <button
                key={t}
                onClick={() => setOptionsTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  optionsTab === t
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <OptionsTab
            key={optionsTab}
            type={optionsTab}
            label={optionsTab === 'model' ? 'موديل' : optionsTab === 'storage' ? 'مساحة' : 'لون'}
          />
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

      {/* Salespeople */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-600" /> فريق المبيعات
          </h2>
        </div>
        <div className="card-body space-y-3">
          <p className="text-sm text-slate-500">أسماء السلز الذين يظهرون في نافذة الاختيار عند الشراء والبيع.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newSpName.trim()) return
              try {
                await api.salespeople.create(newSpName.trim())
                setNewSpName('')
                const sp = await api.salespeople.getAll()
                setSalespeople(sp)
                toast.success('تمت الإضافة')
              } catch (err: any) { toast.error(err.message) }
            }}
            className="flex gap-2"
          >
            <input
              value={newSpName}
              onChange={(e) => setNewSpName(e.target.value)}
              placeholder="اسم السيلز..."
              className="input flex-1"
            />
            <button type="submit" disabled={!newSpName.trim()} className="btn-primary">
              <Plus className="w-4 h-4" /> إضافة
            </button>
          </form>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {salespeople.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm">لا يوجد سلز — أضف واحداً</div>
            ) : salespeople.map((sp) => (
              <div key={sp.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700">
                    {sp.name.charAt(0)}
                  </div>
                  <span className={`font-medium ${sp.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{sp.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await api.salespeople.toggle(sp.id)
                      const updated = await api.salespeople.getAll()
                      setSalespeople(updated)
                    }}
                    className={`text-xs px-2 py-1 rounded ${sp.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {sp.active ? 'نشط' : 'معطل'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`حذف "${sp.name}"؟`)) return
                      await api.salespeople.delete(sp.id)
                      const updated = await api.salespeople.getAll()
                      setSalespeople(updated)
                      toast.success('تم الحذف')
                    }}
                    className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
