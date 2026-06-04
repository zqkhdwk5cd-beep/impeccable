import { getDatabase } from '../database'
import bcrypt from 'bcryptjs'

export interface Salesperson {
  id: number
  name: string
  active: number
  pin_hash: string | null
  created_at: string
}

export function getAllSalespeople(): Salesperson[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM salespeople ORDER BY name')
    .all() as Salesperson[]
}

export function getActiveSalespeople(): Salesperson[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM salespeople WHERE active = 1 ORDER BY name')
    .all() as Salesperson[]
}

export function createSalesperson(name: string): Salesperson {
  const db = getDatabase()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('الاسم لا يمكن أن يكون فارغاً')
  const result = db
    .prepare('INSERT INTO salespeople (name) VALUES (?) RETURNING *')
    .get(trimmed) as Salesperson | undefined
  if (!result) throw new Error(`"${trimmed}" موجود بالفعل`)
  return result
}

export function toggleSalesperson(id: number): Salesperson {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM salespeople WHERE id = ?').get(id) as Salesperson | undefined
  if (!row) throw new Error('السيلز غير موجود')
  db.prepare('UPDATE salespeople SET active = ? WHERE id = ?').run(row.active ? 0 : 1, id)
  return db.prepare('SELECT * FROM salespeople WHERE id = ?').get(id) as Salesperson
}

export function setPin(id: number, pin: string): void {
  if (!/^\d{4}$/.test(pin)) throw new Error('الباسورد يجب أن يكون 4 أرقام بالضبط')
  const db = getDatabase()
  const hash = bcrypt.hashSync(pin, 10)
  const changes = db.prepare('UPDATE salespeople SET pin_hash = ? WHERE id = ?').run(hash, id).changes
  if (!changes) throw new Error('السيلز غير موجود')
}

export function removePin(id: number): void {
  const db = getDatabase()
  db.prepare('UPDATE salespeople SET pin_hash = NULL WHERE id = ?').run(id)
}

export function verifyPin(id: number, pin: string): boolean {
  const db = getDatabase()
  const row = db.prepare('SELECT pin_hash FROM salespeople WHERE id = ?').get(id) as { pin_hash: string | null } | undefined
  if (!row) return false
  if (!row.pin_hash) return true
  return bcrypt.compareSync(pin, row.pin_hash)
}

export function deleteSalesperson(id: number): boolean {
  const db = getDatabase()
  const changes = db.prepare('DELETE FROM salespeople WHERE id = ?').run(id).changes
  return changes > 0
}

export function getSalespersonReport(from: string, to: string): any[] {
  const db = getDatabase()
  const salespeople = getAllSalespeople()
  return salespeople.map((sp) => {
    const sales = db
      .prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(sale_price),0) as total, COALESCE(SUM(profit),0) as profit
         FROM sale_transactions
         WHERE salesperson_id = ? AND deleted_at IS NULL AND sale_date BETWEEN ? AND ?`
      )
      .get(sp.id, from, to) as any

    const purchases = db
      .prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(total_cost),0) as total
         FROM purchase_transactions
         WHERE salesperson_id = ? AND deleted_at IS NULL AND purchase_date BETWEEN ? AND ?`
      )
      .get(sp.id, from, to) as any

    return {
      salesperson_id: sp.id,
      salesperson_name: sp.name,
      sales_count: sales.count,
      sales_total: sales.total,
      sales_profit: sales.profit,
      purchases_count: purchases.count,
      purchases_total: purchases.total,
    }
  })
}
