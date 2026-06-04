import { getDatabase } from '../database'
import type { Setting } from '../../types'
import { logAudit } from './audit'

export function getAllSettings(): Record<string, string> {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as Setting[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function getSettingValue(key: string): string {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value || ''
}

export function updateSetting(key: string, value: string, userId?: number): void {
  const db = getDatabase()
  const old = getSettingValue(key)
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, value)

  logAudit({
    user_id: userId,
    action: 'change_settings',
    entity_type: 'settings',
    entity_id: 0,
    old_value: JSON.stringify({ key, value: old }),
    new_value: JSON.stringify({ key, value }),
  })
}

export function updateSettings(data: Record<string, string>, userId?: number): void {
  for (const [key, value] of Object.entries(data)) {
    updateSetting(key, value, userId)
  }
}
