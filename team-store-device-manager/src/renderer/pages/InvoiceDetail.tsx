import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { ArrowRight, Printer, Download } from 'lucide-react'

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('ar-EG') : '-' }

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([api.invoices.getById(Number(id)), api.settings.getAll()])
      .then(([inv, s]) => { setInvoice(inv); setSettings(s) })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = async () => {
    // Use dynamic import for jsPDF
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const inv = invoice
      const s = settings

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // We'll use a simple layout
      doc.setFont('helvetica')

      // Store name
      doc.setFontSize(20)
      doc.text(s.store_name || 'Team Store', 105, 20, { align: 'center' })

      doc.setFontSize(10)
      doc.text(s.store_address || '9 ش ترعه السواحل - الوراق - الجيزه', 105, 28, { align: 'center' })

      doc.setFontSize(14)
      doc.text(`Invoice #${inv.invoice_number}`, 105, 40, { align: 'center' })

      doc.setFontSize(10)
      doc.text(`Date: ${formatDate(inv.issue_date)}`, 20, 50)
      doc.text(`Customer: ${inv.buyer_name}`, 20, 58)
      doc.text(`Phone: ${inv.buyer_phone}`, 20, 66)

      // Items table
      autoTable(doc, {
        startY: 75,
        head: [['Description', 'Serial/IMEI', 'Amount']],
        body: (inv.items || []).map((item: any) => [
          item.description,
          item.serial_or_imei || '-',
          `${item.amount.toLocaleString()} EGP`,
        ]),
        styles: { halign: 'left' },
        headStyles: { fillColor: [15, 150, 235] },
      })

      const finalY = (doc as any).lastAutoTable?.finalY || 100

      doc.setFontSize(12)
      doc.text(`Total: ${inv.total_amount?.toLocaleString()} EGP`, 20, finalY + 10)
      doc.text(`Amount Due: ${inv.amount_due?.toLocaleString()} EGP`, 20, finalY + 18)

      doc.save(`invoice-${inv.invoice_number}.pdf`)
      toast.success('تم تصدير الفاتورة كـ PDF')
    } catch (err: any) {
      toast.error('فشل تصدير PDF: ' + err.message)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400 animate-pulse">جاري التحميل...</div></div>
  if (!invoice) return <div className="text-center py-20 text-slate-400">الفاتورة غير موجودة</div>

  const inv = invoice
  const s = settings
  const currency = s.currency || 'EGP'
  const fmt = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency

  return (
    <div className="max-w-3xl mx-auto">
      {/* Nav - no-print */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate('/invoices')} className="text-brand-600 hover:text-brand-800 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> الفواتير</button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">فاتورة #{inv.invoice_number}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-secondary"><Printer className="w-4 h-4" /> طباعة</button>
          <button onClick={handleExportPDF} className="btn-primary"><Download className="w-4 h-4" /> تصدير PDF</button>
        </div>
      </div>

      {/* Invoice */}
      <div ref={printRef} className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm print-invoice" style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
        {/* Header */}
        <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
          <div className="text-3xl font-bold text-slate-900 mb-1">{s.store_name || 'Team Store'}</div>
          <div className="text-sm text-slate-600">{s.store_address || '9 ش ترعه السواحل / الوراق - الجيزه - مصر'}</div>
          {s.store_phone && <div className="text-sm text-slate-600 mt-1">📞 {s.store_phone}</div>}
        </div>

        {/* Invoice title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-2xl font-bold text-brand-700">فاتورة رقم: {inv.invoice_number}</div>
            <div className="text-sm text-slate-500 mt-1">تاريخ الإصدار: {formatDate(inv.issue_date)}</div>
          </div>
          <div className="text-left">
            <div className="text-sm text-slate-500">القيمة الواجب تسديدها</div>
            <div className="text-3xl font-bold text-red-600" dir="ltr">{fmt(inv.amount_due)}</div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-xs text-slate-500 mb-2 font-semibold uppercase">من</div>
            <div className="font-bold text-slate-900">{s.store_name || 'Team Store'}</div>
            <div className="text-sm text-slate-600 mt-1">{s.store_address || '9 ش ترعه السواحل / الوراق'}</div>
            <div className="text-sm text-slate-600">الجيزه - مصر</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-xs text-slate-500 mb-2 font-semibold uppercase">إلى</div>
            <div className="font-bold text-slate-900">{inv.buyer_name}</div>
            <div className="text-sm text-slate-600 mt-1 font-mono">{inv.buyer_phone}</div>
            {inv.buyer_address && <div className="text-sm text-slate-600">{inv.buyer_address}</div>}
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="p-3 text-right rounded-tr-lg">وصف الجهاز</th>
              <th className="p-3 text-center">السريال / IMEI</th>
              <th className="p-3 text-left rounded-tl-lg">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {(inv.items || []).map((item: any) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="p-3 font-medium">{item.description}</td>
                <td className="p-3 text-center font-mono text-xs text-slate-600">{item.serial_or_imei || '-'}</td>
                <td className="p-3 font-bold text-slate-900" dir="ltr">{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">إجمالي المبلغ</span>
              <span className="font-medium" dir="ltr">{fmt(inv.total_amount)}</span>
            </div>
            {inv.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">الخصم</span>
                <span className="font-medium text-green-600" dir="ltr">- {fmt(inv.discount)}</span>
              </div>
            )}
            {inv.st_paid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">المدفوع</span>
                <span className="font-medium text-green-600" dir="ltr">{fmt(inv.st_paid)}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-slate-800 pt-2">
              <span className="font-bold text-slate-900">القيمة الواجب تسديدها</span>
              <span className="font-bold text-red-600 text-lg" dir="ltr">{fmt(inv.amount_due)}</span>
            </div>
          </div>
        </div>

        {/* Policy */}
        {(inv.policy_text || s.default_policy_text) && (
          <div className="border border-slate-200 rounded-lg p-4 mb-6 bg-slate-50">
            <div className="font-bold text-slate-800 mb-3 text-sm">سياسة الاستبدال والضمان</div>
            <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
              {inv.policy_text || s.default_policy_text}
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="flex justify-between items-end mt-8 pt-6 border-t border-slate-200">
          <div className="text-center">
            <div className="w-48 border-b border-slate-400 mb-2"></div>
            <div className="text-xs text-slate-500">توقيع العميل</div>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-slate-400 mb-2"></div>
            <div className="text-xs text-slate-500">توقيع المسؤول</div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 mt-6 border-t border-slate-100 pt-4">
          برجاء الاحتفاظ بالفاتورة - لا يمكن إصدار نسخ إضافية
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .print-invoice { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  )
}
