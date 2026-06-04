export interface Contact {
  id: number
  name: string
  phone: string
  secondary_phone?: string
  national_id?: string
  address?: string
  contact_type: 'seller' | 'buyer' | 'both'
  notes?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Device {
  id: number
  brand: string
  model: string
  storage: string
  color: string
  condition: 'new' | 'used' | 'refurbished'
  serial_number?: string
  imei1?: string
  imei2?: string
  battery_health?: number
  box_status: 'with_box' | 'without_box' | 'damaged_box'
  accessories?: string
  technical_notes?: string
  purchase_price: number
  extra_costs: number
  total_cost: number
  expected_sale_price?: number
  final_sale_price?: number
  status: 'available' | 'reserved' | 'sold' | 'returned' | 'repair' | 'archived'
  purchase_transaction_id?: number
  sale_transaction_id?: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface PurchaseTransaction {
  id: number
  device_id: number
  seller_contact_id: number
  purchase_date: string
  purchase_price: number
  extra_costs: number
  total_cost: number
  payment_method: 'cash' | 'transfer' | 'check' | 'other'
  paid_amount: number
  remaining_amount: number
  notes?: string
  created_by?: number
  created_at: string
  updated_at: string
  deleted_at?: string
  // joined
  seller_name?: string
  seller_phone?: string
  device_model?: string
  device_serial?: string
  device_storage?: string
  device_color?: string
  device_imei1?: string
}

export interface SaleTransaction {
  id: number
  device_id: number
  buyer_contact_id: number
  sale_date: string
  sale_price: number
  discount: number
  paid_amount: number
  remaining_amount: number
  payment_method: 'cash' | 'transfer' | 'check' | 'other'
  profit: number
  invoice_id?: number
  notes?: string
  created_by?: number
  created_at: string
  updated_at: string
  deleted_at?: string
  // joined
  buyer_name?: string
  buyer_phone?: string
  device_model?: string
  device_serial?: string
  device_storage?: string
  device_color?: string
  invoice_number?: string
}

export interface Invoice {
  id: number
  invoice_number: string
  sale_transaction_id: number
  buyer_contact_id: number
  issue_date: string
  amount_due: number
  total_amount: number
  policy_text?: string
  notes?: string
  created_at: string
  updated_at: string
  deleted_at?: string
  // joined
  buyer_name?: string
  buyer_phone?: string
  device_model?: string
  device_serial?: string
  device_imei1?: string
  device_storage?: string
  device_color?: string
}

export interface InvoiceItem {
  id: number
  invoice_id: number
  device_id: number
  description: string
  serial_or_imei?: string
  amount: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Payment {
  id: number
  transaction_type: 'purchase' | 'sale'
  transaction_id: number
  contact_id: number
  amount: number
  payment_method: 'cash' | 'transfer' | 'check' | 'other'
  payment_date: string
  notes?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Expense {
  id: number
  device_id: number
  expense_type: 'repair' | 'cleaning' | 'accessories' | 'transport' | 'unlocking' | 'other'
  amount: number
  expense_date: string
  notes?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Setting {
  id: number
  key: string
  value: string
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  name: string
  username: string
  password_hash: string
  role: 'admin' | 'employee'
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface AuditLog {
  id: number
  user_id?: number
  action: string
  entity_type: string
  entity_id: number
  old_value?: string
  new_value?: string
  created_at: string
}

export interface DashboardStats {
  available_devices: number
  sold_devices: number
  total_inventory_value: number
  total_sales: number
  total_profit: number
  total_remaining_from_customers: number
  total_remaining_to_suppliers: number
  monthly_sales: number
  monthly_profit: number
}

export interface SearchResult {
  type: 'device' | 'contact' | 'invoice' | 'purchase' | 'sale'
  id: number
  title: string
  subtitle: string
  data: any
}

export interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Settings keys
export const SETTING_KEYS = {
  STORE_NAME: 'store_name',
  STORE_ADDRESS: 'store_address',
  STORE_PHONE: 'store_phone',
  INVOICE_START_NUMBER: 'invoice_start_number',
  DEFAULT_POLICY_TEXT: 'default_policy_text',
  BACKUP_LOCATION: 'backup_location',
  DAILY_BACKUP_ENABLED: 'daily_backup_enabled',
  BACKUPS_TO_KEEP: 'backups_to_keep',
  CURRENCY: 'currency',
  LAST_BACKUP_DATE: 'last_backup_date',
} as const
