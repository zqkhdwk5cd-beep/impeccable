import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Save, Store, Shield, Users, RefreshCw, Smartphone, Plus, Trash2, ChevronUp, ChevronDown, UserCheck, Lock, Printer, TestTube, ImageIcon, X, RotateCcw, Archive } from 'lucide-react'
import { buildLabelHtml } from '../lib/printLabel'

const SETTING_KEYS = ['store_name', 'store_address', 'store_phone', 'invoice_start_number', 'default_policy_text', 'currency', 'backup_location', 'daily_backup_enabled', 'backups_to_keep', 'label_width_mm', 'label_height_mm', 'label_warranty', 'label_printer_name', 'label_silent_print', 'store_logo']

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

function DeletedDevicesSection() {
  const [devs, setDevs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { setDevs(await api.devices.getDeleted()) }
    catch (e: any) { toast.error(e.message) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const restore = async (id: number, label: string) => {
    try {
      await api.devices.restore(id)
      toast.success(`تم استعادة "${label}"`)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  if (loading) return <div className="px-6 py-8 text-center text-slate-400 animate-pulse">جاري التحميل...</div>
  if (devs.length === 0) return <div className="px-6 py-8 text-center text-slate-400 text-sm">لا توجد أجهزة محذوفة</div>

  return (
    <div>
      <div className="divide-y divide-slate-100">
        {devs.map((d: any) => (
          <div key={d.id} className="px-6 py-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800">{d.brand} {d.model} {d.storage} {d.color}</div>
              <div className="flex items-center gap-3 mt-0.5">
                {d.serial_number && <span className="text-xs font-mono text-slate-400">{d.serial_number}</span>}
                <span className="text-xs text-slate-400">
                  حُذف {new Date(d.deleted_at).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>
            <button
              onClick={() => restore(d.id, `${d.brand} ${d.model} ${d.storage}`)}
              className="btn-secondary btn-sm flex items-center gap-1.5 text-brand-600 border-brand-200 hover:bg-brand-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              استعادة
            </button>
          </div>
        ))}
      </div>
      <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400">{devs.length} جهاز محذوف</div>
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
  const [printers, setPrinters] = useState<any[]>([])
  const [testPrinting, setTestPrinting] = useState(false)
  const [newPwd, setNewPwd] = useState({ current: '', next: '', confirm: '' })
  const [changingPwd, setChangingPwd] = useState(false)
  const [optionsTab, setOptionsTab] = useState<OptionType>('model')
  const [salespeople, setSalespeople] = useState<any[]>([])
  const [newSpName, setNewSpName] = useState('')
  const [pinModal, setPinModal] = useState<{ id: number; name: string } | null>(null)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const load = async () => {
    try {
      const [s, u, sp, pr] = await Promise.all([
        api.settings.getAll(),
        api.users.getAll(),
        api.salespeople.getAll(),
        api.printers.list().catch(() => []),
      ])
      setSettings(s)
      setUsers(u)
      setSalespeople(sp)
      setPrinters(pr)
    } catch (e: any) { toast.error(e.message) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const testPrint = async () => {
    setTestPrinting(true)
    try {
      const fakeDevice = { model: 'iPhone 14 Pro Max', storage: '256GB', battery_health: 100, box_status: 'with_box' }
      const html = buildLabelHtml(fakeDevice, {
        warranty: s('label_warranty') || 'ضمان 10 شهور',
        widthMm:  Number(s('label_width_mm'))  || 50,
        heightMm: Number(s('label_height_mm')) || 30,
      })
      const result = await api.printers.printLabel(html, {
        widthMm:     Number(s('label_width_mm'))  || 50,
        heightMm:    Number(s('label_height_mm')) || 30,
        printerName: s('label_printer_name') || '',
        silent:      s('label_silent_print') === 'true',
      })
      if (result.success) toast.success('تم إرسال الـ Label التجريبي للطابعة')
      else toast.error('فشل الطباعة: ' + (result.reason || 'خطأ غير معروف'))
    } catch (e: any) { toast.error(e.message) }
    setTestPrinting(false)
  }

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
    <>
    {pinModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">باسورد {pinModal.name}</h3>
              <p className="text-xs text-slate-500">4 أرقام فقط</p>
            </div>
          </div>
          <div>
            <label className="label">الباسورد الجديد</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => { if (/^\d*$/.test(e.target.value)) setNewPin(e.target.value) }}
              className="input text-center tracking-widest text-lg"
              placeholder="••••"
              autoFocus
            />
          </div>
          <div>
            <label className="label">تأكيد الباسورد</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => { if (/^\d*$/.test(e.target.value)) setConfirmPin(e.target.value) }}
              className="input text-center tracking-widest text-lg"
              placeholder="••••"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={async () => {
                if (newPin.length !== 4) return toast.error('الباسورد يجب أن يكون 4 أرقام')
                if (newPin !== confirmPin) return toast.error('الباسوردان غير متطابقين')
                try {
                  await api.salespeople.setPin(pinModal.id, newPin)
                  const updated = await api.salespeople.getAll()
                  setSalespeople(updated)
                  setPinModal(null)
                  toast.success('تم تعيين الباسورد')
                } catch (e: any) { toast.error(e.message) }
              }}
              className="btn-primary flex-1 justify-center"
            >
              حفظ
            </button>
            <button
              onClick={async () => {
                if (!confirm('إزالة الباسورد؟')) return
                await api.salespeople.removePin(pinModal.id)
                const updated = await api.salespeople.getAll()
                setSalespeople(updated)
                setPinModal(null)
                toast.success('تم إزالة الباسورد')
              }}
              className="btn-secondary"
            >
              إزالة
            </button>
            <button onClick={() => setPinModal(null)} className="btn-secondary">إلغاء</button>
          </div>
        </div>
      </div>
    )}
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

          {/* Logo upload */}
          <div>
            <label className="label flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> شعار المتجر (يظهر في الفاتورة)</label>
            <div className="flex items-center gap-4">
              {s('store_logo') ? (
                <div className="relative group">
                  <img src={s('store_logo')} alt="logo" className="h-16 max-w-[140px] object-contain rounded-lg border border-slate-200 p-1 bg-white" />
                  <button
                    onClick={() => update('store_logo', '')}
                    className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="حذف الشعار"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-32 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                  لا يوجد شعار
                </div>
              )}
              <label className="btn-secondary cursor-pointer">
                <ImageIcon className="w-4 h-4" />
                {s('store_logo') ? 'تغيير الشعار' : 'رفع شعار'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => update('store_logo', ev.target?.result as string)
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          </div>
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
      {/* Label / Xprinter settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold flex items-center gap-2">
            <Printer className="w-4 h-4 text-brand-600" /> Label Settings (Xprinter)
          </h2>
          <button
            onClick={testPrint}
            disabled={testPrinting}
            className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-60"
          >
            <TestTube className="w-3.5 h-3.5" />
            {testPrinting ? 'جاري الإرسال...' : 'طباعة تجريبية'}
          </button>
        </div>
        <div className="card-body space-y-4">
          {/* Printer selector */}
          <div>
            <label className="label">الطابعة</label>
            <select
              value={s('label_printer_name')}
              onChange={(e) => update('label_printer_name', e.target.value)}
              className="input"
              dir="ltr"
            >
              <option value="">— اختر الطابعة —</option>
              {printers.map((p: any) => (
                <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {printers.length === 0 ? 'لم يتم العثور على طابعات — تأكد أن الطابعة متصلة' : `${printers.length} طابعة متاحة`}
            </p>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Label Width (mm)</label>
              <input
                type="number" min="20" max="200"
                value={s('label_width_mm') || '50'}
                onChange={(e) => update('label_width_mm', e.target.value)}
                className="input" dir="ltr"
              />
            </div>
            <div>
              <label className="label">Label Height (mm)</label>
              <input
                type="number" min="10" max="200"
                value={s('label_height_mm') || '30'}
                onChange={(e) => update('label_height_mm', e.target.value)}
                className="input" dir="ltr"
              />
            </div>
            <div>
              <label className="label">نص الضمان</label>
              <input
                value={s('label_warranty') || 'ضمان 10 شهور'}
                onChange={(e) => update('label_warranty', e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Silent print */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium text-sm text-slate-800">طباعة مباشرة (بدون ديالوج)</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {s('label_silent_print') === 'true'
                  ? 'Label بيتطبع مباشرة على الطابعة المختارة بدون ما تيجي نافذة'
                  : 'هتظهر نافذة اختيار الطابعة قبل كل طباعة'}
              </div>
            </div>
            <button
              onClick={() => update('label_silent_print', s('label_silent_print') === 'true' ? 'false' : 'true')}
              className={`relative w-11 h-6 rounded-full transition-colors ${s('label_silent_print') === 'true' ? 'bg-brand-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s('label_silent_print') === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            بعد اختيار الطابعة واضبط الحجم، اضغط "حفظ الإعدادات" ثم جرب "طباعة تجريبية".
          </p>
        </div>
      </div>

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
              آخر نسخة: {new Date(s('last_backup_date')).toLocaleString('en-US')}
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
                    onClick={() => { setPinModal({ id: sp.id, name: sp.name }); setNewPin(''); setConfirmPin('') }}
                    className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${sp.pin_hash ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    <Lock className="w-3 h-3" />
                    {sp.pin_hash ? 'تغيير' : 'باسورد'}
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

      {/* Deleted devices */}
      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold flex items-center gap-2">
              <Archive className="w-4 h-4 text-red-500" /> الأجهزة المحذوفة
            </h2>
          </div>
          <DeletedDevicesSection />
        </div>
      )}

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
    </>
  )
}
