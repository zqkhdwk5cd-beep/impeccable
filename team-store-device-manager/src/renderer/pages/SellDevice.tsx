import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Search, Smartphone, User, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import SalespersonModal from '../components/SalespersonModal'

const PAYMENT_METHODS = [{ value: 'cash', label: 'نقد' }, { value: 'transfer', label: 'تحويل' }, { value: 'check', label: 'شيك' }, { value: 'other', label: 'أخرى' }]

function DeviceCard({ device, onSelect }: { device: any; onSelect: () => void }) {
  const statusLabel: Record<string, string> = { available: 'متاح', reserved: 'محجوز', sold: 'مباع', repair: 'إصلاح', returned: 'مرتجع', archived: 'مؤرشف' }
  const canSell = ['available', 'reserved'].includes(device.status)
  return (
    <div className={`card p-4 cursor-pointer border-2 transition-all ${canSell ? 'hover:border-brand-400' : 'opacity-60 cursor-not-allowed'}`} onClick={() => canSell && onSelect()}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-900">{device.brand} {device.model}</div>
          <div className="text-sm text-slate-500">{device.storage} · {device.color}</div>
          {device.serial_number && <div className="text-xs text-slate-400 mt-1 font-mono">{device.serial_number}</div>}
        </div>
        <span className={`status-${device.status}`}>{statusLabel[device.status]}</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-600">
        <span>التكلفة: {device.total_cost?.toLocaleString()} EGP</span>
        {device.battery_health && <span>البطارية: {device.battery_health}%</span>}
        {device.expected_sale_price && <span>سعر متوقع: {device.expected_sale_price?.toLocaleString()} EGP</span>}
      </div>
    </div>
  )
}

