import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { usePrivate } from '../context/PrivateContext'
import { Lock, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('ar-EG') : '-' }

export default function PrivatePage() {
  const { lock } = usePrivate()
  const [stats, setStats] = useState<any>(null)
  const [salesData, setSalesData] = useState<any[]>([])
  const [spData, setSpData] = useState<any[]>([])
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [currency, setCurrency] = useState('EGP')
  const [loading, setLoading] = useState(true)

  const fmt = (n: number) => (n || 0).toLocaleString('en-US') + ' ' + currency

  const load = async () => {
    setLoading(true)
    try {
      const [dashData, cur, sales, sp] = await Promise.all([
        api.sales.getDashboard(),
        api.settings.get('currency'),
        api.sales.getReport(from, to),
        api.salespeople.getReport(from, to),
      ])
      setStats(dashData)
      setCurrency(cur || 'EGP')
      setSalesData(sales)
      setSpData(sp)
    } catch (e: any) {
      toast.error(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalSales = salesData.reduce((s, r) => s + (r.sale_price || 0), 0)
  const totalProfit = salesData.reduce((s, r) => s + (r.profit || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-600" /> Private
          </h1>
          <p className="text-slate-500 text-sm mt-1">بيانات الأرباح والمالية</p>
        </div>
        <button onClick={lock} className="btn-secondary">
          <Lock className="w-4 h-4" /> قفل القسم
        </button>
      </div>

      {/* Date filter */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <label className="label text-xs">من</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-36" dir="ltr" />
          </div>
          <div>
            <label className="label text-xs">إلى</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-36" dir="ltr" />
          </div>
        </div>
      </div>

      {/* Profit stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">إجمالي الأرباح</div>
          <div className="text-xl font-bold text-green-600">{fmt(stats?.total_profit || 0)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">أرباح هذا الشهر</div>
          <div className="text-xl font-bold text-green-600">{fmt(stats?.monthly_profit || 0)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">أرباح الفترة المختارة</div>
          <div className="text-xl font-bold text-green-600">{fmt(totalProfit)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">هامش الربح</div>
          <div className="text-xl font-bold text-purple-600">
            {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) + '%' : '-'}
          </div>
        </div>
      </div>

      {/* Sales with profit */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" /> مبيعات الفترة مع الأرباح
          </h3>
        </div>
        {salesData.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">لا توجد مبيعات في هذه الفترة</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>الجهاز</th>
                  <th>العميل</th>
                  <th>التاريخ</th>
                  <th>سعر البيع</th>
                  <th>الربح</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((r: any, i) => (
                  <tr key={i}>
                    <td>{r.model} {r.storage} {r.color}</td>
                    <td>{r.buyer_name}</td>
                    <td>{formatDate(r.sale_date)}</td>
                    <td dir="ltr">{fmt(r.sale_price)}</td>
                    <td dir="ltr" className={r.profit >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salesperson profits */}
      {spData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-800">أرباح السيلز</h3>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>السيلز</th>
                  <th>عدد المبيعات</th>
                  <th>إجمالي المبيعات</th>
                  <th>الأرباح</th>
                </tr>
              </thead>
              <tbody>
                {spData.map((r: any, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{r.salesperson_name}</td>
                    <td>{r.sales_count}</td>
                    <td dir="ltr">{fmt(r.sales_total)}</td>
                    <td dir="ltr" className={r.sales_profit >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(r.sales_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
