import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { Search, Printer, Eye } from 'lucide-react'

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currency, setCurrency] = useState('EGP')

  useEffect(() => {
    Promise.all([api.invoices.getAll(200), api.settings.get('currency')])
      .then(([inv, cur]) => { setInvoices(inv); setCurrency(cur || 'EGP') })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = invoices.filter((inv) => {
    if (!search) return true
    const q = search.toLowerCase()
    return inv.invoice_number?.includes(q) || inv.buyer_name?.toLowerCase().includes(q) || inv.buyer_phone?.includes(q) || inv.model?.toLowerCase().includes(q)
  })

  const fmt = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">الفواتير</h1>
          <p className="text-slate-500 text-sm mt-1">{invoices.length} فاتورة</p>
        </div>
      </div>

      <div className="card p-4 mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder="بحث برقم الفاتورة، اسم العميل، الموبايل..." />
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">لا توجد فواتير</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>رقم الفاتورة</th><th>العميل</th><th>الهاتف</th><th>الجهاز</th><th>المبلغ</th><th>المتبقي</th><th>التاريخ</th><th>إجراءات</th></tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td className="font-bold text-brand-700">#{inv.invoice_number}</td>
                    <td className="font-medium">{inv.buyer_name}</td>
                    <td className="font-mono text-sm">{inv.buyer_phone}</td>
                    <td>{inv.model} {inv.storage} {inv.color}</td>
                    <td dir="ltr" className="font-medium">{fmt(inv.total_amount)}</td>
                    <td dir="ltr" className={inv.amount_due > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>{fmt(inv.amount_due)}</td>
                    <td>{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('ar-EG') : '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => navigate(`/invoices/${inv.id}`)} className="btn-ghost btn-sm p-1"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => navigate(`/invoices/${inv.id}`)} className="btn-secondary btn-sm"><Printer className="w-3 h-3" /> طباعة</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
