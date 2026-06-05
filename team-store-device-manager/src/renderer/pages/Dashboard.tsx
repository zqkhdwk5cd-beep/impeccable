import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  Smartphone, TrendingUp, DollarSign, ShoppingCart, Tag, Search,
  HardDrive, AlertCircle, Package, ArrowUpRight, Clock,
  FileText, Download, BarChart3, Users
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatCurrency(n: number, currency = 'EGP') {
  return new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ' + currency
}
function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ar-EG')
}

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
type ReportType = 'sales' | 'purchases' | 'inventory' | 'salesperson'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [currency, setCurrency] = useState('EGP')
  const [loading, setLoading] = useState(true)

  // Reports state
  const [reportType, setReportType] = useState<ReportType>('sales')
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [reportData, setReportData] = useState<any[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    Promise.all([api.sales.getDashboard(), api.settings.get('currency')])
      .then(([data, cur]) => { setStats(data); setCurrency(cur || 'EGP') })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => formatCurrency(n, currency)
  const fmtR = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency

  const generateReport = async () => {
    setReportLoading(true)
    setGenerated(false)
    try {
      let result: any[] = []
      if (reportType === 'sales') result = await api.sales.getReport(from, to)
      else if (reportType === 'purchases') result = await api.purchases.getReport(from, to)
      else if (reportType === 'inventory') result = await api.devices.getAll({ status: 'available' })
      else if (reportType === 'salesperson') result = await api.salespeople.getReport(from, to)
      setReportData(result)
      setGenerated(true)
    } catch (err: any) { toast.error(err.message) }
    setReportLoading(false)
  }

  const exportCSV = () => {
    if (reportData.length === 0) return
    const headers = Object.keys(reportData[0]).join(',')
    const rows = reportData.map((r) => Object.values(r).map((v) => `"${v || ''}"`).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `report-${reportType}-${from}-${to}.csv`
    a.click()
    toast.success('تم تصدير التقرير')
  }

  const totalSales = reportData.reduce((s, r) => s + (r.sale_price || 0), 0)
  const totalProfit = reportData.reduce((s, r) => s + (r.profit || 0), 0)
  const totalPurchases = reportData.reduce((s, r) => s + (r.total_cost || 0), 0)

  const reportTypes = [
    { key: 'sales' as ReportType, label: 'تقرير المبيعات', icon: TrendingUp },
    { key: 'purchases' as ReportType, label: 'تقرير المشتريات', icon: BarChart3 },
    { key: 'inventory' as ReportType, label: 'تقرير المخزون', icon: Package },
    { key: 'salesperson' as ReportType, label: 'تقرير السلز', icon: Users },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">جاري التحميل...</div>
      </div>
    )
  }

  const s = stats || {}

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
            <button key={i} onClick={() => navigate(action.to)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${action.color} font-medium text-sm transition-transform hover:scale-105`}>
              <action.icon className="w-6 h-6" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" />آخر عمليات الشراء</h3>
            <button onClick={() => navigate('/devices')} className="text-xs text-brand-600 hover:underline flex items-center gap-1">الكل <ArrowUpRight className="w-3 h-3" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {(s.recentPurchases || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">لا توجد عمليات شراء</div>
            ) : (s.recentPurchases || []).map((p: any) => (
              <div key={p.id} className="px-4 py-3">
                <div className="font-medium text-sm text-slate-800">{p.model} {p.storage} {p.color}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{p.seller_name}</span><span>·</span><span>{fmt(p.total_cost)}</span><span>·</span><span>{formatDate(p.purchase_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" />آخر عمليات البيع</h3>
            <button onClick={() => navigate('/invoices')} className="text-xs text-brand-600 hover:underline flex items-center gap-1">الكل <ArrowUpRight className="w-3 h-3" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {(s.recentSales || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">لا توجد عمليات بيع</div>
            ) : (s.recentSales || []).map((sale: any) => (
              <div key={sale.id} className="px-4 py-3">
                <div className="font-medium text-sm text-slate-800">{sale.model} {sale.storage}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{sale.buyer_name}</span><span>·</span><span>{fmt(sale.sale_price)}</span><span>·</span><span>{formatDate(sale.sale_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" />آخر الفواتير</h3>
            <button onClick={() => navigate('/invoices')} className="text-xs text-brand-600 hover:underline flex items-center gap-1">الكل <ArrowUpRight className="w-3 h-3" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {(s.recentInvoices || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">لا توجد فواتير</div>
            ) : (s.recentInvoices || []).map((inv: any) => (
              <div key={inv.id} className="px-4 py-3">
                <div className="font-medium text-sm text-slate-800">فاتورة #{inv.invoice_number}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{inv.buyer_name}</span><span>·</span><span>{inv.model}</span><span>·</span><span>{fmt(inv.total_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── Reports ───── */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">التقارير</h2>

        {/* Controls */}
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex gap-2">
              {reportTypes.map((t) => (
                <button key={t.key} onClick={() => setReportType(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${reportType === t.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <t.icon className="w-4 h-4" />{t.label}
                </button>
              ))}
            </div>
            {reportType !== 'inventory' && (
              <div className="flex items-center gap-3">
                <div>
                  <label className="label text-xs">من</label>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-36" dir="ltr" />
                </div>
                <div>
                  <label className="label text-xs">إلى</label>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-36" dir="ltr" />
                </div>
              </div>
            )}
            <button onClick={generateReport} disabled={reportLoading} className="btn-primary">
              <FileText className="w-4 h-4" /> {reportLoading ? 'جاري التحضير...' : 'إنشاء التقرير'}
            </button>
            {generated && reportData.length > 0 && (
              <button onClick={exportCSV} className="btn-secondary">
                <Download className="w-4 h-4" /> تصدير CSV
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        {generated && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            {reportType === 'sales' && <>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي المبيعات</div><div className="text-xl font-bold">{fmtR(totalSales)}</div></div>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي الأرباح</div><div className="text-xl font-bold text-green-600">{fmtR(totalProfit)}</div></div>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">عدد الصفقات</div><div className="text-xl font-bold">{reportData.length}</div></div>
            </>}
            {reportType === 'purchases' && <>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي المشتريات</div><div className="text-xl font-bold">{fmtR(totalPurchases)}</div></div>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">عدد الأجهزة</div><div className="text-xl font-bold">{reportData.length}</div></div>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">متوسط التكلفة</div><div className="text-xl font-bold">{fmtR(totalPurchases / (reportData.length || 1))}</div></div>
            </>}
            {reportType === 'inventory' && <>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">أجهزة متاحة</div><div className="text-xl font-bold">{reportData.length}</div></div>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي قيمة المخزون</div><div className="text-xl font-bold">{fmtR(reportData.reduce((s, d) => s + d.total_cost, 0))}</div></div>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">سعر بيع متوقع</div><div className="text-xl font-bold">{fmtR(reportData.reduce((s, d) => s + (d.expected_sale_price || 0), 0))}</div></div>
            </>}
            {reportType === 'salesperson' && <>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">عدد السلز</div><div className="text-xl font-bold">{reportData.length}</div></div>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي المبيعات</div><div className="text-xl font-bold">{fmtR(reportData.reduce((s, r) => s + r.sales_total, 0))}</div></div>
              <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي الأرباح</div><div className="text-xl font-bold text-green-600">{fmtR(reportData.reduce((s, r) => s + r.sales_profit, 0))}</div></div>
            </>}
          </div>
        )}

        {/* Table */}
        {generated && (
          <div className="card">
            {reportData.length === 0 ? (
              <div className="p-12 text-center text-slate-400">لا توجد بيانات في هذه الفترة</div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  {reportType === 'sales' && <>
                    <thead><tr><th>الجهاز</th><th>العميل</th><th>التاريخ</th><th>السعر</th><th>الربح</th><th>الفاتورة</th></tr></thead>
                    <tbody>{reportData.map((r, i) => (
                      <tr key={i}>
                        <td>{r.model} {r.storage} {r.color}</td>
                        <td>{r.buyer_name}</td>
                        <td>{formatDate(r.sale_date)}</td>
                        <td dir="ltr">{fmtR(r.sale_price)}</td>
                        <td dir="ltr" className={r.profit >= 0 ? 'text-green-600' : 'text-red-600'}>{fmtR(r.profit)}</td>
                        <td>{r.invoice_number ? `#${r.invoice_number}` : '-'}</td>
                      </tr>
                    ))}</tbody>
                  </>}
                  {reportType === 'purchases' && <>
                    <thead><tr><th>الجهاز</th><th>البائع</th><th>التاريخ</th><th>السعر</th><th>إجمالي التكلفة</th></tr></thead>
                    <tbody>{reportData.map((r, i) => (
                      <tr key={i}>
                        <td>{r.model} {r.storage} {r.color}</td>
                        <td>{r.seller_name}</td>
                        <td>{formatDate(r.purchase_date)}</td>
                        <td dir="ltr">{fmtR(r.purchase_price)}</td>
                        <td dir="ltr">{fmtR(r.total_cost)}</td>
                      </tr>
                    ))}</tbody>
                  </>}
                  {reportType === 'inventory' && <>
                    <thead><tr><th>الجهاز</th><th>السريال</th><th>الحالة</th><th>التكلفة</th></tr></thead>
                    <tbody>{reportData.map((r, i) => (
                      <tr key={i}>
                        <td>{r.model} {r.storage} {r.color}</td>
                        <td className="font-mono text-xs">{r.serial_number || '-'}</td>
                        <td><span className={`status-${r.status || 'available'}`}>{r.status === 'available' ? 'متاح' : r.status === 'sold' ? 'مباع' : r.status}</span></td>
                        <td dir="ltr">{fmtR(r.total_cost)}</td>
                      </tr>
                    ))}</tbody>
                  </>}
                  {reportType === 'salesperson' && <>
                    <thead><tr><th>السيلز</th><th>عدد المبيعات</th><th>إجمالي المبيعات</th><th>الأرباح</th><th>عدد المشتريات</th><th>إجمالي المشتريات</th></tr></thead>
                    <tbody>{reportData.map((r, i) => (
                      <tr key={i}>
                        <td className="font-semibold">{r.salesperson_name}</td>
                        <td>{r.sales_count}</td>
                        <td dir="ltr">{fmtR(r.sales_total)}</td>
                        <td dir="ltr" className={r.sales_profit >= 0 ? 'text-green-600' : 'text-red-600'}>{fmtR(r.sales_profit)}</td>
                        <td>{r.purchases_count}</td>
                        <td dir="ltr">{fmtR(r.purchases_total)}</td>
                      </tr>
                    ))}</tbody>
                  </>}
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
