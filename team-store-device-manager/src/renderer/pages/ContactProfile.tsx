import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { ArrowRight, Phone, MapPin, CreditCard } from 'lucide-react'

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('ar-EG') : '-' }

export default function ContactProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('EGP')

  useEffect(() => {
    Promise.all([api.contacts.getProfile(Number(id)), api.settings.get('currency')])
      .then(([d, cur]) => { setData(d); setCurrency(cur || 'EGP') })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400 animate-pulse">جاري التحميل...</div></div>
  if (!data) return <div className="text-center py-20 text-slate-400">جهة الاتصال غير موجودة</div>

  const { contact: c, purchases, sales, totalPurchased, totalSold, remainingFromContact, remainingToContact } = data
  const fmt = (n: number) => (n || 0).toLocaleString('en-US') + ' ' + currency
  const typeLabels: Record<string, string> = { seller: 'بائع', buyer: 'مشتري', both: 'بائع ومشتري' }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => navigate('/contacts')} className="text-brand-600 hover:text-brand-800 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> جهات الاتصال</button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600">{c.name}</span>
      </div>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-2xl font-bold">
            {c.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{c.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {c.phone}</span>
              {c.secondary_phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {c.secondary_phone}</span>}
              {c.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.address}</span>}
              {c.national_id && <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> {c.national_id}</span>}
            </div>
            <div className="mt-2"><span className={`badge ${c.contact_type === 'seller' ? 'bg-orange-100 text-orange-700' : c.contact_type === 'buyer' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{typeLabels[c.contact_type]}</span></div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">إجمالي المشتريات منه</div>
          <div className="text-xl font-bold text-slate-900">{fmt(totalPurchased)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">إجمالي المبيعات له</div>
          <div className="text-xl font-bold text-slate-900">{fmt(totalSold)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">متبقي عليه (مبيعات)</div>
          <div className={`text-xl font-bold ${remainingFromContact > 0 ? 'text-orange-600' : 'text-green-600'}`}>{fmt(remainingFromContact)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">متبقي له (مشتريات)</div>
          <div className={`text-xl font-bold ${remainingToContact > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(remainingToContact)}</div>
        </div>
      </div>

      {/* Purchases */}
      {(purchases || []).length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">عمليات الشراء منه ({purchases.length})</h3></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>الجهاز</th><th>التاريخ</th><th>السعر</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
              <tbody>
                {purchases.map((p: any) => (
                  <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/devices/${p.device_id}`)}>
                    <td className="font-medium">{p.model} {p.storage} {p.color}</td>
                    <td>{formatDate(p.purchase_date)}</td>
                    <td dir="ltr">{fmt(p.total_cost)}</td>
                    <td dir="ltr">{fmt(p.paid_amount)}</td>
                    <td dir="ltr" className={p.remaining_amount > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>{fmt(p.remaining_amount)}</td>
                    <td><span className={`status-${p.status}`}>{p.status === 'available' ? 'متاح' : p.status === 'sold' ? 'مباع' : p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales */}
      {(sales || []).length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">عمليات البيع له ({sales.length})</h3></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>الجهاز</th><th>التاريخ</th><th>السعر</th><th>المدفوع</th><th>المتبقي</th><th>الفاتورة</th></tr></thead>
              <tbody>
                {sales.map((s: any) => (
                  <tr key={s.id} className="cursor-pointer" onClick={() => s.invoice_number && navigate(`/invoices/${s.invoice_id}`)}>
                    <td className="font-medium">{s.model} {s.storage} {s.color}</td>
                    <td>{formatDate(s.sale_date)}</td>
                    <td dir="ltr">{fmt(s.sale_price)}</td>
                    <td dir="ltr">{fmt(s.paid_amount)}</td>
                    <td dir="ltr" className={s.remaining_amount > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>{fmt(s.remaining_amount)}</td>
                    <td className="text-brand-600">{s.invoice_number ? `#${s.invoice_number}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {c.notes && (
        <div className="card p-4">
          <h3 className="font-semibold text-slate-800 mb-2">ملاحظات</h3>
          <p className="text-slate-600 text-sm">{c.notes}</p>
        </div>
      )}
    </div>
  )
}
