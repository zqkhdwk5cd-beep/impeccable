import { getDatabase } from '../database'
import type { SaleTransaction } from '../../types'
import { createContact, findContactByPhone, updateContactType } from './contacts'
import { getDeviceById, updateDevice } from './devices'
import { createInvoice } from './invoices'
import { logAudit } from './audit'
import { getSettingValue } from './settings'

export function getAllSales(limit = 100): any[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT st.*,
        c.name as buyer_name, c.phone as buyer_phone,
        d.model, d.storage, d.color, d.serial_number, d.imei1,
        i.invoice_number
       FROM sale_transactions st
       JOIN contacts c ON st.buyer_contact_id = c.id
       JOIN devices d ON st.device_id = d.id
       LEFT JOIN invoices i ON st.invoice_id = i.id
       WHERE st.deleted_at IS NULL
       ORDER BY st.sale_date DESC LIMIT ?`
    )
    .all(limit)
}

export function getSaleById(id: number): any {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT st.*,
        c.name as buyer_name, c.phone as buyer_phone, c.address as buyer_address,
        d.model, d.storage, d.color, d.serial_number, d.imei1, d.imei2, d.total_cost,
        i.invoice_number, i.id as invoice_id
       FROM sale_transactions st
       JOIN contacts c ON st.buyer_contact_id = c.id
       JOIN devices d ON st.device_id = d.id
       LEFT JOIN invoices i ON st.invoice_id = i.id
       WHERE st.id = ?`
    )
    .get(id)
}

export interface CreateSaleInput {
  device_id: number
  buyer_phone: string
  buyer_name: string
  buyer_secondary_phone?: string
  buyer_national_id?: string
  buyer_address?: string
  buyer_notes?: string
  sale_date: string
  sale_price: number
  discount?: number
  paid_amount?: number
  payment_method?: string
  notes?: string
  created_by?: number
  generate_invoice?: boolean
}

export function createSale(input: CreateSaleInput): any {
  const db = getDatabase()

  return db.transaction(() => {
    const device = getDeviceById(input.device_id)
    if (!device) throw new Error('الجهاز غير موجود')
    if (!['available', 'reserved'].includes(device.status)) {
      throw new Error('لا يمكن بيع هذا الجهاز - الحالة: ' + device.status)
    }

    // Create or find buyer
    let buyer = findContactByPhone(input.buyer_phone)
    if (!buyer) {
      buyer = createContact({
        name: input.buyer_name,
        phone: input.buyer_phone,
        secondary_phone: input.buyer_secondary_phone,
        national_id: input.buyer_national_id,
        address: input.buyer_address,
        contact_type: 'buyer',
        notes: input.buyer_notes,
      })
    } else {
      updateContactType(buyer.id, 'buyer')
    }

    const discount = input.discount || 0
    const finalPrice = input.sale_price - discount
    const paidAmount = input.paid_amount ?? finalPrice
    const remaining = finalPrice - paidAmount
    const profit = finalPrice - device.total_cost

    // Create sale transaction
    const stResult = db
      .prepare(
        `INSERT INTO sale_transactions
          (device_id, buyer_contact_id, sale_date, sale_price, discount,
           paid_amount, remaining_amount, payment_method, profit, notes, created_by)
         VALUES (@device_id, @buyer_contact_id, @sale_date, @sale_price, @discount,
           @paid_amount, @remaining_amount, @payment_method, @profit, @notes, @created_by)`
      )
      .run({
        device_id: device.id,
        buyer_contact_id: buyer.id,
        sale_date: input.sale_date,
        sale_price: finalPrice,
        discount: discount,
        paid_amount: paidAmount,
        remaining_amount: remaining,
        payment_method: input.payment_method || 'cash',
        profit,
        notes: input.notes || null,
        created_by: input.created_by || null,
      })

    const saleId = stResult.lastInsertRowid as number

    // Generate invoice
    let invoiceId: number | undefined
    if (input.generate_invoice !== false) {
      const invoice = createInvoice({
        sale_transaction_id: saleId,
        buyer_contact_id: buyer.id,
        device,
        sale_price: finalPrice,
        paid_amount: paidAmount,
        remaining_amount: remaining,
      })
      invoiceId = invoice.id

      // Link invoice to sale
      db.prepare(`UPDATE sale_transactions SET invoice_id = ? WHERE id = ?`).run(invoiceId, saleId)
    }

    // Update device status
    updateDevice(device.id, {
      status: 'sold',
      final_sale_price: finalPrice,
      sale_transaction_id: saleId,
    })

    logAudit({
      user_id: input.created_by,
      action: 'create_sale',
      entity_type: 'sale_transaction',
      entity_id: saleId,
      new_value: JSON.stringify({ device_id: device.id, buyer_id: buyer.id, invoice_id: invoiceId }),
    })

    return getSaleById(saleId)
  })()
}

