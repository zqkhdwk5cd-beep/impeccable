import { getDatabase } from '../database'
import type { Expense } from '../../types'
import { updateDevice, getDeviceById } from './devices'

export function getExpensesByDevice(deviceId: number): Expense[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM expenses WHERE device_id = ? AND deleted_at IS NULL ORDER BY expense_date DESC')
    .all(deviceId) as Expense[]
}

export function addExpense(data: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Expense {
  const db = getDatabase()

  return db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO expenses (device_id, expense_type, amount, expense_date, notes)
         VALUES (@device_id, @expense_type, @amount, @expense_date, @notes)`
      )
      .run({
        device_id: data.device_id,
        expense_type: data.expense_type,
        amount: data.amount,
        expense_date: data.expense_date,
        notes: data.notes || null,
      })

    // Update device total_cost
    const device = getDeviceById(data.device_id)
    if (device) {
      const allExpenses = db
        .prepare('SELECT SUM(amount) as total FROM expenses WHERE device_id = ? AND deleted_at IS NULL')
        .get(data.device_id) as { total: number }
      const newTotalCost = device.purchase_price + (allExpenses.total || 0)
      updateDevice(data.device_id, { extra_costs: allExpenses.total || 0, total_cost: newTotalCost })
    }

    return db
      .prepare('SELECT * FROM expenses WHERE id = ?')
      .get(result.lastInsertRowid as number) as Expense
  })()
}

export function softDeleteExpense(id: number): boolean {
  const db = getDatabase()
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Expense | undefined
  if (!expense) return false

  const result = db
    .prepare(`UPDATE expenses SET deleted_at = datetime('now') WHERE id = ?`)
    .run(id)

  if (result.changes > 0) {
    const device = getDeviceById(expense.device_id)
    if (device) {
      const allExpenses = db
        .prepare('SELECT SUM(amount) as total FROM expenses WHERE device_id = ? AND deleted_at IS NULL')
        .get(expense.device_id) as { total: number }
      const newTotalCost = device.purchase_price + (allExpenses.total || 0)
      updateDevice(expense.device_id, { extra_costs: allExpenses.total || 0, total_cost: newTotalCost })
    }
  }

  return result.changes > 0
}
