import React, { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { Banknote, ChevronDown, ChevronUp, Plus, Phone } from 'lucide-react'
import PaymentModal from '../components/PaymentModal'

interface PendingItem {
  id: number
  date: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  payment_method: string
  contact_id: number
  contact_name: string
  contact_phone: string
  model: string
  storage: string
  color: string
  brand: string
  invoice_number?: string
  type: 'purchase' | 'sale'
}

interface PaymentRecord {
  id: number
  amount: number
  payment_method: string
  payment_date: string
  notes?: string
  contact_name: string
}

const methodLabel: Record<string, string> = {
  cash: 'نقد',
  transfer: 'تحويل',
  check: 'شيك',
  other: 'أخرى',
}

export default function PaymentsPage() {
  const [purchases, setPurchases] = useState<PendingItem[]>([])
  const [sales, setSales] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('EGP')
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [paymentHistories, setPaymentHistories] = useState<Record<string, PaymentRecord[]>>({})
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({})
  const [modalItem, setModalItem] = useState<PendingItem | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.payments.getPending(), api.settings.get('currency')])
      .then(([pending, cur]) => {
        setPurchases(pending.purchases as PendingItem[])
        setSales(pending.sales as PendingItem[])
        setCurrency(cur || 'EGP')
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency

  const totalSalesRemaining = sales.reduce((s, i) => s + (i.remaining_amount || 0), 0)
  const totalPurchasesRemaining = purchases.reduce((s, i) => s + (i.remaining_amount || 0), 0)

  const handleExpand = async (item: PendingItem) => {
    const key = `${item.type}-${item.id}`
    if (expandedId === item.id && activeTab === (item.type === 'sale' ? 'sales' : 'purchases')) {
      setExpandedId(null)
      return
    }
    setExpandedId(item.id)
    if (!paymentHistories[key]) {
      setHistoryLoading((prev) => ({ ...prev, [key]: true }))
      try {
        const records = await api.payments.getForTransaction(item.type, item.id)
        setPaymentHistories((prev) => ({ ...prev, [key]: records as PaymentRecord[] }))
      } catch (e: any) {
        toast.error(e.message)
      } finally {
        setHistoryLoading((prev) => ({ ...prev, [key]: false }))
      }
    }
  }

  const handlePaymentSuccess = () => {
    setExpandedId(null)
    setPaymentHistories({})
    load()
  }

  const remainingBadge = (remaining: number, total: number) => {
    const ratio = total > 0 ? remaining / total : 0
    const color = ratio > 0.5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
    return <span className={`badge ${color} font-bold`}>{fmt(remaining)}</span>
  }

  const renderTable = (items: PendingItem[], type: 'sale' | 'purchase') => {
    if (items.length === 0) {
      return (
        <div className="p-12 text-center text-slate-400">
          لا توجد مديونيات {type === 'sale' ? 'بيع' : 'شراء'}
        </div>
      )
    }

    return (
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>العميل / البائع</th>
              <th>الجهاز</th>
              <th>التاريخ</th>
              <th>الإجمالي</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const key = `${item.type}-${item.id}`
              const isExpanded = expandedId === item.id
              const history = paymentHistories[key]
              const loadingHistory = historyLoading[key]

              return (
                <React.Fragment key={item.id}>
                  <tr>
                    <td>
                      <div className="font-medium text-slate-900">{item.contact_name}</div>
                      {item.contact_phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span dir="ltr">{item.contact_phone}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm font-medium">{item.brand} {item.model}</div>
                      <div className="text-xs text-slate-500">{item.storage} {item.color}</div>
                    </td>
                    <td className="text-sm text-slate-600">
                      {item.date ? new Date(item.date).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td dir="ltr" className="text-sm font-medium">{fmt(item.total_amount)}</td>
                    <td dir="ltr" className="text-sm text-green-600 font-medium">{fmt(item.paid_amount)}</td>
                    <td>{remainingBadge(item.remaining_amount, item.total_amount)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setModalItem(item)}
                          className="btn-primary btn-sm flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          دفعة
                        </button>
                        <button
                          onClick={() => handleExpand(item)}
                          className="btn-secondary btn-sm p-1"
                          title="السجل"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 p-0">
                        <div className="px-6 py-4">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">سجل الدفعات</h4>
                          {loadingHistory ? (
                            <div className="text-sm text-slate-400 py-2">جاري التحميل...</div>
                          ) : !history || history.length === 0 ? (
                            <div className="text-sm text-slate-400 py-2">لا توجد دفعات مسجلة بعد</div>
                          ) : (
                            <div className="space-y-2">
                              {history.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-slate-100"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <div>
                                      <span className="text-sm font-medium text-slate-800">
                                        {fmt(p.amount)}
                                      </span>
                                      <span className="text-xs text-slate-500 mr-2">
                                        {methodLabel[p.payment_method] || p.payment_method}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500">
                                    {p.notes && <span className="italic">{p.notes}</span>}
                                    <span dir="ltr">
                                      {p.payment_date
                                        ? new Date(p.payment_date).toLocaleDateString('ar-EG')
                                        : '-'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">الديون والمديونيات</h1>
          <p className="text-slate-500 text-sm mt-1">متابعة المبالغ المتبقية</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">العملاء يدينون لنا</div>
            <div className="text-xl font-bold text-amber-700">{fmt(totalSalesRemaining)}</div>
            <div className="text-xs text-slate-400">{sales.length} صفقة معلقة</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">ندين للبائعين</div>
            <div className="text-xl font-bold text-red-700">{fmt(totalPurchasesRemaining)}</div>
            <div className="text-xs text-slate-400">{purchases.length} صفقة معلقة</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setActiveTab('sales'); setExpandedId(null) }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'sales'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          مديونيات البيع
          {sales.length > 0 && (
            <span className={`mr-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'sales' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
              {sales.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('purchases'); setExpandedId(null) }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'purchases'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          مديونيات الشراء
          {purchases.length > 0 && (
            <span className={`mr-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'purchases' ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>
              {purchases.length}
            </span>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : activeTab === 'sales' ? (
          renderTable(sales, 'sale')
        ) : (
          renderTable(purchases, 'purchase')
        )}
      </div>

      {/* Payment Modal */}
      {modalItem && (
        <PaymentModal
          type={modalItem.type}
          transactionId={modalItem.id}
          contactId={modalItem.contact_id}
          contactName={modalItem.contact_name}
          totalAmount={modalItem.total_amount}
          paidAmount={modalItem.paid_amount}
          remainingAmount={modalItem.remaining_amount}
          currency={currency}
          onClose={() => setModalItem(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