export default function SellDevice() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [salesperson, setSalesperson] = useState<{ id: number; name: string } | null | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<any>(null)
  const [buyerFound, setBuyerFound] = useState<any>(null)

  const [buyerForm, setBuyerForm] = useState({
    buyer_phone: '',
    buyer_name: '',
    buyer_address: '',
    buyer_national_id: '',
    buyer_notes: '',
  })

  const [saleForm, setSaleForm] = useState({
    sale_date: new Date().toISOString().slice(0, 10),
    sale_price: '',
    discount: '',
    paid_amount: '',
    payment_method: 'cash',
    notes: '',
  })

  const bf = (k: string, v: string) => setBuyerForm((p) => ({ ...p, [k]: v }))
  const sf = (k: string, v: string) => setSaleForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      api.devices.search(searchQuery).then((r) => setSearchResults(r.filter((d) => ['available', 'reserved'].includes(d.status))))
    }
  }, [searchQuery])

  useEffect(() => {
    if (buyerForm.buyer_phone.length >= 9) {
      api.contacts.findByPhone(buyerForm.buyer_phone).then((c) => {
        if (c) {
          setBuyerFound(c)
          setBuyerForm((p) => ({ ...p, buyer_name: c.name, buyer_address: c.address || '', buyer_national_id: c.national_id || '', buyer_notes: c.notes || '' }))
          toast.success('تم العثور على العميل وتحميل بياناته')
        } else setBuyerFound(null)
      }).catch(() => {})
    } else setBuyerFound(null)
  }, [buyerForm.buyer_phone])

  useEffect(() => {
    if (selectedDevice) {
      setSaleForm((p) => ({ ...p, sale_price: String(selectedDevice.expected_sale_price || selectedDevice.total_cost || '') }))
    }
  }, [selectedDevice])

  const finalPrice = Math.max(0, (parseFloat(saleForm.sale_price) || 0) - (parseFloat(saleForm.discount) || 0))
  const remaining = finalPrice - (parseFloat(saleForm.paid_amount) || finalPrice)
  const profit = selectedDevice ? finalPrice - selectedDevice.total_cost : 0

  const handleSale = async () => {
    if (!selectedDevice) return toast.error('يرجى اختيار الجهاز')
    if (!buyerForm.buyer_phone) return toast.error('رقم الموبايل مطلوب')
    if (!buyerForm.buyer_name) return toast.error('اسم العميل مطلوب')
    if (!saleForm.sale_price) return toast.error('سعر البيع مطلوب')

    const confirm = window.confirm(`هل تريد تأكيد بيع ${selectedDevice.brand} ${selectedDevice.model}؟`)
    if (!confirm) return

    setLoading(true)
    try {
      const result = await api.sales.create({
        device_id: selectedDevice.id,
        ...buyerForm,
        ...saleForm,
        sale_price: parseFloat(saleForm.sale_price),
        discount: parseFloat(saleForm.discount) || 0,
        paid_amount: saleForm.paid_amount ? parseFloat(saleForm.paid_amount) : undefined,
        created_by: user?.id,
        salesperson_id: salesperson?.id,
      })
      toast.success('تم إنشاء الفاتورة بنجاح')
      navigate(`/invoices/${result.invoice_id}`)
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {salesperson === undefined && (
        <SalespersonModal onSelect={(sp) => setSalesperson(sp)} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">بيع جهاز</h1>
          <p className="text-slate-500 text-sm mt-1">
            اتبع الخطوات لإتمام عملية البيع
            {salesperson && (
              <span className="mr-2 inline-flex items-center gap-1 bg-brand-100 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-full">
                <User className="w-3 h-3" /> {salesperson.name}
              </span>
            )}
          </p>
        </div>
        <button onClick={() => navigate('/')} className="btn-secondary">إلغاء</button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-6">
        {[{ n: 1, label: 'اختيار الجهاز' }, { n: 2, label: 'بيانات العميل' }, { n: 3, label: 'بيانات البيع' }].map((s) => (
          <React.Fragment key={s.n}>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${step === s.n ? 'bg-brand-600 text-white' : step > s.n ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-white/20">{step > s.n ? '✓' : s.n}</span>
              {s.label}
            </div>
            {s.n < 3 && <div className="flex-1 h-px bg-slate-200" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Device selection */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold flex items-center gap-2"><Smartphone className="w-4 h-4 text-brand-600" />اختيار الجهاز</h2>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="input" placeholder="ابحث بالسريال، IMEI، الموديل..." autoFocus />
            </div>
            {searchResults.length === 0 && searchQuery.length >= 2 && (
              <div className="text-center py-8 text-slate-400">لا توجد أجهزة متاحة بهذا البحث</div>
            )}
            {searchResults.length === 0 && searchQuery.length < 2 && (
              <div className="text-center py-8 text-slate-400">اكتب للبحث عن الجهاز (سريال، IMEI، موديل)</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {searchResults.map((d) => (
                <DeviceCard key={d.id} device={d} onSelect={() => { setSelectedDevice(d); setStep(2) }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Buyer */}
      {step === 2 && selectedDevice && (
        <div className="space-y-4">
          <div className="card p-4 bg-slate-50 border-brand-200 border-2">
            <div className="flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-brand-600" />
              <div>
                <div className="font-semibold">{selectedDevice.brand} {selectedDevice.model} {selectedDevice.storage} {selectedDevice.color}</div>
                <div className="text-sm text-slate-500">تكلفة: {selectedDevice.total_cost?.toLocaleString()} EGP</div>
              </div>
              <button onClick={() => setStep(1)} className="mr-auto btn-secondary btn-sm">تغيير</button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold flex items-center gap-2"><User className="w-4 h-4 text-brand-600" />بيانات العميل</h2>
              {buyerFound && <span className="badge bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> عميل موجود</span>}
            </div>
            <div className="card-body space-y-4">
              <div className="form-grid-3">
                <div>
                  <label className="label">رقم الموبايل *</label>
                  <input value={buyerForm.buyer_phone} onChange={(e) => bf('buyer_phone', e.target.value)} className="input" placeholder="01xxxxxxxxx" dir="ltr" />
                </div>
                <div>
                  <label className="label">الاسم *</label>
                  <input value={buyerForm.buyer_name} onChange={(e) => bf('buyer_name', e.target.value)} className="input" placeholder="اسم العميل" />
                </div>
                <div>
                  <label className="label">العنوان</label>
                  <input value={buyerForm.buyer_address} onChange={(e) => bf('buyer_address', e.target.value)} className="input" placeholder="اختياري" />
                </div>
              </div>
              <div className="form-grid-2">
                <div>
                  <label className="label">الرقم القومي</label>
                  <input value={buyerForm.buyer_national_id} onChange={(e) => bf('buyer_national_id', e.target.value)} className="input" placeholder="اختياري" dir="ltr" />
                </div>
                <div>
                  <label className="label">ملاحظات</label>
                  <input value={buyerForm.buyer_notes} onChange={(e) => bf('buyer_notes', e.target.value)} className="input" placeholder="اختياري" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setStep(1)} className="btn-secondary">السابق</button>
            <button onClick={() => { if (!buyerForm.buyer_phone || !buyerForm.buyer_name) return toast.error('الاسم والهاتف مطلوبان'); setStep(3) }} className="btn-primary">التالي</button>
          </div>
        </div>
      )}

      {/* Step 3: Sale */}
      {step === 3 && selectedDevice && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4 bg-slate-50 border-brand-200 border-2">
              <div className="text-xs text-slate-500 mb-1">الجهاز</div>
              <div className="font-semibold">{selectedDevice.brand} {selectedDevice.model} {selectedDevice.storage}</div>
              <div className="text-sm text-slate-500">{selectedDevice.color} · تكلفة: {selectedDevice.total_cost?.toLocaleString()} EGP</div>
            </div>
            <div className="card p-4 bg-slate-50 border-blue-200 border-2">
              <div className="text-xs text-slate-500 mb-1">العميل</div>
              <div className="font-semibold">{buyerForm.buyer_name}</div>
              <div className="text-sm text-slate-500">{buyerForm.buyer_phone}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-brand-600" />بيانات البيع والفاتورة</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="form-grid-3">
                <div>
                  <label className="label">تاريخ البيع *</label>
                  <input type="date" value={saleForm.sale_date} onChange={(e) => sf('sale_date', e.target.value)} className="input" dir="ltr" />
                </div>
                <div>
                  <label className="label">سعر البيع *</label>
                  <input type="number" min="0" value={saleForm.sale_price} onChange={(e) => sf('sale_price', e.target.value)} className="input" dir="ltr" />
                </div>
                <div>
                  <label className="label">الخصم</label>
                  <input type="number" min="0" value={saleForm.discount} onChange={(e) => sf('discount', e.target.value)} className="input" placeholder="0" dir="ltr" />
                </div>
              </div>
              <div className="form-grid-3">
                <div>
                  <label className="label">السعر بعد الخصم</label>
                  <div className="input bg-slate-50 font-medium text-slate-800" dir="ltr">{finalPrice.toLocaleString()} EGP</div>
                </div>
                <div>
                  <label className="label">المبلغ المدفوع</label>
                  <input type="number" min="0" value={saleForm.paid_amount} onChange={(e) => sf('paid_amount', e.target.value)} className="input" placeholder="اتركه للدفع الكامل" dir="ltr" />
                </div>
                <div>
                  <label className="label">المتبقي</label>
                  <div className={`input bg-slate-50 font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`} dir="ltr">{remaining.toLocaleString()} EGP</div>
                </div>
              </div>
              <div className="form-grid-2">
                <div>
                  <label className="label">طريقة الدفع</label>
                  <select value={saleForm.payment_method} onChange={(e) => sf('payment_method', e.target.value)} className="input">
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">ملاحظات</label>
                  <input value={saleForm.notes} onChange={(e) => sf('notes', e.target.value)} className="input" placeholder="اختياري" />
                </div>
              </div>

              {selectedDevice && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-800">
                    الربح المتوقع: <span className="text-lg font-bold">{profit.toLocaleString()} EGP</span>
                    <span className="text-xs text-green-600 mr-2">({((profit / (selectedDevice.total_cost || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setStep(2)} className="btn-secondary">السابق</button>
            <button onClick={handleSale} disabled={loading} className="btn-success btn-lg">
              {loading ? 'جاري الحفظ...' : 'تأكيد البيع وإنشاء الفاتورة'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
