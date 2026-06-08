import { getDatabase } from '../database'
import type { AuditLog } from '../../types'

export interface AuditInput {
  user_id?: number
  action: string
  entity_type: string
  entity_id: number
  old_value?: string
  new_value?: string
}

export function logAudit(input: AuditInput): void {
  try {
    const db = getDatabase()
    db.prepare(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      input.user_id || null,
      input.action,
      input.entity_type,
      input.entity_id,
      input.old_value || null,
      input.new_value || null
    )
  } catch (e) {
    console.error('Audit log failed:', e)
  }
}

export function getAuditLogs(limit = 200): any[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT al.*, u.name as user_name, u.username
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT ?`
    )
    .all(limit)
}

export function getAuditLogsForEntity(entityType: string, entityId: number): any[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT al.*, u.name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = ? AND al.entity_id = ?
       ORDER BY al.created_at DESC`
    )
    .all(entityType, entityId)
}
