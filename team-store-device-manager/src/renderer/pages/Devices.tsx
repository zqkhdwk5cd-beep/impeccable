import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Plus, Search, Filter, Eye, ChevronRight, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const PAGE_SIZE = 50

const STATUS_LABELS: Record<string, string> = {
  available: 'متاح', sold: 'مباع', reserved: 'محجوز',
  repair: 'إصلاح', returned: 'مرتجع', archived: 'مؤرشف',
}

const STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'available', label: 'متاح' },
  { value: 'sold', label: 'مباع' },
  { value: 'reserved', label: 'محجوز' },
  { value: 'repair', label: 'إصلاح' },
]

export default function DevicesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [currency, setCurrency] = useState('EGP')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input → resets to page 1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  // Fetch from DB whenever filters or page change
  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.devices.getAll({
        status: status || undefined,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
      api.settings.get('currency'),
    ])
      .then(([d, cur]) => {
        setItems(d.items)
        setTotal(d.total)
        setCurrency(cur || 'EGP')
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [status, search, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  const fmt = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency

  const handleStatus = (s: string) => { setStatus(s); setPage(1) }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المخزون</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? 'جاري التحميل...' : `${total.toLocaleString('ar-EG')} جهاز إجمالاً`}
          </p>
        </div>
        <button onClick={() => navigate('/purchases/new')} className="btn-primary">
          <Plus className="w-4 h-4" /> إضافة جهاز جديد
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input"
            placeholder="بحث بالسريال، IMEI، الموديل، اللون، اسم البائع..."
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                status === f.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">جاري التحميل...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 text-lg mb-2">
              {search || status ? 'لا توجد نتائج لهذا البحث' : 'لا توجد أجهزة'}
            </div>
            {!search && !status && (
              <button onClick={() => navigate('/purchases/new')} className="btn-primary mt-2">
                إضافة أول جهاز
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>الموديل</th>
                    <th>السعة</th>
                    <th>اللون</th>
                    <th>السريال</th>
                    <th>IMEI</th>
                    <th>البطارية</th>
                    <th>سعر الشراء</th>
                    <th>إجمالي التكلفة</th>
                    <th>سعر البيع</th>
                    <th>الحالة</th>
                    <th>البائع</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/devices/${d.id}`)}
                    >
                      <td className="font-medium">{d.brand} {d.model}</td>
                      <td>{d.storage}</td>
                      <td>{d.color}</td>
                      <td className="font-mono text-xs">{d.serial_number || '-'}</td>
                      <td className="font-mono text-xs">{d.imei1 || '-'}</td>
                      <td>{d.battery_health ? `${d.battery_health}%` : '-'}</td>
                      <td dir="ltr">{fmt(d.purchase_price)}</td>
                      <td dir="ltr" className="font-medium">{fmt(d.total_cost)}</td>
                      <td dir="ltr">
                        {d.final_sale_price
                          ? fmt(d.final_sale_price)
                          : d.expected_sale_price
                          ? fmt(d.expected_sale_price)
                          : '-'}
                      </td>
                      <td>
                        <span className={`status-${d.status}`}>{STATUS_LABELS[d.status]}</span>
                      </td>
                      <td className="text-xs">{d.seller_name || '-'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            onClick={() => navigate(`/devices/${d.id}`)}
                            className="btn-ghost btn-sm p-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {d.status === 'available' && (
                            <button
                              onClick={() =>
                                navigate(`/sell?q=${d.serial_number || d.imei1 || d.model}`)
                              }
                              className="btn-primary btn-sm"
                            >
                              بيع
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  {rangeStart}–{rangeEnd} من {total.toLocaleString('ar-EG')} جهاز
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary btn-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                    السابق
                  </button>
                  <span className="text-sm font-medium text-slate-700 px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary btn-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
