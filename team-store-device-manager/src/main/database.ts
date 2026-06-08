import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { runMigrations } from './schema'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function initDatabase(): Database.Database {
  const userDataPath = app.getPath('userData')
  const dbDir = path.join(userDataPath, 'Team Store Device Manager')

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = path.join(dbDir, 'team_store.db')
  console.log('Database path:', dbPath)

  db = new Database(dbPath)
  runMigrations(db)

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'Team Store Device Manager', 'team_store.db')
}
