import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  Smartphone, TrendingUp, DollarSign, ShoppingCart, Tag, Search,
  HardDrive, AlertCircle, Package, ArrowUpRight, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatCurrency(n: number, currency = 'EGP') {
  return new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ' + currency
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ar-EG')
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [currency, setCurrency] = useState('EGP')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.sales.getDashboard(), api.settings.get('currency')])
      .then(([data, cur]) => {
        setStats(data)
        setCurrency(cur || 'EGP')
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">جاري التحميل...</div>
      </div>
    )
  }

  const s = stats || {}
  const fmt = (n: number) => formatCurrency(n, currency)

  const statCards = [
    { label: 'أجهزة متاحة', value: s.available_devices || 0, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'أجهزة مباعة', value: s.sold_devices || 0, icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'قيمة المخزون', value: fmt(s.total_inventory_value || 0), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'إجمالي المبيعات', value: fmt(s.total_sales || 0), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'إجمالي الأرباح', value: fmt(s.total_profit || 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'متبقي من العملاء', value: fmt(s.total_remaining_from_customers || 0), icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'متبقي للموردين', value: fmt(s.total_remaining_to_suppliers || 0), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'مبيعات هذا الشهر', value: fmt(s.monthly_sales || 0), icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'أرباح هذا الشهر', value: fmt(s.monthly_profit || 0), icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم</h1>
          <p className="text-slate-500 text-sm mt-1">مرحباً {user?.name} 👋</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{card.label}</p>
                <p className="text-xl font-bold text-slate-900">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'إضافة شراء', icon: ShoppingCart, to: '/purchases/new', color: 'bg-brand-600 text-white' },
            { label: 'بيع جهاز', icon: Tag, to: '/sell', color: 'bg-emerald-600 text-white' },
            { label: 'بحث بالسريال', icon: Search, to: '/search', color: 'bg-purple-600 text-white' },
            { label: 'بحث بالموبايل', icon: Search, to: '/contacts', color: 'bg-amber-600 text-white' },
            { label: 'نسخة احتياطية', icon: HardDrive, to: '/backups', color: 'bg-slate-700 text-white' },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => navigate(action.to)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${action.color} font-medium text-sm transition-transform hover:scale-105`}
            >
              <action.icon className="w-6 h-6" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent purchases */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              آخر عمليات الشراء
            </h3>
            <button onClick={() => navigate('/devices')} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              الكل <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {(s.recentPurchases || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">لا توجد عمليات شراء</div>
            ) : (
              (s.recentPurchases || []).map((p: any) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="font-medium text-sm text-slate-800">{p.model} {p.storage} {p.color}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{p.seller_name}</span>
                    <span>·</span>
                    <span>{fmt(p.total_cost)}</span>
                    <span>·</span>
                    <span>{formatDate(p.purchase_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent sales */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              آخر عمليات البيع
            </h3>
            <button onClick={() => navigate('/invoices')} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              الكل <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {(s.recentSales || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">لا توجد عمليات بيع</div>
            ) : (
              (s.recentSales || []).map((sale: any) => (
                <div key={sale.id} className="px-4 py-3">
                  <div className="font-medium text-sm text-slate-800">{sale.model} {sale.storage}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{sale.buyer_name}</span>
                    <span>·</span>
                    <span>{fmt(sale.sale_price)}</span>
                    <span>·</span>
                    <span>{formatDate(sale.sale_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent invoices */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              آخر الفواتير
            </h3>
            <button onClick={() => navigate('/invoices')} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              الكل <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {(s.recentInvoices || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">لا توجد فواتير</div>
            ) : (
              (s.recentInvoices || []).map((inv: any) => (
                <div key={inv.id} className="px-4 py-3">
                  <div className="font-medium text-sm text-slate-800">فاتورة #{inv.invoice_number}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{inv.buyer_name}</span>
                    <span>·</span>
                    <span>{inv.model}</span>
                    <span>·</span>
                    <span>{fmt(inv.total_amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