export function updateSale(id: number, data: Partial<SaleTransaction>, userId?: number): any {
  const db = getDatabase()
  const old = getSaleById(id)
  if (!old) return null

  const allowed = ['sale_date', 'sale_price', 'discount', 'paid_amount',
    'remaining_amount', 'payment_method', 'notes']
  const fields = Object.keys(data)
    .filter((k) => allowed.includes(k))
    .map((k) => `${k} = @${k}`)
    .join(', ')

  if (fields) {
    db.prepare(`UPDATE sale_transactions SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({
      ...data,
      id,
    })
  }

  logAudit({
    user_id: userId,
    action: 'edit_sale',
    entity_type: 'sale_transaction',
    entity_id: id,
    old_value: JSON.stringify(old),
    new_value: JSON.stringify(data),
  })

  return getSaleById(id)
}

export function softDeleteSale(id: number, userId?: number): boolean {
  const db = getDatabase()
  const old = getSaleById(id)
  const result = db
    .prepare(`UPDATE sale_transactions SET deleted_at = datetime('now') WHERE id = ?`)
    .run(id)

  if (result.changes > 0) {
    logAudit({
      user_id: userId,
      action: 'delete_sale',
      entity_type: 'sale_transaction',
      entity_id: id,
      old_value: JSON.stringify(old),
    })
  }
  return result.changes > 0
}

export function getSalesReport(from: string, to: string): any[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT st.*,
        c.name as buyer_name, c.phone as buyer_phone,
        d.model, d.storage, d.color, d.serial_number,
        i.invoice_number
       FROM sale_transactions st
       JOIN contacts c ON st.buyer_contact_id = c.id
       JOIN devices d ON st.device_id = d.id
       LEFT JOIN invoices i ON st.invoice_id = i.id
       WHERE st.deleted_at IS NULL AND st.sale_date BETWEEN ? AND ?
       ORDER BY st.sale_date DESC`
    )
    .all(from, to)
}

export function getDashboardStats() {
  const db = getDatabase()

  const deviceStats = db
    .prepare(
      `SELECT
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_devices,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_devices,
        SUM(CASE WHEN status NOT IN ('sold') THEN total_cost ELSE 0 END) as total_inventory_value
       FROM devices WHERE deleted_at IS NULL`
    )
    .get() as any

  const salesStats = db
    .prepare(
      `SELECT
        COALESCE(SUM(sale_price), 0) as total_sales,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(SUM(remaining_amount), 0) as total_remaining_from_customers
       FROM sale_transactions WHERE deleted_at IS NULL`
    )
    .get() as any

  const purchaseStats = db
    .prepare(
      `SELECT COALESCE(SUM(remaining_amount), 0) as total_remaining_to_suppliers
       FROM purchase_transactions WHERE deleted_at IS NULL`
    )
    .get() as any

  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyStats = db
    .prepare(
      `SELECT
        COALESCE(SUM(sale_price), 0) as monthly_sales,
        COALESCE(SUM(profit), 0) as monthly_profit
       FROM sale_transactions
       WHERE deleted_at IS NULL AND sale_date LIKE ?`
    )
    .get(`${currentMonth}%`) as any

  const recentPurchases = db
    .prepare(
      `SELECT pt.*, c.name as seller_name, d.model, d.storage, d.color
       FROM purchase_transactions pt
       JOIN contacts c ON pt.seller_contact_id = c.id
       JOIN devices d ON pt.device_id = d.id
       WHERE pt.deleted_at IS NULL
       ORDER BY pt.created_at DESC LIMIT 5`
    )
    .all()

  const recentSales = db
    .prepare(
      `SELECT st.*, c.name as buyer_name, d.model, d.storage, i.invoice_number
       FROM sale_transactions st
       JOIN contacts c ON st.buyer_contact_id = c.id
       JOIN devices d ON st.device_id = d.id
       LEFT JOIN invoices i ON st.invoice_id = i.id
       WHERE st.deleted_at IS NULL
       ORDER BY st.created_at DESC LIMIT 5`
    )
    .all()

  const recentInvoices = db
    .prepare(
      `SELECT i.*, c.name as buyer_name, d.model
       FROM invoices i
       JOIN contacts c ON i.buyer_contact_id = c.id
       JOIN sale_transactions st ON i.sale_transaction_id = st.id
       JOIN devices d ON st.device_id = d.id
       WHERE i.deleted_at IS NULL
       ORDER BY i.created_at DESC LIMIT 5`
    )
    .all()

  return {
    available_devices: deviceStats?.available_devices || 0,
    sold_devices: deviceStats?.sold_devices || 0,
    total_inventory_value: deviceStats?.total_inventory_value || 0,
    total_sales: salesStats?.total_sales || 0,
    total_profit: salesStats?.total_profit || 0,
    total_remaining_from_customers: salesStats?.total_remaining_from_customers || 0,
    total_remaining_to_suppliers: purchaseStats?.total_remaining_to_suppliers || 0,
    monthly_sales: monthlyStats?.monthly_sales || 0,
    monthly_profit: monthlyStats?.monthly_profit || 0,
    recentPurchases,
    recentSales,
    recentInvoices,
  }
}
