import { getDatabase } from '../database'
import type { Contact } from '../../types'

export function getAllContacts(includeDeleted = false): Contact[] {
  const db = getDatabase()
  const sql = includeDeleted
    ? 'SELECT * FROM contacts ORDER BY name'
    : 'SELECT * FROM contacts WHERE deleted_at IS NULL ORDER BY name'
  return db.prepare(sql).all() as Contact[]
}

export function getContactById(id: number): Contact | null {
  const db = getDatabase()
  return (db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as Contact) || null
}

export function findContactByPhone(phone: string): Contact | null {
  const db = getDatabase()
  const normalized = normalizePhone(phone)
  return (
    (db
      .prepare('SELECT * FROM contacts WHERE phone = ? AND deleted_at IS NULL')
      .get(normalized) as Contact) || null
  )
}

export function searchContacts(query: string): Contact[] {
  const db = getDatabase()
  const q = `%${query}%`
  return db
    .prepare(
      `SELECT * FROM contacts WHERE deleted_at IS NULL AND (
      name LIKE ? OR phone LIKE ? OR secondary_phone LIKE ? OR national_id LIKE ?
    ) ORDER BY name LIMIT 20`
    )
    .all(q, q, q, q) as Contact[]
}

export function createContact(
  data: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Contact {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO contacts (name, phone, secondary_phone, national_id, address, contact_type, notes)
    VALUES (@name, @phone, @secondary_phone, @national_id, @address, @contact_type, @notes)
  `)
  const result = stmt.run({
    ...data,
    phone: normalizePhone(data.phone),
    secondary_phone: data.secondary_phone || null,
    national_id: data.national_id || null,
    address: data.address || null,
    notes: data.notes || null,
  })
  return getContactById(result.lastInsertRowid as number)!
}

export function updateContact(id: number, data: Partial<Contact>): Contact | null {
  const db = getDatabase()
  const existing = getContactById(id)
  if (!existing) return null

  if (data.phone) data.phone = normalizePhone(data.phone)

  const fields = Object.keys(data)
    .filter((k) => !['id', 'created_at', 'updated_at', 'deleted_at'].includes(k))
    .map((k) => `${k} = @${k}`)
    .join(', ')

  db.prepare(`UPDATE contacts SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({
    ...data,
    id,
  })
  return getContactById(id)
}

export function softDeleteContact(id: number): boolean {
  const db = getDatabase()
  const result = db
    .prepare(`UPDATE contacts SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
    .run(id)
  return result.changes > 0
}

export function restoreContact(id: number): boolean {
  const db = getDatabase()
  const result = db
    .prepare(`UPDATE contacts SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?`)
    .run(id)
  return result.changes > 0
}

export function getContactProfile(id: number) {
  const db = getDatabase()
  const contact = getContactById(id)
  if (!contact) return null

  const purchases = db
    .prepare(
      `SELECT pt.*, d.model, d.storage, d.color, d.serial_number, d.status
       FROM purchase_transactions pt
       JOIN devices d ON pt.device_id = d.id
       WHERE pt.seller_contact_id = ? AND pt.deleted_at IS NULL
       ORDER BY pt.purchase_date DESC`
    )
    .all(id)

  const sales = db
    .prepare(
      `SELECT st.*, d.model, d.storage, d.color, d.serial_number, i.invoice_number
       FROM sale_transactions st
       JOIN devices d ON st.device_id = d.id
       LEFT JOIN invoices i ON st.invoice_id = i.id
       WHERE st.buyer_contact_id = ? AND st.deleted_at IS NULL
       ORDER BY st.sale_date DESC`
    )
    .all(id)

  const totalPurchased = (purchases as any[]).reduce((sum, p) => sum + p.total_cost, 0)
  const totalSold = (sales as any[]).reduce((sum, s) => sum + s.sale_price, 0)
  const remainingFromContact = (sales as any[]).reduce((sum, s) => sum + s.remaining_amount, 0)
  const remainingToContact = (purchases as any[]).reduce(
    (sum, p) => sum + p.remaining_amount,
    0
  )

  return {
    contact,
    purchases,
    sales,
    totalPurchased,
    totalSold,
    remainingFromContact,
    remainingToContact,
  }
}

export function updateContactType(id: number, newType: Contact['contact_type']): void {
  const db = getDatabase()
  const contact = getContactById(id)
  if (!contact) return

  const typeMap: Record<string, Record<string, Contact['contact_type']>> = {
    seller: { buyer: 'both', seller: 'seller', both: 'both' },
    buyer: { seller: 'both', buyer: 'buyer', both: 'both' },
    both: { seller: 'both', buyer: 'both', both: 'both' },
  }

  const updated = typeMap[contact.contact_type]?.[newType] || newType
  db.prepare(`UPDATE contacts SET contact_type = ?, updated_at = datetime('now') WHERE id = ?`).run(
    updated,
    id
  )
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/^00/, '+')
}
