import React, { useState } from 'react'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { X, CreditCard, DollarSign } from 'lucide-react'

interface Props {
  type: 'purchase' | 'sale'
  transactionId: number
  contactId: number
  contactName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  currency: string
  onClose: () => void
  onSuccess: () => void
}

const paymentMethods = [
  { value: 'cash', label: 'نقد' },
  { value: 'transfer', label: 'تحويل' },
  { value: 'check', label: 'شيك' },
  { value: 'other', label: 'أخرى' },
]

export default function PaymentModal({
  type,
  transactionId,
  contactId,
  contactName,
  totalAmount,
  paidAmount,
  remainingAmount,
  currency,
  onClose,
  onSuccess,
}: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [amount, setAmount] = useState(remainingAmount.toString())
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fmt = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency

  const amountNum = parseFloat(amount) || 0

  const validate = (): string => {
    if (!amount || isNaN(amountNum)) return 'أدخل المبلغ'
    if (amountNum <= 0) return 'يجب أن يكون المبلغ أكبر من صفر'
    if (amountNum > remainingAmount) return `المبلغ لا يمكن أن يتجاوز المتبقي (${fmt(remainingAmount)})`
    if (!paymentDate) return 'أدخل تاريخ الدفعة'
    return ''
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      await api.payments.add({
        transaction_type: type,
        transaction_id: transactionId,
        contact_id: contactId,
        amount: amountNum,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: notes || undefined,
      })
      toast.success('تم تسجيل الدفعة بنجاح')
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
    setLoading(false)
  }

  const debtColor = remainingAmount > totalAmount * 0.5 ? 'text-red-600' : 'text-amber-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">إضافة دفعة</h2>
              <p className="text-sm text-slate-500">{contactName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="mx-5 mt-4 rounded-xl bg-slate-50 p-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">الإجمالي</div>
            <div className="text-sm font-bold text-slate-800">{fmt(totalAmount)}</div>
          </div>
          <div className="text-center border-x border-slate-200">
            <div className="text-xs text-slate-500 mb-1">المدفوع</div>
            <div className="text-sm font-bold text-green-600">{fmt(paidAmount)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">المتبقي</div>
            <div className={`text-sm font-bold ${debtColor}`}>{fmt(remainingAmount)}</div>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Amount */}
          <div>
            <label className="label">مبلغ الدفعة</label>
            <div className="relative">
              <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError('') }}
                className="input pr-9"
                placeholder="0"
                min="0"
                max={remainingAmount}
                step="any"
                dir="ltr"
              />
            </div>
            {amountNum > 0 && amountNum <= remainingAmount && (
              <p className="text-xs text-slate-500 mt-1">
                المتبقي بعد هذه الدفعة: <span className={debtColor + ' font-medium'}>{fmt(remainingAmount - amountNum)}</span>
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="label">طريقة الدفع</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input"
            >
              {paymentMethods.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="label">تاريخ الدفعة</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => { setPaymentDate(e.target.value); setError('') }}
              className="input"
              dir="ltr"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input resize-none"
              rows={2}
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-5 pb-5">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary flex-1 justify-center"
          >
            {loading ? 'جاري الحفظ...' : 'تأكيد الدفعة'}
          </button>
        </div>
      </div>
    </div>
  )
}
