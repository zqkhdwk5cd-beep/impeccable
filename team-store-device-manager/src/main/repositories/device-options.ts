import { getDatabase as getDb } from '../database'

export type OptionType = 'model' | 'storage' | 'color'

export interface DeviceOption {
  id: number
  type: OptionType
  value: string
  sort_order: number
}

export function getOptions(type: OptionType): DeviceOption[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM device_options WHERE type = ? ORDER BY sort_order, value')
    .all(type) as DeviceOption[]
}

export function getAllOptions(): Record<OptionType, string[]> {
  const db = getDb()
  const rows = db
    .prepare('SELECT type, value FROM device_options ORDER BY sort_order, value')
    .all() as { type: OptionType; value: string }[]

  const result: Record<OptionType, string[]> = { model: [], storage: [], color: [] }
  for (const row of rows) {
    result[row.type].push(row.value)
  }
  return result
}

export function addOption(type: OptionType, value: string): DeviceOption {
  const db = getDb()
  const trimmed = value.trim()
  if (!trimmed) throw new Error('القيمة لا يمكن أن تكون فارغة')

  const maxOrder = (
    db
      .prepare('SELECT MAX(sort_order) as m FROM device_options WHERE type = ?')
      .get(type) as { m: number | null }
  ).m ?? 0

  const result = db
    .prepare(
      'INSERT OR IGNORE INTO device_options (type, value, sort_order) VALUES (?, ?, ?) RETURNING *'
    )
    .get(type, trimmed, maxOrder + 1) as DeviceOption | undefined

  if (!result) throw new Error(`"${trimmed}" موجود بالفعل`)
  return result
}

export function deleteOption(id: number): boolean {
  const db = getDb()
  const changes = db.prepare('DELETE FROM device_options WHERE id = ?').run(id).changes
  return changes > 0
}

export function reorderOption(id: number, direction: 'up' | 'down'): void {
  const db = getDb()
  const row = db.prepare('SELECT * FROM device_options WHERE id = ?').get(id) as DeviceOption | undefined
  if (!row) throw new Error('الخيار غير موجود')

  const neighbor = db
    .prepare(
      direction === 'up'
        ? 'SELECT * FROM device_options WHERE type = ? AND sort_order < ? ORDER BY sort_order DESC LIMIT 1'
        : 'SELECT * FROM device_options WHERE type = ? AND sort_order > ? ORDER BY sort_order ASC LIMIT 1'
    )
    .get(row.type, row.sort_order) as DeviceOption | undefined

  if (!neighbor) return

  db.transaction(() => {
    db.prepare('UPDATE device_options SET sort_order = ? WHERE id = ?').run(neighbor.sort_order, row.id)
    db.prepare('UPDATE device_options SET sort_order = ? WHERE id = ?').run(row.sort_order, neighbor.id)
  })()
}
