import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { getDatabasePath, getDatabase } from './database'
import { getSettingValue, updateSetting } from './repositories/settings'
import { logAudit } from './repositories/audit'

export function getDefaultBackupDir(): string {
  return path.join(app.getPath('userData'), 'Team Store Device Manager', 'backups')
}

export function getBackupDir(): string {
  const configuredPath = getSettingValue('backup_location')
  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath
  }
  return getDefaultBackupDir()
}

export function ensureBackupDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function createBackup(userId?: number): { success: boolean; path?: string; error?: string } {
  try {
    const backupDir = getBackupDir()
    ensureBackupDir(backupDir)

    const dbPath = getDatabasePath()
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'ملف قاعدة البيانات غير موجود' }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupPath = path.join(backupDir, `team_store_backup_${timestamp}.db`)

    // Use SQLite backup API for consistency
    const db = getDatabase()
    db.backup(backupPath)

    // Update last backup date in settings
    updateSetting('last_backup_date', new Date().toISOString())

    logAudit({
      user_id: userId,
      action: 'create_backup',
      entity_type: 'backup',
      entity_id: 0,
      new_value: JSON.stringify({ path: backupPath }),
    })

    // Cleanup old backups
    cleanupOldBackups(backupDir)

    return { success: true, path: backupPath }
  } catch (error: any) {
    console.error('Backup failed:', error)
    return { success: false, error: error.message }
  }
}

export function cleanupOldBackups(backupDir: string): void {
  try {
    const keepCount = parseInt(getSettingValue('backups_to_keep') || '30')
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('team_store_backup_') && f.endsWith('.db'))
      .sort()
      .reverse()

    for (let i = keepCount; i < files.length; i++) {
      fs.unlinkSync(path.join(backupDir, files[i]))
    }
  } catch (e) {
    console.error('Cleanup failed:', e)
  }
}

export function listBackups(): { name: string; path: string; size: number; date: Date }[] {
  try {
    const backupDir = getBackupDir()
    if (!fs.existsSync(backupDir)) return []

    return fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('team_store_backup_') && f.endsWith('.db'))
      .map((f) => {
        const filePath = path.join(backupDir, f)
        const stat = fs.statSync(filePath)
        return { name: f, path: filePath, size: stat.size, date: stat.mtime }
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  } catch (e) {
    return []
  }
}

export function restoreBackup(
  backupPath: string,
  userId?: number
): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'ملف النسخة الاحتياطية غير موجود' }
    }

    const dbPath = getDatabasePath()

    // Create emergency backup first
    const emergencyDir = path.join(getBackupDir(), 'emergency')
    ensureBackupDir(emergencyDir)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const emergencyPath = path.join(emergencyDir, `emergency_before_restore_${timestamp}.db`)

    const db = getDatabase()
    db.backup(emergencyPath)

    // Copy backup over current db
    fs.copyFileSync(backupPath, dbPath)

    logAudit({
      user_id: userId,
      action: 'restore_backup',
      entity_type: 'backup',
      entity_id: 0,
      new_value: JSON.stringify({ restored_from: backupPath, emergency_backup: emergencyPath }),
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export function startDailyBackup(): void {
  // Run immediately on start, then every 24h
  const runIfEnabled = () => {
    const enabled = getSettingValue('daily_backup_enabled')
    if (enabled === 'true') {
      const lastBackup = getSettingValue('last_backup_date')
      if (lastBackup) {
        const last = new Date(lastBackup)
        const now = new Date()
        const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60)
        if (diffHours < 23) return
      }
      createBackup()
    }
  }

  runIfEnabled()
  setInterval(runIfEnabled, 1000 * 60 * 60) // check every hour
}
