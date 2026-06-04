import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { User, Smartphone, ShoppingCart, Search, CheckCircle, AlertTriangle } from 'lucide-react'

const MODELS = ['iPhone 6', 'iPhone 6S', 'iPhone 6S Plus', 'iPhone 7', 'iPhone 7 Plus', 'iPhone 8', 'iPhone 8 Plus', 'iPhone X', 'iPhone XS', 'iPhone XS Max', 'iPhone XR', 'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max', 'iPhone 12', 'iPhone 12 Mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max', 'iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max', 'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max']
const STORAGES = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB']
const COLORS = ['أسود', 'أبيض', 'ذهبي', 'فضي', 'أزرق', 'بنفسجي', 'وردي', 'أحمر', 'أخضر', 'أصفر', 'برتقالي', 'رمادي']
const CONDITIONS = [{ value: 'used', label: 'مستعمل' }, { value: 'new', label: 'جديد' }, { value: 'refurbished', label: 'مجدد' }]
const PAYMENT_METHODS = [{ value: 'cash', label: 'نقد' }, { value: 'transfer', label: 'تحويل' }, { value: 'check', label: 'شيك' }, { value: 'other', label: 'أخرى' }]
const BOX_STATUS = [{ value: 'with_box', label: 'مع الكرتون' }, { value: 'without_box', label: 'بدون كرتون' }, { value: 'damaged_box', label: 'كرتون تالف' }]

