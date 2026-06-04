import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Plus, Search, Filter, Eye, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', search: '' })
  const [currency, setCurrency] = useState('EGP')

  useEffect(() => {
    Promise.all([api.devices.getAll(), api.settings.get('currency')])
      .then(([d, cur]) => { setDevices(d); setCurrency(cur || 'EGP') })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = devices.filter((d) => {
    if (filter.status && d.status !== filter.status) return false
    if (filter.search) {
      const q = filter.search.toLowerCase()
      return (d.model?.toLowerCase().includes(q) || d.serial_number?.toLowerCase().includes(q) ||
        d.imei1?.toLowerCase().includes(q) || d.color?.toLowerCase().includes(q) ||
        d.storage?.toLowerCase().includes(q))
    }
    return true
  })

  const fmt = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المخزون</h1>
          <p className="text-slate-500 text-sm mt-1">{devices.length} جهاز إجمالاً</p>
        </div>
        <button onClick={() => navigate('/purchases/new')} className="btn-primary">
          <Plus className="w-4 h-4" /> إضافة جهاز جديد
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="input" placeholder="بحث بالسريال، IMEI، الموديل..." />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter({ ...filter, status: f.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter.status === f.value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 text-lg mb-2">لا توجد أجهزة</div>
            <button onClick={() => navigate('/purchases/new')} className="btn-primary mt-2">إضافة أول جهاز</button>
          </div>
        ) : (
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
                {filtered.map((d) => (
                  <tr key={d.id} className="cursor-pointer" onClick={() => navigate(`/devices/${d.id}`)}>
                    <td className="font-medium">{d.brand} {d.model}</td>
                    <td>{d.storage}</td>
                    <td>{d.color}</td>
                    <td className="font-mono text-xs">{d.serial_number || '-'}</td>
                    <td className="font-mono text-xs">{d.imei1 || '-'}</td>
                    <td>{d.battery_health ? `${d.battery_health}%` : '-'}</td>
                    <td dir="ltr">{fmt(d.purchase_price)}</td>
                    <td dir="ltr" className="font-medium">{fmt(d.total_cost)}</td>
                    <td dir="ltr">{d.final_sale_price ? fmt(d.final_sale_price) : (d.expected_sale_price ? fmt(d.expected_sale_price) : '-')}</td>
                    <td><span className={`status-${d.status}`}>{STATUS_LABELS[d.status]}</span></td>
                    <td className="text-xs">{d.seller_name || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => navigate(`/devices/${d.id}`)} className="btn-ghost btn-sm p-1"><Eye className="w-3.5 h-3.5" /></button>
                        {d.status === 'available' && (
                          <button onClick={() => navigate(`/sell?q=${d.serial_number || d.imei1 || d.model}`)} className="btn-primary btn-sm">بيع</button>
                        )}
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
