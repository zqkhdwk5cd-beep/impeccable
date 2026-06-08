import { getDatabase } from '../database'
import type { PurchaseTransaction } from '../../types'
import { createContact, findContactByPhone, updateContactType } from './contacts'
import { createDevice, updateDevice } from './devices'
import { logAudit } from './audit'

export function getAllPurchases(limit = 100): any[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT pt.*,
        c.name as seller_name, c.phone as seller_phone,
        d.model as device_model, d.storage, d.color, d.serial_number, d.imei1, d.status as device_status
       FROM purchase_transactions pt
       JOIN contacts c ON pt.seller_contact_id = c.id
       JOIN devices d ON pt.device_id = d.id
       WHERE pt.deleted_at IS NULL
       ORDER BY pt.purchase_date DESC LIMIT ?`
    )
    .all(limit)
}

export function getPurchaseById(id: number): any {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT pt.*,
        c.name as seller_name, c.phone as seller_phone, c.address as seller_address,
        d.model as device_model, d.storage, d.color, d.serial_number, d.imei1, d.imei2,
        d.battery_health, d.condition, d.box_status, d.status as device_status
       FROM purchase_transactions pt
       JOIN contacts c ON pt.seller_contact_id = c.id
       JOIN devices d ON pt.device_id = d.id
       WHERE pt.id = ?`
    )
    .get(id)
}

export interface CreatePurchaseInput {
  // Seller
  seller_phone: string
  seller_name: string
  seller_secondary_phone?: string
  seller_national_id?: string
  seller_address?: string
  seller_notes?: string
  // Device
  brand?: string
  model: string
  storage: string
  color: string
  condition?: string
  serial_number?: string
  imei1?: string
  imei2?: string
  battery_health?: number
  box_status?: string
  accessories?: string
  technical_notes?: string
  expected_sale_price?: number
  // Purchase
  purchase_date: string
  purchase_price: number
  extra_costs?: number
  payment_method?: string
  paid_amount?: number
  notes?: string
  created_by?: number
  salesperson_id?: number
}

export function createPurchase(input: CreatePurchaseInput): any {
  const db = getDatabase()

  return db.transaction(() => {
    // 1. Create or find seller
    let seller = findContactByPhone(input.seller_phone)
    if (!seller) {
      seller = createContact({
        name: input.seller_name,
        phone: input.seller_phone,
        secondary_phone: input.seller_secondary_phone,
        national_id: input.seller_national_id,
        address: input.seller_address,
        contact_type: 'seller',
        notes: input.seller_notes,
      })
    } else {
      updateContactType(seller.id, 'seller')
    }

    const extraCosts = input.extra_costs || 0
    const totalCost = input.purchase_price + extraCosts

    // 2. Create device
    const device = createDevice({
      brand: input.brand || 'Apple',
      model: input.model,
      storage: input.storage,
      color: input.color,
      condition: (input.condition as any) || 'used',
      serial_number: input.serial_number,
      imei1: input.imei1,
      imei2: input.imei2,
      battery_health: input.battery_health,
      box_status: (input.box_status as any) || 'without_box',
      accessories: input.accessories,
      technical_notes: input.technical_notes,
      purchase_price: input.purchase_price,
      extra_costs: extraCosts,
      total_cost: totalCost,
      expected_sale_price: input.expected_sale_price,
      status: 'available',
      purchase_transaction_id: undefined,
      sale_transaction_id: undefined,
      final_sale_price: undefined,
    })

    const paidAmount = input.paid_amount ?? input.purchase_price
    const remaining = input.purchase_price - paidAmount

    // 3. Create purchase transaction
    const ptResult = db
      .prepare(
        `INSERT INTO purchase_transactions
          (device_id, seller_contact_id, purchase_date, purchase_price, extra_costs, total_cost,
           payment_method, paid_amount, remaining_amount, notes, created_by, salesperson_id)
         VALUES (@device_id, @seller_contact_id, @purchase_date, @purchase_price, @extra_costs,
           @total_cost, @payment_method, @paid_amount, @remaining_amount, @notes, @created_by, @salesperson_id)`
      )
      .run({
        device_id: device.id,
        seller_contact_id: seller.id,
        purchase_date: input.purchase_date,
        purchase_price: input.purchase_price,
        extra_costs: extraCosts,
        total_cost: totalCost,
        payment_method: input.payment_method || 'cash',
        paid_amount: paidAmount,
        remaining_amount: remaining,
        notes: input.notes || null,
        created_by: input.created_by || null,
        salesperson_id: input.salesperson_id || null,
      })

    const ptId = ptResult.lastInsertRowid as number

    // 4. Link purchase to device
    updateDevice(device.id, { purchase_transaction_id: ptId })

    // 5. Audit log
    logAudit({
      user_id: input.created_by,
      action: 'create_purchase',
      entity_type: 'purchase_transaction',
      entity_id: ptId,
      new_value: JSON.stringify({ device_id: device.id, seller_id: seller.id }),
    })

    return getPurchaseById(ptId)
  })()
}

export function updatePurchase(
  id: number,
  data: Partial<PurchaseTransaction>,
  userId?: number
): any {
  const db = getDatabase()
  const old = getPurchaseById(id)
  if (!old) return null

  const allowed = ['purchase_date', 'purchase_price', 'extra_costs', 'total_cost',
    'payment_method', 'paid_amount', 'remaining_amount', 'notes']
  const fields = Object.keys(data)
    .filter((k) => allowed.includes(k))
    .map((k) => `${k} = @${k}`)
    .join(', ')

  if (fields) {
    db.prepare(`UPDATE purchase_transactions SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({
      ...data,
      id,
    })
  }

  logAudit({
    user_id: userId,
    action: 'edit_purchase',
    entity_type: 'purchase_transaction',
    entity_id: id,
    old_value: JSON.stringify(old),
    new_value: JSON.stringify(data),
  })

  return getPurchaseById(id)
}

export function softDeletePurchase(id: number, userId?: number): boolean {
  const db = getDatabase()
  const old = getPurchaseById(id)
  const result = db
    .prepare(`UPDATE purchase_transactions SET deleted_at = datetime('now') WHERE id = ?`)
    .run(id)

  if (result.changes > 0) {
    logAudit({
      user_id: userId,
      action: 'delete_purchase',
      entity_type: 'purchase_transaction',
      entity_id: id,
      old_value: JSON.stringify(old),
    })
  }
  return result.changes > 0
}

export function getPurchaseReport(from: string, to: string): any[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT pt.*,
        c.name as seller_name, c.phone as seller_phone,
        d.model, d.storage, d.color, d.serial_number,
        sp.name as salesperson_name
       FROM purchase_transactions pt
       JOIN contacts c ON pt.seller_contact_id = c.id
       JOIN devices d ON pt.device_id = d.id
       LEFT JOIN salespeople sp ON pt.salesperson_id = sp.id
       LEFT JOIN salespeople sp ON pt.salesperson_id = sp.id
       WHERE pt.deleted_at IS NULL AND pt.purchase_date BETWEEN ? AND ?
       ORDER BY pt.purchase_date DESC`
    )
    .all(from, to)
}
