import { getDatabase } from '../database'
import bcrypt from 'bcryptjs'
import type { User } from '../../types'

export function getAllUsers(): User[] {
  const db = getDatabase()
  return db
    .prepare('SELECT id, name, username, role, created_at, updated_at FROM users WHERE deleted_at IS NULL')
    .all() as User[]
}

export function getUserById(id: number): User | null {
  const db = getDatabase()
  return (
    (db
      .prepare('SELECT id, name, username, role, created_at, updated_at FROM users WHERE id = ?')
      .get(id) as User) || null
  )
}

export function getUserByUsername(username: string): User | null {
  const db = getDatabase()
  return (
    (db.prepare('SELECT * FROM users WHERE username = ? AND deleted_at IS NULL').get(username) as User) ||
    null
  )
}

export function createUser(data: {
  name: string
  username: string
  password: string
  role: 'admin' | 'employee'
}): User {
  const db = getDatabase()
  const hash = bcrypt.hashSync(data.password, 10)
  const result = db
    .prepare(
      `INSERT INTO users (name, username, password_hash, role)
       VALUES (@name, @username, @password_hash, @role)`
    )
    .run({
      name: data.name,
      username: data.username,
      password_hash: hash,
      role: data.role,
    })
  return getUserById(result.lastInsertRowid as number)!
}

export function verifyUser(
  username: string,
  password: string
): { success: boolean; user?: Omit<User, 'password_hash'> } {
  const user = getUserByUsername(username)
  if (!user) return { success: false }

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) return { success: false }

  const { password_hash, ...safeUser } = user
  return { success: true, user: safeUser as any }
}

export function changePassword(id: number, newPassword: string): boolean {
  const db = getDatabase()
  const hash = bcrypt.hashSync(newPassword, 10)
  const result = db
    .prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(hash, id)
  return result.changes > 0
}

export function hasAnyUser(): boolean {
  const db = getDatabase()
  const count = db.prepare('SELECT COUNT(*) as c FROM users WHERE deleted_at IS NULL').get() as {
    c: number
  }
  return count.c > 0
}

export function softDeleteUser(id: number): boolean {
  const db = getDatabase()
  const result = db
    .prepare(`UPDATE users SET deleted_at = datetime('now') WHERE id = ?`)
    .run(id)
  return result.changes > 0
}

export function updateUser(
  id: number,
  data: { name?: string; role?: string }
): User | null {
  const db = getDatabase()
  const fields = Object.keys(data)
    .filter((k) => ['name', 'role'].includes(k))
    .map((k) => `${k} = @${k}`)
    .join(', ')

  if (!fields) return getUserById(id)

  db.prepare(
    `UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = @id`
  ).run({ ...data, id })
  return getUserById(id)
}