export default function AddPurchase() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [sellerFound, setSellerFound] = useState<any>(null)
  const [serialWarning, setSerialWarning] = useState('')
  const [imeiWarning, setImeiWarning] = useState('')

  const [form, setForm] = useState({
    // Seller
    seller_phone: '',
    seller_name: '',
    seller_secondary_phone: '',
    seller_national_id: '',
    seller_address: '',
    seller_notes: '',
    // Device
    brand: 'Apple',
    model: '',
    storage: '',
    color: '',
    condition: 'used',
    serial_number: '',
    imei1: '',
    imei2: '',
    battery_health: '',
    box_status: 'without_box',
    accessories: '',
    technical_notes: '',
    expected_sale_price: '',
    // Purchase
    purchase_date: new Date().toISOString().slice(0, 10),
    purchase_price: '',
    extra_costs: '',
    payment_method: 'cash',
    paid_amount: '',
    notes: '',
  })

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  // Phone lookup
  useEffect(() => {
    if (form.seller_phone.length >= 9) {
      api.contacts.findByPhone(form.seller_phone).then((c) => {
        if (c) {
          setSellerFound(c)
          setForm((p) => ({
            ...p,
            seller_name: c.name,
            seller_secondary_phone: c.secondary_phone || '',
            seller_national_id: c.national_id || '',
            seller_address: c.address || '',
            seller_notes: c.notes || '',
          }))
          toast.success('تم العثور على البائع وتحميل بياناته')
        } else {
          setSellerFound(null)
        }
      }).catch(() => {})
    } else {
      setSellerFound(null)
    }
  }, [form.seller_phone])

  // Serial check
  useEffect(() => {
    if (form.serial_number.length >= 8) {
      api.devices.findBySerial(form.serial_number).then((d) => {
        if (d) setSerialWarning('هذا السريال مسجل بالفعل!')
        else setSerialWarning('')
      })
    } else setSerialWarning('')
  }, [form.serial_number])

  // IMEI check
  useEffect(() => {
    if (form.imei1.length >= 10) {
      api.devices.findByImei(form.imei1).then((d) => {
        if (d) setImeiWarning('هذا الـ IMEI مسجل بالفعل!')
        else setImeiWarning('')
      })
    } else setImeiWarning('')
  }, [form.imei1])

  const totalCost = (parseFloat(form.purchase_price) || 0) + (parseFloat(form.extra_costs) || 0)
  const remaining = (parseFloat(form.purchase_price) || 0) - (parseFloat(form.paid_amount) || (parseFloat(form.purchase_price) || 0))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.seller_phone) return toast.error('رقم الموبايل مطلوب')
    if (!form.seller_name) return toast.error('اسم البائع مطلوب')
    if (!form.model) return toast.error('موديل الجهاز مطلوب')
    if (!form.storage) return toast.error('السعة التخزينية مطلوبة')
    if (!form.color) return toast.error('اللون مطلوب')
    if (!form.purchase_price) return toast.error('سعر الشراء مطلوب')
    if (serialWarning) return toast.error(serialWarning)
    if (imeiWarning) return toast.error(imeiWarning)

    setLoading(true)
    try {
      const result = await api.purchases.create({
        ...form,
        battery_health: form.battery_health ? parseInt(form.battery_health) : undefined,
        purchase_price: parseFloat(form.purchase_price),
        extra_costs: parseFloat(form.extra_costs) || 0,
        expected_sale_price: form.expected_sale_price ? parseFloat(form.expected_sale_price) : undefined,
        paid_amount: form.paid_amount ? parseFloat(form.paid_amount) : undefined,
        created_by: user?.id,
      })
      toast.success('تم حفظ عملية الشراء بنجاح')
      navigate(`/devices/${result.device_id}`)
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">إضافة عملية شراء</h1>
          <p className="text-slate-500 text-sm mt-1">تسجيل شراء جهاز جديد من البائع</p>
        </div>
        <button onClick={() => navigate('/devices')} className="btn-secondary">إلغاء</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seller Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              بيانات البائع
            </h2>
            {sellerFound && (
              <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> بائع موجود
              </span>
            )}
          </div>
          <div className="card-body space-y-4">
            <div className="form-grid-3">
              <div>
                <label className="label">رقم الموبايل *</label>
                <input value={form.seller_phone} onChange={(e) => f('seller_phone', e.target.value)}
                  className="input" placeholder="01xxxxxxxxx" dir="ltr" />
              </div>
              <div>
                <label className="label">الاسم *</label>
                <input value={form.seller_name} onChange={(e) => f('seller_name', e.target.value)}
                  className="input" placeholder="اسم البائع" />
              </div>
              <div>
                <label className="label">رقم موبايل ثانوي</label>
                <input value={form.seller_secondary_phone} onChange={(e) => f('seller_secondary_phone', e.target.value)}
                  className="input" placeholder="اختياري" dir="ltr" />
              </div>
            </div>
            <div className="form-grid-3">
              <div>
                <label className="label">الرقم القومي</label>
                <input value={form.seller_national_id} onChange={(e) => f('seller_national_id', e.target.value)}
                  className="input" placeholder="اختياري" dir="ltr" />
              </div>
              <div>
                <label className="label">العنوان</label>
                <input value={form.seller_address} onChange={(e) => f('seller_address', e.target.value)}
                  className="input" placeholder="اختياري" />
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <input value={form.seller_notes} onChange={(e) => f('seller_notes', e.target.value)}
                  className="input" placeholder="اختياري" />
              </div>
            </div>
          </div>
        </div>

        {/* Device Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand-600" />
              بيانات الجهاز
            </h2>
          </div>
          <div className="card-body space-y-4">
            <div className="form-grid-3">
              <div>
                <label className="label">الموديل *</label>
                <select value={form.model} onChange={(e) => f('model', e.target.value)} className="input">
                  <option value="">اختر الموديل</option>
                  {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">السعة *</label>
                <select value={form.storage} onChange={(e) => f('storage', e.target.value)} className="input">
                  <option value="">اختر السعة</option>
                  {STORAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">اللون *</label>
                <select value={form.color} onChange={(e) => f('color', e.target.value)} className="input">
                  <option value="">اختر اللون</option>
                  {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid-3">
              <div>
                <label className="label">الحالة</label>
                <select value={form.condition} onChange={(e) => f('condition', e.target.value)} className="input">
                  {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">الكرتون</label>
                <select value={form.box_status} onChange={(e) => f('box_status', e.target.value)} className="input">
                  {BOX_STATUS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">نسبة البطارية %</label>
                <input type="number" min="0" max="100" value={form.battery_health}
                  onChange={(e) => f('battery_health', e.target.value)} className="input" placeholder="مثال: 85" dir="ltr" />
              </div>
            </div>
            <div className="form-grid-3">
              <div>
                <label className="label">السريال (Serial)</label>
                <input value={form.serial_number} onChange={(e) => f('serial_number', e.target.value.toUpperCase())}
                  className={`input ${serialWarning ? 'border-red-400' : ''}`} placeholder="XXXXXXXXXXXXXXX" dir="ltr" />
                {serialWarning && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{serialWarning}</p>}
              </div>
              <div>
                <label className="label">IMEI 1</label>
                <input value={form.imei1} onChange={(e) => f('imei1', e.target.value)}
                  className={`input ${imeiWarning ? 'border-red-400' : ''}`} placeholder="XXXXXXXXXXXXXXX" dir="ltr" />
                {imeiWarning && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{imeiWarning}</p>}
              </div>
              <div>
                <label className="label">IMEI 2</label>
                <input value={form.imei2} onChange={(e) => f('imei2', e.target.value)}
                  className="input" placeholder="XXXXXXXXXXXXXXX" dir="ltr" />
              </div>
            </div>
            <div className="form-grid-2">
              <div>
                <label className="label">الإكسسوارات</label>
                <input value={form.accessories} onChange={(e) => f('accessories', e.target.value)}
                  className="input" placeholder="مثال: كابل، سماعة" />
              </div>
              <div>
                <label className="label">ملاحظات تقنية</label>
                <input value={form.technical_notes} onChange={(e) => f('technical_notes', e.target.value)}
                  className="input" placeholder="أي ملاحظات على الجهاز" />
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-brand-600" />
              بيانات الشراء
            </h2>
          </div>
          <div className="card-body space-y-4">
            <div className="form-grid-3">
              <div>
                <label className="label">تاريخ الشراء *</label>
                <input type="date" value={form.purchase_date} onChange={(e) => f('purchase_date', e.target.value)}
                  className="input" dir="ltr" />
              </div>
              <div>
                <label className="label">سعر الشراء *</label>
                <input type="number" min="0" value={form.purchase_price} onChange={(e) => f('purchase_price', e.target.value)}
                  className="input" placeholder="0" dir="ltr" />
              </div>
              <div>
                <label className="label">تكاليف إضافية</label>
                <input type="number" min="0" value={form.extra_costs} onChange={(e) => f('extra_costs', e.target.value)}
                  className="input" placeholder="0" dir="ltr" />
              </div>
            </div>
            <div className="form-grid-3">
              <div>
                <label className="label">إجمالي التكلفة</label>
                <div className="input bg-slate-50 text-slate-700 font-medium" dir="ltr">{totalCost.toLocaleString()} EGP</div>
              </div>
              <div>
                <label className="label">سعر البيع المتوقع</label>
                <input type="number" min="0" value={form.expected_sale_price} onChange={(e) => f('expected_sale_price', e.target.value)}
                  className="input" placeholder="اختياري" dir="ltr" />
              </div>
              <div>
                <label className="label">طريقة الدفع</label>
                <select value={form.payment_method} onChange={(e) => f('payment_method', e.target.value)} className="input">
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid-3">
              <div>
                <label className="label">المبلغ المدفوع</label>
                <input type="number" min="0" value={form.paid_amount} onChange={(e) => f('paid_amount', e.target.value)}
                  className="input" placeholder="اتركه فارغاً للدفع الكامل" dir="ltr" />
              </div>
              <div>
                <label className="label">المبلغ المتبقي</label>
                <div className={`input bg-slate-50 font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                  {remaining.toLocaleString()} EGP
                </div>
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <input value={form.notes} onChange={(e) => f('notes', e.target.value)}
                  className="input" placeholder="اختياري" />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/devices')} className="btn-secondary">إلغاء</button>
          <button type="submit" disabled={loading} className="btn-primary btn-lg">
            {loading ? 'جاري الحفظ...' : 'حفظ عملية الشراء'}
          </button>
        </div>
      </form>
    </div>
  )
}
