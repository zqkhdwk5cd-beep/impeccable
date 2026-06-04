import { getDatabase } from '../database'

export interface Salesperson {
  id: number
  name: string
  active: number
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
