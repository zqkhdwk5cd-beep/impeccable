import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Search as SearchIcon, Smartphone, User, FileText } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = { available: 'متاح', sold: 'مباع', reserved: 'محجوز', repair: 'إصلاح', returned: 'مرتجع', archived: 'مؤرشف' }

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currency, setCurrency] = useState('EGP')

  useEffect(() => {
    api.settings.get('currency').then(setCurrency).catch(() => {})
  }, [])

  useEffect(() => {
    if (query.trim().length >= 2) {
      setLoading(true)
      api.search.global(query).then(setResults).catch(() => {}).finally(() => setLoading(false))
    } else {
      setResults([])
    }
  }, [query])

  const fmt = (n: number) => (n || 0).toLocaleString('en-US') + ' ' + currency
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('ar-EG') : '-'

  const deviceResults = results.filter((r) => r.type === 'device')
  const contactResults = results.filter((r) => r.type === 'contact')
  const invoiceResults = results.filter((r) => r.type === 'invoice')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">البحث</h1>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3">
          <SearchIcon className="w-5 h-5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-lg bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
            placeholder="ابحث بالسريال، IMEI، رقم الموبايل، رقم الفاتورة، الاسم..."
            autoFocus
          />
        </div>
      </div>

      {loading && <div className="text-center py-8 text-slate-400">جاري البحث...</div>}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="text-lg">لا توجد نتائج لـ "{query}"</div>
        </div>
      )}

      {!loading && query.length < 2 && (
        <div className="text-center py-12 text-slate-400">
          <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div>اكتب للبحث (حرفين على الأقل)</div>
          <div className="text-sm mt-2">يمكنك البحث بالسريال، IMEI، رقم الموبايل، رقم الفاتورة، اسم العميل</div>
        </div>
      )}

      {/* Device results */}
      {deviceResults.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> أجهزة ({deviceResults.length})
          </h2>
          <div className="space-y-3">
            {deviceResults.map((r) => {
              const d = r.data
              return (
                <div key={r.id} onClick={() => navigate(`/devices/${r.id}`)}
                  className="card p-5 cursor-pointer hover:border-brand-300 transition-all border-2">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{d.brand} {d.model} {d.storage} {d.color}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        {d.serial_number && <span>سريال: <span className="font-mono text-slate-700">{d.serial_number}</span></span>}
                        {d.imei1 && <span>IMEI: <span className="font-mono text-slate-700">{d.imei1}</span></span>}
                        {d.battery_health && <span>البطارية: {d.battery_health}%</span>}
                      </div>
                    </div>
                    <span className={`status-${d.status}`}>{STATUS_LABELS[d.status]}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">البائع</div>
                      <div className="font-medium">{d.seller_name || '-'}</div>
                      {d.seller_phone && <div className="text-xs text-slate-500 font-mono">{d.seller_phone}</div>}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">سعر الشراء</div>
                      <div className="font-medium" dir="ltr">{fmt(d.purchase_price)}</div>
                      <div className="text-xs text-slate-500">التكلفة: {fmt(d.total_cost)}</div>
                    </div>
                    {d.status === 'sold' ? (
                      <>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-1">المشتري</div>
                          <div className="font-medium">{d.buyer_name || '-'}</div>
                          {d.buyer_phone && <div className="text-xs text-slate-500 font-mono">{d.buyer_phone}</div>}
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-1">سعر البيع / الربح</div>
                          <div className="font-medium text-green-700" dir="ltr">{fmt(d.sale_price || d.final_sale_price)}</div>
                          <div className="text-xs text-green-600">ربح: {fmt(d.profit)}</div>
                          {d.invoice_number && <div className="text-xs text-brand-600 mt-1">فاتورة #{d.invoice_number}</div>}
                        </div>
                      </>
                    ) : (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">سعر بيع متوقع</div>
                        <div className="font-medium" dir="ltr">{fmt(d.expected_sale_price)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contact results */}
      {contactResults.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" /> جهات الاتصال ({contactResults.length})
          </h2>
          <div className="space-y-2">
            {contactResults.map((r) => (
              <div key={r.id} onClick={() => navigate(`/contacts/${r.id}`)}
                className="card p-4 cursor-pointer hover:border-brand-300 transition-all border-2 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xl">
                  {r.data.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{r.data.name}</div>
                  <div className="text-sm text-slate-500 font-mono">{r.data.phone}</div>
                </div>
                <span className={`mr-auto badge ${r.data.contact_type === 'seller' ? 'bg-orange-100 text-orange-700' : r.data.contact_type === 'buyer' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {r.data.contact_type === 'seller' ? 'بائع' : r.data.contact_type === 'buyer' ? 'مشتري' : 'بائع ومشتري'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice results */}
      {invoiceResults.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" /> فواتير ({invoiceResults.length})
          </h2>
          <div className="space-y-2">
            {invoiceResults.map((r) => (
              <div key={r.id} onClick={() => navigate(`/invoices/${r.id}`)}
                className="card p-4 cursor-pointer hover:border-brand-300 transition-all border-2 flex items-center gap-4">
                <div className="text-2xl font-bold text-brand-700">#{r.data.invoice_number}</div>
                <div>
                  <div className="font-semibold text-slate-900">{r.data.buyer_name}</div>
                  <div className="text-sm text-slate-500">{r.data.model} {r.data.storage} · {fmt(r.data.total_amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
