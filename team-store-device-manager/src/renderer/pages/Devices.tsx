import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Plus, Search, Filter, Eye, ChevronRight, ChevronLeft, List, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

const PAGE_SIZE = 50

function printLabel(device: any) {
  const model = (device.model || '').replace(/^iPhone\s*/i, '')
  const storage = (device.storage || '').replace(/GB$/i, '')
  const battery = device.battery_health ? `${device.battery_health}%` : ''
  const deviceLine = [model, storage, battery].filter(Boolean).join(' - ')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@page { size: 58mm 38mm; margin: 0; }
* { margin:0; padding:0; box-sizing:border-box; }
body { width:58mm; height:38mm; display:flex; align-items:center; justify-content:center; background:white; font-family:Arial,Helvetica,sans-serif; }
.label { width:54mm; border:1.5px solid #bbb; border-radius:6px; padding:5mm 4mm; display:flex; flex-direction:column; align-items:center; gap:3.5px; background:white; }
.logo-row { display:flex; align-items:center; gap:4px; }
.logo-text { display:flex; flex-direction:column; line-height:1; }
.team { font-size:13pt; font-weight:900; letter-spacing:1px; color:#000; }
.store { font-size:6.5pt; letter-spacing:3px; color:#555; }
.device { font-size:11pt; font-weight:700; color:#111; direction:ltr; margin-top:1px; }
.warranty { font-size:9pt; color:#333; direction:rtl; }
</style></head><body>
<div class="label">
  <div class="logo-row">
    <svg width="15" height="21" viewBox="0 0 20 29" fill="none">
      <rect x="1.5" y="1.5" width="17" height="26" rx="3.5" stroke="#000" stroke-width="2.2"/>
      <circle cx="10" cy="5.5" r="1.4" fill="#000"/>
      <rect x="5.5" y="23" width="9" height="1.8" rx="0.9" fill="#000"/>
    </svg>
    <div class="logo-text"><span class="team">TEAM</span><span class="store">STORE</span></div>
  </div>
  <div class="device">${deviceLine}</div>
  <div class="warranty">ضمان 10 شهور</div>
</div>
<script>window.onload=()=>{setTimeout(()=>{window.print();},200);}</script>
</body></html>`

  const win = window.open('', '_blank', 'width=320,height=240,toolbar=no,menubar=no,scrollbars=no')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}

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
  const [generating, setGenerating] = useState(false)
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

  const generateListImage = async () => {
    try {
      setGenerating(true)
      const [{ items: devices }, cur] = await Promise.all([
        api.devices.getAll({ status: 'available', limit: 9999, offset: 0 }),
        api.settings.get('currency'),
      ])
      const curr = cur || 'EGP'

      if (devices.length === 0) { toast.error('لا توجد أجهزة متاحة'); return }

      // ---- canvas config ----
      const W = 720
      const ROW_H = 34
      const TITLE_H = 56
      const FOOT_H = 36
      const H = TITLE_H + devices.length * ROW_H + FOOT_H

      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      // Background
      ctx.fillStyle = '#111111'
      ctx.fillRect(0, 0, W, H)

      // Title bar
      ctx.fillStyle = '#1e1e1e'
      ctx.fillRect(0, 0, W, TITLE_H)
      ctx.font = 'bold 18px Cairo, Arial, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText('قائمة الأجهزة المتاحة', W / 2, 33)

      // Column x positions (RTL: model right → price left)
      // | السعر | اللون | البطارية | التخزين | الموديل |
      const COL = {
        model:   { x: W - 12, align: 'right'  as CanvasTextAlign },
        storage: { x: 375,    align: 'center' as CanvasTextAlign },
        battery: { x: 288,    align: 'center' as CanvasTextAlign },
        color:   { x: 195,    align: 'center' as CanvasTextAlign },
        price:   { x: 95,     align: 'center' as CanvasTextAlign },
      }

      // Separator lines
      const sepX = [120, 162, 250, 340]
      ctx.strokeStyle = '#2a2a2a'
      ctx.lineWidth = 1

      devices.forEach((d: any, i: number) => {
        const rowY = TITLE_H + i * ROW_H

        // Row background
        ctx.fillStyle = i % 2 === 0 ? '#161616' : '#1c1c1c'
        ctx.fillRect(0, rowY, W, ROW_H)

        // Separator lines
        sepX.forEach(sx => {
          ctx.beginPath(); ctx.moveTo(sx, rowY); ctx.lineTo(sx, rowY + ROW_H); ctx.stroke()
        })

        const price = d.expected_sale_price || d.final_sale_price
        const priceText = price ? price.toLocaleString('ar-EG') : '—'
        const modelText = [d.brand, d.model, d.technical_notes].filter(Boolean).join(' ')

        const textY = rowY + ROW_H / 2 + 5

        ctx.font = '13px Cairo, Arial, sans-serif'
        ctx.fillStyle = '#ffffff'

        // Model (right-aligned)
        ctx.textAlign = COL.model.align
        ctx.fillText(modelText, COL.model.x, textY)

        // Storage
        ctx.textAlign = COL.storage.align
        ctx.fillText(d.storage || '—', COL.storage.x, textY)

        // Battery
        ctx.textAlign = COL.battery.align
        ctx.fillStyle = d.battery_health && d.battery_health >= 90 ? '#4ade80' :
                         d.battery_health && d.battery_health >= 80 ? '#facc15' : '#f87171'
        ctx.fillText(d.battery_health ? `${d.battery_health}%` : '—', COL.battery.x, textY)

        // Color
        ctx.textAlign = COL.color.align
        ctx.fillStyle = '#ffffff'
        ctx.fillText(d.color || '—', COL.color.x, textY)

        // Price
        ctx.textAlign = COL.price.align
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 13px Cairo, Arial, sans-serif'
        ctx.fillText(priceText, COL.price.x, textY)
      })

      // Footer
      const footY = TITLE_H + devices.length * ROW_H
      ctx.fillStyle = '#1e1e1e'
      ctx.fillRect(0, footY, W, FOOT_H)
      ctx.font = '12px Cairo, Arial, sans-serif'
      ctx.fillStyle = '#555555'
      ctx.textAlign = 'center'
      ctx.fillText(
        `${devices.length} جهاز متاح  •  ${new Date().toLocaleDateString('ar-EG')}  •  Team Store`,
        W / 2, footY + 23,
      )

      // Download
      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `list-${new Date().toISOString().split('T')[0]}.png`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`تم تحميل الليسته (${devices.length} جهاز)`)
      }, 'image/png')

    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ أثناء إنشاء الليسته')
    } finally {
      setGenerating(false)
    }
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={generateListImage}
            disabled={generating}
            className="btn-secondary flex items-center gap-2 disabled:opacity-60"
          >
            <List className="w-4 h-4" />
            {generating ? 'جاري الإنشاء...' : 'ليسته'}
          </button>
          <button onClick={() => navigate('/purchases/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> إضافة جهاز جديد
          </button>
        </div>
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
                            title="تفاصيل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => printLabel(d)}
                            className="btn-ghost btn-sm p-1"
                            title="طباعة ليبل"
                          >
                            <Printer className="w-3.5 h-3.5" />
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
