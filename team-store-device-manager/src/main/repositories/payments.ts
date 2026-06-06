import { getDatabase } from '../database'
import { logAudit } from './audit'

export function addPayment(data: {
  transaction_type: 'purchase' | 'sale'
  transaction_id: number
  contact_id: number
  amount: number
  payment_method: string
  payment_date: string
  notes?: string
  user_id?: number
}): any {
  const db = getDatabase()
  return db.transaction(() => {
    // 1. Insert payment record
    const result = db.prepare(`
      INSERT INTO payments (transaction_type, transaction_id, contact_id, amount, payment_method, payment_date, notes)
      VALUES (@transaction_type, @transaction_id, @contact_id, @amount, @payment_method, @payment_date, @notes)
    `).run({
      transaction_type: data.transaction_type,
      transaction_id: data.transaction_id,
      contact_id: data.contact_id,
      amount: data.amount,
      payment_method: data.payment_method,
      payment_date: data.payment_date,
      notes: data.notes || null,
    })
    const paymentId = result.lastInsertRowid as number

    // 2. Update paid_amount and remaining_amount on the transaction
    const table = data.transaction_type === 'purchase' ? 'purchase_transactions' : 'sale_transactions'
    const tx = db.prepare(`SELECT paid_amount, remaining_amount, purchase_price, sale_price, discount FROM ${table} WHERE id = ?`).get(data.transaction_id) as any

    const newPaid = (tx.paid_amount || 0) + data.amount
    const totalAmount = data.transaction_type === 'purchase'
      ? (tx.purchase_price ?? 0)
      : ((tx.sale_price ?? 0) - (tx.discount ?? 0))
    const newRemaining = Math.max(0, totalAmount - newPaid)

    db.prepare(`UPDATE ${table} SET paid_amount = ?, remaining_amount = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(newPaid, newRemaining, data.transaction_id)

    // 3. Also update invoice amount_due if this is a sale
    if (data.transaction_type === 'sale') {
      db.prepare(`UPDATE invoices SET amount_due = ? WHERE sale_transaction_id = ?`)
        .run(newRemaining, data.transaction_id)
    }

    logAudit({
      user_id: data.user_id,
      action: 'add_payment',
      entity_type: data.transaction_type === 'purchase' ? 'purchase_transaction' : 'sale_transaction',
      entity_id: data.transaction_id,
      new_value: JSON.stringify({ amount: data.amount, method: data.payment_method }),
    })

    return { id: paymentId, ...data }
  })()
}

export function getPaymentsForTransaction(type: 'purchase' | 'sale', transactionId: number): any[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT p.*, c.name as contact_name
    FROM payments p
    JOIN contacts c ON p.contact_id = c.id
    WHERE p.transaction_type = ? AND p.transaction_id = ? AND p.deleted_at IS NULL
    ORDER BY p.payment_date DESC, p.created_at DESC
  `).all(type, transactionId)
}

export function getPendingTransactions(): { purchases: any[]; sales: any[] } {
  const db = getDatabase()

  const purchases = db.prepare(`
    SELECT pt.id, pt.purchase_date as date, pt.purchase_price as total_amount,
           pt.paid_amount, pt.remaining_amount, pt.payment_method,
           pt.seller_contact_id as contact_id,
           c.name as contact_name, c.phone as contact_phone,
           d.model, d.storage, d.color, d.brand,
           'purchase' as type
    FROM purchase_transactions pt
    JOIN contacts c ON pt.seller_contact_id = c.id
    JOIN devices d ON pt.device_id = d.id
    WHERE pt.deleted_at IS NULL AND pt.remaining_amount > 0
    ORDER BY pt.purchase_date DESC
  `).all()

  const sales = db.prepare(`
    SELECT st.id, st.sale_date as date, (st.sale_price - st.discount) as total_amount,
           st.paid_amount, st.remaining_amount, st.payment_method,
           st.buyer_contact_id as contact_id,
           c.name as contact_name, c.phone as contact_phone,
           d.model, d.storage, d.color, d.brand,
           i.invoice_number,
           'sale' as type
    FROM sale_transactions st
    JOIN contacts c ON st.buyer_contact_id = c.id
    JOIN devices d ON st.device_id = d.id
    LEFT JOIN invoices i ON st.invoice_id = i.id
    WHERE st.deleted_at IS NULL AND st.remaining_amount > 0
    ORDER BY st.sale_date DESC
  `).all()

  return { purchases, sales }
}
