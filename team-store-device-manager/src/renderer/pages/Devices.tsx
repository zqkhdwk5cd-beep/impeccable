import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Plus, Search, Filter, Eye, EyeOff, ChevronRight, ChevronLeft, List, Printer, RotateCcw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { openLabelPrint } from '../lib/printLabel'
import { useAuth } from '../context/AuthContext'

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
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [currency, setCurrency] = useState('EGP')
  const [generating, setGenerating] = useState(false)
  const [labelCfg, setLabelCfg] = useState({ warranty: 'ضمان 10 شهور', widthMm: 50, heightMm: 30, printerName: '', silent: false, logoBase64: '' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [costBlurred, setCostBlurred] = useState(true)
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwChecking, setPwChecking] = useState(false)
  const [returnTarget, setReturnTarget] = useState<any>(null)
  const [returnPrice, setReturnPrice] = useState('')
  const [returning, setReturning] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

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
      api.settings.get('label_warranty'),
      api.settings.get('label_width_mm'),
      api.settings.get('label_height_mm'),
      api.settings.get('label_printer_name'),
      api.settings.get('label_silent_print'),
      api.settings.get('store_logo'),
    ])
      .then(([d, cur, lw, lwmm, lhmm, lprinter, lsilent, logo]) => {
        setItems(d.items)
        setTotal(d.total)
        setCurrency(cur || 'EGP')
        setLabelCfg({
          warranty: lw || 'ضمان 10 شهور',
          widthMm: Number(lwmm) || 50,
          heightMm: Number(lhmm) || 30,
          printerName: lprinter || '',
          silent: lsilent === 'true',
          logoBase64: logo || '',
        })
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [status, search, page, refreshKey])

  const generateListImage = async () => {
    try {
      setGenerating(true)
      const [{ items: devices }, cur] = await Promise.all([
        api.devices.getAll({ status: 'available', limit: 9999, offset: 0 }),
        api.settings.get('currency'),
      ])

      if (devices.length === 0) { toast.error('لا توجد أجهزة متاحة'); return }

      const W = 720
      const ROW_H = 34
      const TITLE_H = 56
      const FOOT_H = 36
      const ROWS_PER_PAGE = 40
      const sepX = [120, 162, 250, 340]
      const today = new Date().toLocaleDateString('en-US')
      const dateISO = new Date().toISOString().split('T')[0]
      const totalPages = Math.ceil(devices.length / ROWS_PER_PAGE)

      const drawPage = (pageDevices: any[], pageNum: number): Promise<void> =>
        new Promise((resolve) => {
          const H = TITLE_H + pageDevices.length * ROW_H + FOOT_H
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
          ctx.fillText('قائمة الأجهزة المتاحة', W / 2, 30)
          if (totalPages > 1) {
            ctx.font = '12px Cairo, Arial, sans-serif'
            ctx.fillStyle = '#888888'
            ctx.fillText(`${pageNum} / ${totalPages}`, W / 2, 48)
          }

          ctx.strokeStyle = '#2a2a2a'
          ctx.lineWidth = 1

          pageDevices.forEach((d: any, i: number) => {
            const rowY = TITLE_H + i * ROW_H

            ctx.fillStyle = i % 2 === 0 ? '#161616' : '#1c1c1c'
            ctx.fillRect(0, rowY, W, ROW_H)

            sepX.forEach(sx => {
              ctx.beginPath(); ctx.moveTo(sx, rowY); ctx.lineTo(sx, rowY + ROW_H); ctx.stroke()
            })

            const price = d.expected_sale_price || d.final_sale_price
            const priceText = price ? price.toLocaleString('en-US') : '—'
            const modelText = [d.brand, d.model, d.technical_notes].filter(Boolean).join(' ')
            const hasBox = d.box_status === 'with_box'
            const textY = rowY + ROW_H / 2 + 5

            // Box badge (far right, green)
            if (hasBox) {
              ctx.font = 'bold 11px Cairo, Arial, sans-serif'
              ctx.fillStyle = '#34d399'
              ctx.textAlign = 'right'
              ctx.fillText('Box', W - 6, textY)
            }

            // Model — shift left when Box badge is present
            ctx.font = '13px Cairo, Arial, sans-serif'
            ctx.fillStyle = '#ffffff'
            ctx.textAlign = 'right'
            ctx.fillText(modelText, hasBox ? W - 44 : W - 12, textY)

            // Storage
            ctx.textAlign = 'center'
            ctx.fillText(d.storage || '—', 375, textY)

            // Battery
            ctx.fillStyle = d.battery_health && d.battery_health >= 90 ? '#4ade80' :
                            d.battery_health && d.battery_health >= 80 ? '#facc15' : '#f87171'
            ctx.fillText(d.battery_health ? `${d.battery_health}%` : '—', 288, textY)

            // Color
            ctx.fillStyle = '#ffffff'
            ctx.fillText(d.color || '—', 195, textY)

            // Price
            ctx.fillStyle = '#fbbf24'
            ctx.font = 'bold 13px Cairo, Arial, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(priceText, 95, textY)
          })

          // Footer
          const footY = TITLE_H + pageDevices.length * ROW_H
          ctx.fillStyle = '#1e1e1e'
          ctx.fillRect(0, footY, W, FOOT_H)
          ctx.font = '12px Cairo, Arial, sans-serif'
          ctx.fillStyle = '#555555'
          ctx.textAlign = 'center'
          ctx.fillText(
            `${devices.length} جهاز متاح  •  ${today}  •  Team Store`,
            W / 2, footY + 23,
          )

          canvas.toBlob(blob => {
            if (!blob) { resolve(); return }
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = totalPages > 1
              ? `list-${dateISO}-p${pageNum}.png`
              : `list-${dateISO}.png`
            a.click()
            URL.revokeObjectURL(url)
            resolve()
          }, 'image/png')
        })

      for (let p = 0; p < totalPages; p++) {
        await drawPage(devices.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE), p + 1)
        if (p < totalPages - 1) await new Promise(r => setTimeout(r, 300))
      }

      toast.success(
        `تم تحميل الليسته (${devices.length} جهاز${totalPages > 1 ? ` - ${totalPages} صور` : ''})`
      )

    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ أثناء إنشاء الليسته')
    } finally {
      setGenerating(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  const fmt = (n: number) => (n || 0).toLocaleString('en-US') + ' ' + currency

  const handleStatus = (s: string) => { setStatus(s); setPage(1) }

  const handleEyeClick = () => {
    if (!costBlurred) {
      setCostBlurred(true)
    } else {
      setPwInput('')
      setPwError('')
      setShowPwModal(true)
    }
  }

  const handlePwConfirm = async () => {
    if (!pwInput) { setPwError('أدخل كلمة المرور'); return }
    setPwChecking(true)
    setPwError('')
    try {
      const res = await api.auth.login(user?.username || '', pwInput)
      if (res.success) {
        setCostBlurred(false)
        setShowPwModal(false)
      } else {
        setPwError('كلمة المرور غير صحيحة')
      }
    } catch {
      setPwError('حدث خطأ، حاول مرة أخرى')
    } finally {
      setPwChecking(false)
    }
  }

  const openReturnModal = (device: any) => {
    setReturnTarget(device)
    setReturnPrice(String(device.final_sale_price || device.expected_sale_price || ''))
  }

  const handleReturn = async () => {
    const price = parseFloat(returnPrice)
    if (!returnPrice || isNaN(price) || price < 0) { toast.error('أدخل سعر الارجاع'); return }
    setReturning(true)
    try {
      await api.devices.returnDevice(returnTarget.id, price, user?.id)
      toast.success('تم ارجاع الجهاز وأصبح متاحاً للبيع')
      setReturnTarget(null)
      setReturnPrice('')
      setRefreshKey(k => k + 1)
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setReturning(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">المخزون</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? 'جاري التحميل...' : `${total.toLocaleString('en-US')} جهاز إجمالاً`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEyeClick}
            title={costBlurred ? 'إظهار التكلفة (يتطلب كلمة المرور)' : 'إخفاء التكلفة'}
            className={`btn-secondary flex items-center gap-1.5 ${costBlurred ? 'text-amber-600 border-amber-300' : ''}`}
          >
            {costBlurred ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
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
                      <td dir="ltr" className="font-medium">
                        <span style={costBlurred ? { filter: 'blur(7px)', userSelect: 'none', pointerEvents: 'none' } : {}}>
                          {fmt(d.total_cost)}
                        </span>
                      </td>
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
                            onClick={() => openLabelPrint(d, labelCfg)}
                            className="btn-ghost btn-sm p-1"
                            title="Print Label"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!window.confirm(`حذف "${d.brand} ${d.model} ${d.storage}"؟\nيمكن استعادته من الإعدادات ← الأجهزة المحذوفة`)) return
                              try {
                                await api.devices.delete(d.id, user?.id)
                                setRefreshKey(k => k + 1)
                                toast.success('تم حذف الجهاز')
                              } catch (err: any) { toast.error(err.message) }
                            }}
                            className="btn-ghost btn-sm p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                            title="حذف الجهاز"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                          {d.status === 'sold' && (
                            <button
                              onClick={() => openReturnModal(d)}
                              className="btn-ghost btn-sm p-1 text-amber-600 hover:bg-amber-50"
                              title="ارجاع الجهاز"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
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
                  {rangeStart}–{rangeEnd} من {total.toLocaleString('en-US')} جهاز
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

      {/* Return device modal */}
      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" /> ارجاع جهاز
              </h2>
              <button onClick={() => setReturnTarget(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                <div className="font-semibold">{returnTarget.brand} {returnTarget.model} {returnTarget.storage}</div>
                {returnTarget.serial_number && <div className="text-xs text-slate-400 font-mono mt-0.5">{returnTarget.serial_number}</div>}
                {returnTarget.final_sale_price && (
                  <div className="text-xs text-slate-500 mt-1">سعر البيع الأصلي: <span className="font-medium" dir="ltr">{fmt(returnTarget.final_sale_price)}</span></div>
                )}
              </div>
              <div>
                <label className="label">سعر الارجاع</label>
                <input
                  type="number"
                  autoFocus
                  value={returnPrice}
                  onChange={e => setReturnPrice(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReturn()}
                  className="input w-full"
                  placeholder="0"
                  dir="ltr"
                  min="0"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setReturnTarget(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
                <button
                  onClick={handleReturn}
                  disabled={returning}
                  className="btn-primary flex-1 justify-center gap-1.5 disabled:opacity-60"
                  style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                >
                  <RotateCcw className="w-4 h-4" />
                  {returning ? 'جاري...' : 'تأكيد الارجاع'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password modal to unblur cost */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-600" /> إظهار التكلفة
              </h2>
              <button onClick={() => setShowPwModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">أدخل كلمة مرورك لإظهار أعمدة التكلفة</p>
              <input
                type="password"
                autoFocus
                value={pwInput}
                onChange={e => { setPwInput(e.target.value); setPwError('') }}
                onKeyDown={e => e.key === 'Enter' && handlePwConfirm()}
                className="input w-full"
                placeholder="كلمة المرور"
                dir="ltr"
              />
              {pwError && <p className="text-xs text-red-500">{pwError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowPwModal(false)} className="btn-secondary flex-1 justify-center">إلغاء</button>
                <button
                  onClick={handlePwConfirm}
                  disabled={pwChecking}
                  className="btn-primary flex-1 justify-center disabled:opacity-60"
                >
                  {pwChecking ? '...' : 'تأكيد'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
