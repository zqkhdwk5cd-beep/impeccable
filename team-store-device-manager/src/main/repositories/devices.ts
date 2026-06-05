import { getDatabase } from '../database'
import type { Device } from '../../types'

export function getAllDevices(filters?: {
  status?: string
  search?: string
  includeDeleted?: boolean
  limit?: number
  offset?: number
}): { items: Device[]; total: number } {
  const db = getDatabase()
  const conditions: string[] = ['1=1']
  const params: any[] = []

  if (!filters?.includeDeleted) {
    conditions.push('d.deleted_at IS NULL')
  }
  if (filters?.status) {
    conditions.push('d.status = ?')
    params.push(filters.status)
  }
  if (filters?.search) {
    const q = `%${filters.search}%`
    conditions.push(`(
      d.serial_number LIKE ? OR d.imei1 LIKE ? OR d.imei2 LIKE ?
      OR d.model LIKE ? OR d.color LIKE ? OR d.storage LIKE ?
      OR c.name LIKE ?
    )`)
    params.push(q, q, q, q, q, q, q)
  }

  const where = 'WHERE ' + conditions.join(' AND ')
  const joins = `FROM devices d
    LEFT JOIN purchase_transactions pt ON d.purchase_transaction_id = pt.id
    LEFT JOIN contacts c ON pt.seller_contact_id = c.id`

  const total = (db.prepare(`SELECT COUNT(*) as n ${joins} ${where}`).get(...params) as any).n

  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0

  const items = db.prepare(`
    SELECT d.*, c.name as seller_name, c.phone as seller_phone, pt.purchase_date
    ${joins} ${where}
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Device[]

  return { items, total }
}

export function getDeviceById(id: number): Device | null {
  const db = getDatabase()
  return (db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as Device) || null
}

export function findDeviceBySerial(serial: string): Device | null {
  const db = getDatabase()
  return (
    (db
      .prepare('SELECT * FROM devices WHERE serial_number = ? AND deleted_at IS NULL')
      .get(serial) as Device) || null
  )
}

export function findDeviceByImei(imei: string): Device | null {
  const db = getDatabase()
  return (
    (db
      .prepare(
        'SELECT * FROM devices WHERE (imei1 = ? OR imei2 = ?) AND deleted_at IS NULL'
      )
      .get(imei, imei) as Device) || null
  )
}

export function searchDevices(query: string): any[] {
  const db = getDatabase()
  const q = `%${query}%`
  return db
    .prepare(
      `SELECT d.*, c.name as seller_name, c.phone as seller_phone
       FROM devices d
       LEFT JOIN purchase_transactions pt ON d.purchase_transaction_id = pt.id
       LEFT JOIN contacts c ON pt.seller_contact_id = c.id
       WHERE d.deleted_at IS NULL AND (
         d.serial_number LIKE ? OR d.imei1 LIKE ? OR d.imei2 LIKE ?
         OR d.model LIKE ? OR d.color LIKE ? OR d.storage LIKE ?
       )
       ORDER BY d.created_at DESC LIMIT 20`
    )
    .all(q, q, q, q, q, q)
}

export function createDevice(
  data: Omit<Device, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Device {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO devices (brand, model, storage, color, condition, serial_number,
      imei1, imei2, battery_health, box_status, accessories, technical_notes,
      purchase_price, extra_costs, total_cost, expected_sale_price, status)
    VALUES (@brand, @model, @storage, @color, @condition, @serial_number,
      @imei1, @imei2, @battery_health, @box_status, @accessories, @technical_notes,
      @purchase_price, @extra_costs, @total_cost, @expected_sale_price, @status)
  `)
  const result = stmt.run({
    brand: data.brand || 'Apple',
    model: data.model,
    storage: data.storage,
    color: data.color,
    condition: data.condition || 'used',
    serial_number: data.serial_number || null,
    imei1: data.imei1 || null,
    imei2: data.imei2 || null,
    battery_health: data.battery_health || null,
    box_status: data.box_status || 'without_box',
    accessories: data.accessories || null,
    technical_notes: data.technical_notes || null,
    purchase_price: data.purchase_price || 0,
    extra_costs: data.extra_costs || 0,
    total_cost: data.total_cost || data.purchase_price || 0,
    expected_sale_price: data.expected_sale_price || null,
    status: data.status || 'available',
  })
  return getDeviceById(result.lastInsertRowid as number)!
}

export function updateDevice(id: number, data: Partial<Device>): Device | null {
  const db = getDatabase()
  const existing = getDeviceById(id)
  if (!existing) return null

  const allowed = [
    'brand', 'model', 'storage', 'color', 'condition', 'serial_number',
    'imei1', 'imei2', 'battery_health', 'box_status', 'accessories',
    'technical_notes', 'purchase_price', 'extra_costs', 'total_cost',
    'expected_sale_price', 'final_sale_price', 'status',
    'purchase_transaction_id', 'sale_transaction_id',
  ]

  const fields = Object.keys(data)
    .filter((k) => allowed.includes(k))
    .map((k) => `${k} = @${k}`)
    .join(', ')

  if (!fields) return existing

  db.prepare(`UPDATE devices SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({
    ...data,
    id,
  })
  return getDeviceById(id)
}

export function softDeleteDevice(id: number): boolean {
  const db = getDatabase()
  const result = db
    .prepare(`UPDATE devices SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
    .run(id)
  return result.changes > 0
}

export function getDeviceDetail(id: number): any {
  const db = getDatabase()
  const device = db
    .prepare(
      `SELECT d.*,
        pt.id as purchase_id, pt.purchase_date, pt.purchase_price as pt_price, pt.paid_amount as pt_paid,
        pt.remaining_amount as pt_remaining, pt.payment_method as pt_payment_method, pt.notes as pt_notes,
        c_seller.name as seller_name, c_seller.phone as seller_phone,
        st.id as sale_id, st.sale_date, st.sale_price, st.discount, st.paid_amount as st_paid,
        st.remaining_amount as st_remaining, st.profit,
        c_buyer.name as buyer_name, c_buyer.phone as buyer_phone,
        i.invoice_number, i.id as invoice_id
       FROM devices d
       LEFT JOIN purchase_transactions pt ON d.purchase_transaction_id = pt.id
       LEFT JOIN contacts c_seller ON pt.seller_contact_id = c_seller.id
       LEFT JOIN sale_transactions st ON d.sale_transaction_id = st.id
       LEFT JOIN contacts c_buyer ON st.buyer_contact_id = c_buyer.id
       LEFT JOIN invoices i ON st.invoice_id = i.id
       WHERE d.id = ?`
    )
    .get(id)

  const expenses = db
    .prepare('SELECT * FROM expenses WHERE device_id = ? AND deleted_at IS NULL ORDER BY expense_date DESC')
    .all(id)

  const audits = db
    .prepare(
      `SELECT al.*, u.name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = 'device' AND al.entity_id = ?
       ORDER BY al.created_at DESC LIMIT 50`
    )
    .all(id)

  return { device, expenses, audits }
}

export function getInventoryStats() {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold,
        COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved,
        COUNT(CASE WHEN status = 'repair' THEN 1 END) as repair,
        SUM(CASE WHEN status != 'sold' THEN total_cost ELSE 0 END) as inventory_cost,
        SUM(CASE WHEN status != 'sold' THEN COALESCE(expected_sale_price, 0) ELSE 0 END) as expected_value
       FROM devices WHERE deleted_at IS NULL`
    )
    .get()
}
