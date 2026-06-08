import { getDatabase } from '../database'

export function globalSearch(query: string): any[] {
  if (!query || query.trim().length < 2) return []

  const db = getDatabase()
  const q = query.trim()
  const qLike = `%${q}%`
  const results: any[] = []

  // Search devices by serial, IMEI, model
  const devices = db
    .prepare(
      `SELECT d.*,
        pt.purchase_date, pt.purchase_price, pt.total_cost as pt_total_cost,
        pt.remaining_amount as purchase_remaining,
        c_seller.name as seller_name, c_seller.phone as seller_phone,
        st.sale_date, st.sale_price, st.profit,
        st.remaining_amount as sale_remaining,
        c_buyer.name as buyer_name, c_buyer.phone as buyer_phone,
        i.invoice_number
       FROM devices d
       LEFT JOIN purchase_transactions pt ON d.purchase_transaction_id = pt.id
       LEFT JOIN contacts c_seller ON pt.seller_contact_id = c_seller.id
       LEFT JOIN sale_transactions st ON d.sale_transaction_id = st.id
       LEFT JOIN contacts c_buyer ON st.buyer_contact_id = c_buyer.id
       LEFT JOIN invoices i ON st.invoice_id = i.id
       WHERE d.deleted_at IS NULL AND (
         d.serial_number LIKE ? OR d.imei1 LIKE ? OR d.imei2 LIKE ?
         OR d.model LIKE ? OR d.color LIKE ? OR d.storage LIKE ?
       )
       ORDER BY d.created_at DESC LIMIT 10`
    )
    .all(qLike, qLike, qLike, qLike, qLike, qLike)

  for (const d of devices as any[]) {
    results.push({
      type: 'device',
      id: d.id,
      title: `${d.brand} ${d.model} ${d.storage} ${d.color}`,
      subtitle: [d.serial_number, d.imei1].filter(Boolean).join(' / '),
      data: d,
    })
  }

  // Search contacts by phone, name
  const contacts = db
    .prepare(
      `SELECT * FROM contacts
       WHERE deleted_at IS NULL AND (
         phone LIKE ? OR secondary_phone LIKE ? OR name LIKE ? OR national_id LIKE ?
       )
       ORDER BY name LIMIT 10`
    )
    .all(qLike, qLike, qLike, qLike)

  for (const c of contacts as any[]) {
    results.push({
      type: 'contact',
      id: c.id,
      title: c.name,
      subtitle: c.phone,
      data: c,
    })
  }

  // Search invoices by number
  const invoices = db
    .prepare(
      `SELECT i.*,
        c.name as buyer_name, c.phone as buyer_phone,
        d.model, d.storage, d.serial_number
       FROM invoices i
       JOIN contacts c ON i.buyer_contact_id = c.id
       JOIN sale_transactions st ON i.sale_transaction_id = st.id
       JOIN devices d ON st.device_id = d.id
       WHERE i.deleted_at IS NULL AND i.invoice_number LIKE ?
       ORDER BY i.id DESC LIMIT 5`
    )
    .all(qLike)

  for (const inv of invoices as any[]) {
    results.push({
      type: 'invoice',
      id: inv.id,
      title: `فاتورة رقم ${inv.invoice_number}`,
      subtitle: `${inv.buyer_name} - ${inv.model} ${inv.storage}`,
      data: inv,
    })
  }

  return results
}
