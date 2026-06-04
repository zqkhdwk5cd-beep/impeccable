import { getDatabase } from '../database'
import type { Invoice, Device } from '../../types'
import { getSettingValue, updateSetting } from './settings'
import { logAudit } from './audit'

function getNextInvoiceNumber(): string {
  const db = getDatabase()
  const startNum = parseInt(getSettingValue('invoice_start_number') || '1')
  const last = db
    .prepare(`SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1`)
    .get() as { invoice_number: string } | undefined

  if (!last) {
    return String(startNum).padStart(3, '0')
  }

  const lastNum = parseInt(last.invoice_number)
  const next = isNaN(lastNum) ? startNum : lastNum + 1
  return String(next).padStart(3, '0')
}

export interface CreateInvoiceInput {
  sale_transaction_id: number
  buyer_contact_id: number
  device: Device
  sale_price: number
  paid_amount: number
  remaining_amount: number
  policy_text?: string
  notes?: string
  userId?: number
}

export function createInvoice(input: CreateInvoiceInput): any {
  const db = getDatabase()
  const invoiceNumber = getNextInvoiceNumber()
  const policyText = input.policy_text || getSettingValue('default_policy_text') || ''

  const result = db
    .prepare(
      `INSERT INTO invoices
        (invoice_number, sale_transaction_id, buyer_contact_id, issue_date,
         amount_due, total_amount, policy_text, notes)
       VALUES (@invoice_number, @sale_transaction_id, @buyer_contact_id, @issue_date,
         @amount_due, @total_amount, @policy_text, @notes)`
    )
    .run({
      invoice_number: invoiceNumber,
      sale_transaction_id: input.sale_transaction_id,
      buyer_contact_id: input.buyer_contact_id,
      issue_date: new Date().toISOString().slice(0, 10),
      amount_due: input.remaining_amount,
      total_amount: input.sale_price,
      policy_text: policyText,
      notes: input.notes || null,
    })

  const invoiceId = result.lastInsertRowid as number

  // Create invoice item
  const d = input.device
  const desc = `${d.brand} ${d.model} - ${d.storage} - ${d.color}${d.condition === 'used' ? ' (مستعمل)' : ''}`
  const serialOrImei = d.serial_number || d.imei1 || ''

  db.prepare(
    `INSERT INTO invoice_items (invoice_id, device_id, description, serial_or_imei, amount)
     VALUES (?, ?, ?, ?, ?)`
  ).run(invoiceId, d.id, desc, serialOrImei, input.sale_price)

  logAudit({
    user_id: input.userId,
    action: 'create_invoice',
    entity_type: 'invoice',
    entity_id: invoiceId,
    new_value: JSON.stringify({ invoice_number: invoiceNumber }),
  })

  return getInvoiceById(invoiceId)
}

export function getAllInvoices(limit = 100): any[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT i.*,
        c.name as buyer_name, c.phone as buyer_phone,
        d.model, d.storage, d.color, d.serial_number, d.imei1
       FROM invoices i
       JOIN contacts c ON i.buyer_contact_id = c.id
       JOIN sale_transactions st ON i.sale_transaction_id = st.id
       JOIN devices d ON st.device_id = d.id
       WHERE i.deleted_at IS NULL
       ORDER BY i.id DESC LIMIT ?`
    )
    .all(limit)
}

export function getInvoiceById(id: number): any {
  const db = getDatabase()
  const invoice = db
    .prepare(
      `SELECT i.*,
        c.name as buyer_name, c.phone as buyer_phone, c.address as buyer_address,
        st.sale_price, st.paid_amount as st_paid, st.remaining_amount as st_remaining,
        st.payment_method, st.sale_date, st.discount,
        d.model, d.storage, d.color, d.serial_number, d.imei1, d.imei2,
        d.battery_health, d.condition, d.brand
       FROM invoices i
       JOIN contacts c ON i.buyer_contact_id = c.id
       JOIN sale_transactions st ON i.sale_transaction_id = st.id
       JOIN devices d ON st.device_id = d.id
       WHERE i.id = ?`
    )
    .get(id)

  const items = db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? AND deleted_at IS NULL')
    .all(id)

  return { ...(invoice as any), items }
}

export function getInvoiceByNumber(num: string): any {
  const db = getDatabase()
  const inv = db
    .prepare('SELECT id FROM invoices WHERE invoice_number = ? AND deleted_at IS NULL')
    .get(num) as { id: number } | undefined
  if (!inv) return null
  return getInvoiceById(inv.id)
}

export function softDeleteInvoice(id: number, userId?: number): boolean {
  const db = getDatabase()
  const result = db
    .prepare(`UPDATE invoices SET deleted_at = datetime('now') WHERE id = ?`)
    .run(id)
  if (result.changes > 0) {
    logAudit({
      user_id: userId,
      action: 'delete_invoice',
      entity_type: 'invoice',
      entity_id: id,
    })
  }
  return result.changes > 0
}
