import React, { useState } from 'react'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { FileText, Download, BarChart3, TrendingUp, Package, Users } from 'lucide-react'

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('ar-EG') : '-' }
const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

type ReportType = 'sales' | 'purchases' | 'inventory' | 'salesperson'

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales')
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currency, setCurrency] = useState('EGP')
  const [generated, setGenerated] = useState(false)

  const generateReport = async () => {
    setLoading(true)
    setGenerated(false)
    try {
      const cur = await api.settings.get('currency')
      setCurrency(cur || 'EGP')

      let result: any[] = []
      if (reportType === 'sales') result = await api.sales.getReport(from, to)
      else if (reportType === 'purchases') result = await api.purchases.getReport(from, to)
      else if (reportType === 'inventory') result = await api.devices.getAll({ status: 'available' })
      else if (reportType === 'salesperson') result = await api.salespeople.getReport(from, to)

      setData(result)
      setGenerated(true)
    } catch (err: any) { toast.error(err.message) }
    setLoading(false)
  }

  const fmt = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency

  const exportCSV = () => {
    if (data.length === 0) return
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map((r) => Object.values(r).map((v) => `"${v || ''}"`).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `report-${reportType}-${from}-${to}.csv`
    a.click()
    toast.success('تم تصدير التقرير')
  }

  const reportTypes = [
    { key: 'sales' as ReportType, label: 'تقرير المبيعات', icon: TrendingUp },
    { key: 'purchases' as ReportType, label: 'تقرير المشتريات', icon: BarChart3 },
    { key: 'inventory' as ReportType, label: 'تقرير المخزون', icon: Package },
    { key: 'salesperson' as ReportType, label: 'تقرير السلز', icon: Users },
  ]

  const totalSales = data.reduce((s: number, r: any) => s + (r.sale_price || 0), 0)
  const totalProfit = data.reduce((s: number, r: any) => s + (r.profit || 0), 0)
  const totalPurchases = data.reduce((s: number, r: any) => s + (r.total_cost || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">التقارير</h1>
          <p className="text-slate-500 text-sm mt-1">تحليل المبيعات والمشتريات والأرباح</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex gap-2">
            {reportTypes.map((t) => (
              <button key={t.key} onClick={() => setReportType(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${reportType === t.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <t.icon className="w-4 h-4" />
                {t.label}
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
          <button onClick={generateReport} disabled={loading} className="btn-primary">
            <FileText className="w-4 h-4" /> {loading ? 'جاري التحضير...' : 'إنشاء التقرير'}
          </button>
          {generated && data.length > 0 && (
            <button onClick={exportCSV} className="btn-secondary">
              <Download className="w-4 h-4" /> تصدير CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {generated && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {reportType === 'sales' && <>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي المبيعات</div><div className="text-xl font-bold">{fmt(totalSales)}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">عدد الصفقات</div><div className="text-xl font-bold">{data.length}</div></div>
          </>}
          {reportType === 'purchases' && <>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي المشتريات</div><div className="text-xl font-bold">{fmt(totalPurchases)}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">عدد الأجهزة</div><div className="text-xl font-bold">{data.length}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">متوسط التكلفة</div><div className="text-xl font-bold">{fmt(totalPurchases / (data.length || 1))}</div></div>
          </>}
          {reportType === 'inventory' && <>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">أجهزة متاحة</div><div className="text-xl font-bold">{data.length}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي قيمة المخزون</div><div className="text-xl font-bold">{fmt(data.reduce((s, d) => s + d.total_cost, 0))}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">سعر بيع متوقع</div><div className="text-xl font-bold">{fmt(data.reduce((s, d) => s + (d.expected_sale_price || 0), 0))}</div></div>
          </>}
          {reportType === 'salesperson' && <>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">عدد السلز</div><div className="text-xl font-bold">{data.length}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي المبيعات</div><div className="text-xl font-bold">{fmt(data.reduce((s, r) => s + r.sales_total, 0))}</div></div>
            <div className="card p-4"><div className="text-xs text-slate-500 mb-1">إجمالي الأرباح</div><div className="text-xl font-bold text-green-600">{fmt(data.reduce((s, r) => s + r.sales_profit, 0))}</div></div>
          </>}
        </div>
      )}

      {/* Table */}
      {generated && (
        <div className="card">
          {data.length === 0 ? (
            <div className="p-12 text-center text-slate-400">لا توجد بيانات في هذه الفترة</div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                {reportType === 'sales' && <>
                  <thead><tr><th>الجهاز</th><th>العميل</th><th>التاريخ</th><th>السعر</th><th>الفاتورة</th></tr></thead>
                  <tbody>{data.map((r: any, i) => (
                    <tr key={i}>
                      <td>{r.model} {r.storage} {r.color}</td>
                      <td>{r.buyer_name}</td>
                      <td>{formatDate(r.sale_date)}</td>
                      <td dir="ltr">{fmt(r.sale_price)}</td>
                      <td>{r.invoice_number ? `#${r.invoice_number}` : '-'}</td>
                    </tr>
                  ))}</tbody>
                </>}
                {reportType === 'purchases' && <>
                  <thead><tr><th>الجهاز</th><th>البائع</th><th>التاريخ</th><th>السعر</th><th>إجمالي التكلفة</th></tr></thead>
                  <tbody>{data.map((r: any, i) => (
                    <tr key={i}>
                      <td>{r.model} {r.storage} {r.color}</td>
                      <td>{r.seller_name}</td>
                      <td>{formatDate(r.purchase_date)}</td>
                      <td dir="ltr">{fmt(r.purchase_price)}</td>
                      <td dir="ltr">{fmt(r.total_cost)}</td>
                    </tr>
                  ))}</tbody>
                </>}
                {reportType === 'inventory' && <>
                  <thead><tr><th>الجهاز</th><th>السريال</th><th>الحالة</th><th>التكلفة</th></tr></thead>
                  <tbody>{data.map((r: any, i) => (
                    <tr key={i}>
                      <td>{r.model} {r.storage} {r.color}</td>
                      <td className="font-mono text-xs">{r.serial_number || '-'}</td>
                      <td><span className={`status-${r.status || 'available'}`}>{r.status === 'available' ? 'متاح' : r.status === 'sold' ? 'مباع' : r.status}</span></td>
                      <td dir="ltr">{fmt(r.total_cost)}</td>
                    </tr>
                  ))}</tbody>
                </>}
                {reportType === 'salesperson' && <>
                  <thead>
                    <tr>
                      <th>السيلز</th>
                      <th>عدد المبيعات</th>
                      <th>إجمالي المبيعات</th>
                      <th>الأرباح</th>
                      <th>عدد المشتريات</th>
                      <th>إجمالي المشتريات</th>
                    </tr>
                  </thead>
                  <tbody>{data.map((r: any, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{r.salesperson_name}</td>
                      <td>{r.sales_count}</td>
                      <td dir="ltr">{fmt(r.sales_total)}</td>
                      <td dir="ltr" className={r.sales_profit >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(r.sales_profit)}</td>
                      <td>{r.purchases_count}</td>
                      <td dir="ltr">{fmt(r.purchases_total)}</td>
                    </tr>
                  ))}</tbody>
                </>}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
