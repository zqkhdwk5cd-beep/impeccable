import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { ArrowRight, Edit, Tag, Plus, Trash2, Printer } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { openLabelPrint } from '../lib/printLabel'

const STATUS_LABELS: Record<string, string> = { available: 'متاح', sold: 'مباع', reserved: 'محجوز', repair: 'إصلاح', returned: 'مرتجع', archived: 'مؤرشف' }
const EXPENSE_TYPES: Record<string, string> = { repair: 'إصلاح', cleaning: 'تنظيف', accessories: 'إكسسوار', transport: 'نقل', unlocking: 'فتح', other: 'أخرى' }

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('ar-EG') : '-' }

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('EGP')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ expense_type: 'repair', amount: '', expense_date: new Date().toISOString().slice(0, 10), notes: '' })
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [labelWarranty, setLabelWarranty] = useState('ضمان 10 شهور')
  const [labelW, setLabelW] = useState(50)
  const [labelH, setLabelH] = useState(30)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.devices.getDetail(Number(id)),
      api.settings.get('currency'),
      api.settings.get('label_warranty'),
      api.settings.get('label_width_mm'),
      api.settings.get('label_height_mm'),
    ])
      .then(([d, cur, lw, lwmm, lhmm]) => {
        setData(d)
        setCurrency(cur || 'EGP')
        if (lw) setLabelWarranty(lw)
        if (lwmm) setLabelW(Number(lwmm) || 50)
        if (lhmm) setLabelH(Number(lhmm) || 30)
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const fmt = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency

  const addExpense = async () => {
    if (!expenseForm.amount) return toast.error('المبلغ مطلوب')
    try {
      await api.expenses.add({ device_id: Number(id), ...expenseForm, amount: parseFloat(expenseForm.amount) })
      toast.success('تم إضافة المصروف وتحديث التكلفة')
      setShowExpenseForm(false)
      setExpenseForm({ expense_type: 'repair', amount: '', expense_date: new Date().toISOString().slice(0, 10), notes: '' })
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400 animate-pulse">جاري التحميل...</div></div>
  if (!data?.device) return <div className="text-center py-20 text-slate-400">الجهاز غير موجود</div>

  const d = data.device

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => navigate('/devices')} className="text-brand-600 hover:text-brand-800 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> المخزون</button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600">{d.brand} {d.model}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{d.brand} {d.model} {d.storage} {d.color}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`status-${d.status}`}>{STATUS_LABELS[d.status]}</span>
            {d.serial_number && <span className="text-sm font-mono text-slate-500">{d.serial_number}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLabelModal(true)} className="btn-secondary">
            <Printer className="w-4 h-4" /> ليبل
          </button>
          {d.status === 'available' && (
            <button onClick={() => navigate(`/sell?q=${d.serial_number || d.imei1 || d.model}`)} className="btn-success">
              <Tag className="w-4 h-4" /> بيع
            </button>
          )}
          {d.invoice_id && (
            <button onClick={() => navigate(`/invoices/${d.invoice_id}`)} className="btn-secondary">
              <Printer className="w-4 h-4" /> الفاتورة
            </button>
          )}
        </div>
      </div>

      {/* Device details */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 col-span-2">
          <h3 className="font-semibold text-slate-800 mb-3">بيانات الجهاز</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              ['الماركة', d.brand], ['الموديل', d.model], ['السعة', d.storage],
              ['اللون', d.color], ['الحالة', d.condition === 'used' ? 'مستعمل' : d.condition === 'new' ? 'جديد' : 'مجدد'],
              ['البطارية', d.battery_health ? `${d.battery_health}%` : '-'],
              ['السريال', d.serial_number || '-'], ['IMEI 1', d.imei1 || '-'], ['IMEI 2', d.imei2 || '-'],
              ['الكرتون', d.box_status === 'with_box' ? 'مع الكرتون' : d.box_status === 'without_box' ? 'بدون كرتون' : 'كرتون تالف'],
              ['الإكسسوارات', d.accessories || '-'], ['ملاحظات تقنية', d.technical_notes || '-'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-xs text-slate-400">{label}</div>
                <div className="font-medium text-slate-800 mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial */}
        <div className="card p-4">
          <h3 className="font-semibold text-slate-800 mb-3">مالي</h3>
          <div className="space-y-2 text-sm">
            {d.final_sale_price && (
              <div className="flex justify-between"><span className="text-slate-500">سعر البيع</span><span className="font-bold text-green-600" dir="ltr">{fmt(d.final_sale_price)}</span></div>
            )}
          </div>
        </div>
      </div>

      {/* Purchase info */}
      {d.purchase_id && (
        <div className="card p-4">
          <h3 className="font-semibold text-slate-800 mb-3">بيانات الشراء</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-slate-400">البائع</div><div className="font-medium mt-0.5">{d.seller_name}</div></div>
            <div><div className="text-xs text-slate-400">هاتف البائع</div><div className="font-medium mt-0.5 font-mono">{d.seller_phone}</div></div>
            <div><div className="text-xs text-slate-400">تاريخ الشراء</div><div className="font-medium mt-0.5">{formatDate(d.purchase_date)}</div></div>
            <div><div className="text-xs text-slate-400">المتبقي</div><div className={`font-medium mt-0.5 ${d.purchase_remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(d.purchase_remaining)}</div></div>
          </div>
        </div>
      )}

      {/* Sale info */}
      {d.sale_id && (
        <div className="card p-4 border-green-200">
          <h3 className="font-semibold text-slate-800 mb-3">بيانات البيع</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-slate-400">المشتري</div><div className="font-medium mt-0.5">{d.buyer_name}</div></div>
            <div><div className="text-xs text-slate-400">هاتف المشتري</div><div className="font-medium mt-0.5 font-mono">{d.buyer_phone}</div></div>
            <div><div className="text-xs text-slate-400">تاريخ البيع</div><div className="font-medium mt-0.5">{formatDate(d.sale_date)}</div></div>
            <div><div className="text-xs text-slate-400">رقم الفاتورة</div><div className="font-medium mt-0.5 text-brand-600">{d.invoice_number || '-'}</div></div>
          </div>
        </div>
      )}

      {/* Expenses */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800">المصاريف الإضافية</h3>
          {d.status !== 'sold' && (
            <button onClick={() => setShowExpenseForm(true)} className="btn-secondary btn-sm">
              <Plus className="w-3.5 h-3.5" /> إضافة مصروف
            </button>
          )}
        </div>
        {showExpenseForm && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-4 gap-3">
              <select value={expenseForm.expense_type} onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })} className="input">
                {Object.entries(EXPENSE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input type="number" placeholder="المبلغ" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="input" dir="ltr" />
              <input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} className="input" dir="ltr" />
              <input placeholder="ملاحظات" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} className="input" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addExpense} className="btn-primary btn-sm">حفظ</button>
              <button onClick={() => setShowExpenseForm(false)} className="btn-secondary btn-sm">إلغاء</button>
            </div>
          </div>
        )}
        <div className="divide-y divide-slate-100">
          {(data.expenses || []).length === 0 ? (
            <div className="px-6 py-4 text-sm text-slate-400">لا توجد مصاريف إضافية</div>
          ) : (
            (data.expenses || []).map((e: any) => (
              <div key={e.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-800">{EXPENSE_TYPES[e.expense_type]}</span>
                  {e.notes && <span className="text-xs text-slate-500 mr-2">- {e.notes}</span>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-red-600">{fmt(e.amount)}</span>
                  <span className="text-xs text-slate-400">{formatDate(e.expense_date)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Audit */}
      {(data.audits || []).length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-slate-800">سجل النشاط</h3></div>
          <div className="divide-y divide-slate-100">
            {(data.audits || []).map((a: any) => (
              <div key={a.id} className="px-6 py-3 flex items-center justify-between text-sm">
                <span className="text-slate-700">{a.action}</span>
                <div className="flex items-center gap-3 text-slate-400 text-xs">
                  <span>{a.user_name || 'النظام'}</span>
                  <span>{new Date(a.created_at).toLocaleString('ar-EG')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Label modal */}
      {showLabelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-brand-600" /> طباعة ليبل
              </h2>
              <button onClick={() => setShowLabelModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            {/* Preview */}
            <div className="flex justify-center py-6 bg-slate-50">
              <div className="bg-white border-2 border-slate-300 rounded-xl px-6 py-4 flex flex-col items-center gap-2 shadow-sm" style={{ minWidth: 180 }}>
                <div className="flex items-center gap-2">
                  <svg width="13" height="18" viewBox="0 0 20 29" fill="none">
                    <rect x="1.5" y="1.5" width="17" height="26" rx="3.5" stroke="#000" strokeWidth="2.2"/>
                    <circle cx="10" cy="5.5" r="1.4" fill="#000"/>
                    <rect x="5.5" y="23" width="9" height="1.8" rx="0.9" fill="#000"/>
                  </svg>
                  <div className="flex flex-col leading-tight">
                    <span className="font-black text-sm tracking-wider">TEAM</span>
                    <span className="text-[8px] tracking-widest text-slate-500">STORE</span>
                  </div>
                </div>
                <div className="font-bold text-sm text-slate-900" dir="ltr">
                  {[d.model?.replace(/^iPhone\s*/i,''), d.storage?.replace(/GB$/i,''), d.battery_health ? `${d.battery_health}%` : ''].filter(Boolean).join(' - ')}
                </div>
                <div className="text-xs text-slate-600">{labelWarranty}</div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="label">نص الضمان</label>
                <input
                  value={labelWarranty}
                  onChange={e => setLabelWarranty(e.target.value)}
                  className="input text-center"
                  placeholder="ضمان 10 شهور"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowLabelModal(false)} className="btn-secondary flex-1 justify-center">إلغاء</button>
                <button
                  onClick={() => { openLabelPrint(d, { warranty: labelWarranty, widthMm: labelW, heightMm: labelH }); setShowLabelModal(false) }}
                  className="btn-primary flex-1 justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> طباعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
