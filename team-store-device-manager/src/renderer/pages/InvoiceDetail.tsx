import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { ArrowRight, Printer, Download } from 'lucide-react'

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.invoices.getById(Number(id)), api.settings.getAll()])
      .then(([inv, s]) => { setInvoice(inv); setSettings(s) })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const inv = invoice
      const s = settings
      const currency = s.currency || 'EGP'

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      doc.setFont('helvetica')

      doc.setFontSize(20)
      doc.text(s.store_name || 'Team Store', 105, 20, { align: 'center' })
      doc.setFontSize(10)
      doc.text(s.store_address || '', 105, 28, { align: 'center' })
      doc.setFontSize(14)
      doc.text(`Invoice #${inv.invoice_number}`, 105, 40, { align: 'center' })
      doc.setFontSize(10)
      doc.text(`Date: ${formatDate(inv.issue_date)}`, 20, 50)
      doc.text(`Customer: ${inv.buyer_name}`, 20, 58)
      doc.text(`Phone: ${inv.buyer_phone}`, 20, 66)

      autoTable(doc, {
        startY: 75,
        head: [['Description', 'Serial/IMEI', 'Amount']],
        body: (inv.items || []).map((item: any) => [
          item.description,
          item.serial_or_imei || '-',
          `${item.amount.toLocaleString()} ${currency}`,
        ]),
        headStyles: { fillColor: [79, 70, 229] },
      })

      const finalY = (doc as any).lastAutoTable?.finalY || 100
      const net = (inv.total_amount || 0) - (inv.discount || 0)
      doc.setFontSize(12)
      doc.text(`Total: ${net.toLocaleString()} ${currency}`, 20, finalY + 10)

      doc.save(`invoice-${inv.invoice_number}.pdf`)
      toast.success('تم تصدير الفاتورة كـ PDF')
    } catch (err: any) {
      toast.error('فشل تصدير PDF: ' + err.message)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">جاري التحميل...</div>
    </div>
  )
  if (!invoice) return <div className="text-center py-20 text-slate-400">الفاتورة غير موجودة</div>

  const inv = invoice
  const s = settings
  const currency = s.currency || 'EGP'
  const fmt = (n: number) => (n || 0).toLocaleString('ar-EG') + ' ' + currency
  const netAmount = (inv.total_amount || 0) - (inv.discount || 0)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Controls — hidden on print */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate('/invoices')}
            className="text-brand-600 hover:text-brand-800 flex items-center gap-1"
          >
            <ArrowRight className="w-3 h-3" /> الفواتير
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">فاتورة #{inv.invoice_number}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="w-4 h-4" /> طباعة
          </button>
          <button onClick={handleExportPDF} className="btn-primary">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* ── Invoice ── */}
      <div
        className="print-invoice bg-white"
        style={{ direction: 'rtl', fontFamily: 'Cairo, Arial, sans-serif' }}
      >
        {/* Top accent strip */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />

        {/* Header */}
        <div style={{ padding: '28px 36px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Store info */}
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
                {s.store_name || 'Team Store'}
              </div>
              {s.store_address && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.store_address}</div>
              )}
              {s.store_phone && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }} dir="ltr">{s.store_phone}</div>
              )}
            </div>
            {/* Invoice meta */}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>فاتورة بيع</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#4f46e5' }}>#{inv.invoice_number}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{formatDate(inv.issue_date)}</div>
            </div>
          </div>
        </div>

        {/* Buyer */}
        <div style={{ padding: '18px 36px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>
            بيان العميل
          </div>
          <div style={{ display: 'flex', gap: 40 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{inv.buyer_name}</div>
              {inv.buyer_phone && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }} dir="ltr">{inv.buyer_phone}</div>
              )}
            </div>
            {inv.buyer_address && (
              <div style={{ fontSize: 13, color: '#64748b' }}>{inv.buyer_address}</div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div style={{ padding: '0 36px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1e293b' }}>
                <th style={{ padding: '10px 0', textAlign: 'right', fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  وصف الجهاز
                </th>
                <th style={{ padding: '10px 0', textAlign: 'center', fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  السريال / IMEI
                </th>
                <th style={{ padding: '10px 0', textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  المبلغ
                </th>
              </tr>
            </thead>
            <tbody>
              {(inv.items || []).map((item: any, i: number) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? 'white' : '#fafafa',
                  }}
                >
                  <td style={{ padding: '12px 0', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {item.description}
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    {item.serial_or_imei || '—'}
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'left', fontSize: 14, fontWeight: 700, color: '#1e293b' }} dir="ltr">
                    {fmt(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ padding: '16px 36px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 240 }}>
            {inv.discount > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                  <span>الإجمالي</span>
                  <span dir="ltr">{fmt(inv.total_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a', marginBottom: 8 }}>
                  <span>خصم</span>
                  <span dir="ltr">— {fmt(inv.discount)}</span>
                </div>
              </>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              borderTop: '2px solid #1e293b', paddingTop: 10, marginTop: 4,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>صافي المبلغ</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }} dir="ltr">{fmt(netAmount)}</span>
            </div>
          </div>
        </div>

        {/* Policy */}
        {(inv.policy_text || s.default_policy_text) && (
          <div style={{ margin: '0 36px 20px', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
              سياسة الاستبدال والضمان
            </div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {inv.policy_text || s.default_policy_text}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ margin: '0 36px', paddingTop: 20, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: 180 }}>
            <div style={{ borderBottom: '1px solid #94a3b8', marginBottom: 8, height: 40 }} />
            <div style={{ fontSize: 11, color: '#94a3b8' }}>توقيع العميل</div>
          </div>
          <div style={{ textAlign: 'center', width: 180 }}>
            <div style={{ borderBottom: '1px solid #94a3b8', marginBottom: 8, height: 40 }} />
            <div style={{ fontSize: 11, color: '#94a3b8' }}>توقيع المسؤول</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 36px 24px', textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontSize: 10, color: '#cbd5e1' }}>
            برجاء الاحتفاظ بالفاتورة — لا يمكن إصدار نسخ إضافية
          </div>
        </div>

        {/* Bottom accent strip */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />
      </div>
    </div>
  )
}
