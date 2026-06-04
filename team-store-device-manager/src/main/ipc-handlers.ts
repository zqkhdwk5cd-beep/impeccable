import { ipcMain, dialog } from 'electron'
import * as contacts from './repositories/contacts'
import * as devices from './repositories/devices'
import * as purchases from './repositories/purchases'
import * as sales from './repositories/sales'
import * as invoices from './repositories/invoices'
import * as expenses from './repositories/expenses'
import * as settings from './repositories/settings'
import * as users from './repositories/users'
import * as audit from './repositories/audit'
import * as search from './repositories/search'
import * as backup from './backup'
import { getDatabasePath } from './database'

function handle(channel: string, fn: (...args: any[]) => any) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      const result = await fn(...args)
      return { success: true, data: result }
    } catch (error: any) {
      console.error(`IPC error [${channel}]:`, error)
      return { success: false, error: error.message || String(error) }
    }
  })
}

export function registerIpcHandlers(): void {
  // Auth
  handle('auth:login', (username: string, password: string) =>
    users.verifyUser(username, password)
  )
  handle('auth:hasUsers', () => users.hasAnyUser())
  handle('auth:createAdmin', (data: any) => users.createUser({ ...data, role: 'admin' }))

  // Users
  handle('users:getAll', () => users.getAllUsers())
  handle('users:create', (data: any) => users.createUser(data))
  handle('users:update', (id: number, data: any) => users.updateUser(id, data))
  handle('users:delete', (id: number) => users.softDeleteUser(id))
  handle('users:changePassword', (id: number, password: string) =>
    users.changePassword(id, password)
  )

  // Contacts
  handle('contacts:getAll', () => contacts.getAllContacts())
  handle('contacts:getById', (id: number) => contacts.getContactById(id))
  handle('contacts:findByPhone', (phone: string) => contacts.findContactByPhone(phone))
  handle('contacts:search', (query: string) => contacts.searchContacts(query))
  handle('contacts:create', (data: any) => contacts.createContact(data))
  handle('contacts:update', (id: number, data: any) => contacts.updateContact(id, data))
  handle('contacts:delete', (id: number) => contacts.softDeleteContact(id))
  handle('contacts:restore', (id: number) => contacts.restoreContact(id))
  handle('contacts:getProfile', (id: number) => contacts.getContactProfile(id))

  // Devices
  handle('devices:getAll', (filters?: any) => devices.getAllDevices(filters))
  handle('devices:getById', (id: number) => devices.getDeviceById(id))
  handle('devices:findBySerial', (serial: string) => devices.findDeviceBySerial(serial))
  handle('devices:findByImei', (imei: string) => devices.findDeviceByImei(imei))
  handle('devices:search', (query: string) => devices.searchDevices(query))
  handle('devices:update', (id: number, data: any, userId?: number) => {
    const old = devices.getDeviceById(id)
    const result = devices.updateDevice(id, data)
    audit.logAudit({ user_id: userId, action: 'edit_device', entity_type: 'device', entity_id: id, old_value: JSON.stringify(old), new_value: JSON.stringify(data) })
    return result
  })
  handle('devices:delete', (id: number, userId?: number) => {
    audit.logAudit({ user_id: userId, action: 'delete_device', entity_type: 'device', entity_id: id })
    return devices.softDeleteDevice(id)
  })
  handle('devices:getDetail', (id: number) => devices.getDeviceDetail(id))
  handle('devices:getStats', () => devices.getInventoryStats())

  // Purchases
  handle('purchases:getAll', (limit?: number) => purchases.getAllPurchases(limit))
  handle('purchases:getById', (id: number) => purchases.getPurchaseById(id))
  handle('purchases:create', (data: any) => purchases.createPurchase(data))
  handle('purchases:update', (id: number, data: any, userId?: number) =>
    purchases.updatePurchase(id, data, userId)
  )
  handle('purchases:delete', (id: number, userId?: number) =>
    purchases.softDeletePurchase(id, userId)
  )
  handle('purchases:getReport', (from: string, to: string) =>
    purchases.getPurchaseReport(from, to)
  )

  // Sales
  handle('sales:getAll', (limit?: number) => sales.getAllSales(limit))
  handle('sales:getById', (id: number) => sales.getSaleById(id))
  handle('sales:create', (data: any) => sales.createSale(data))
  handle('sales:update', (id: number, data: any, userId?: number) =>
    sales.updateSale(id, data, userId)
  )
  handle('sales:delete', (id: number, userId?: number) => sales.softDeleteSale(id, userId))
  handle('sales:getReport', (from: string, to: string) => sales.getSalesReport(from, to))
  handle('sales:getDashboard', () => sales.getDashboardStats())

  // Invoices
  handle('invoices:getAll', (limit?: number) => invoices.getAllInvoices(limit))
  handle('invoices:getById', (id: number) => invoices.getInvoiceById(id))
  handle('invoices:getByNumber', (num: string) => invoices.getInvoiceByNumber(num))
  handle('invoices:delete', (id: number, userId?: number) =>
    invoices.softDeleteInvoice(id, userId)
  )

  // Expenses
  handle('expenses:getByDevice', (deviceId: number) =>
    expenses.getExpensesByDevice(deviceId)
  )
  handle('expenses:add', (data: any) => expenses.addExpense(data))
  handle('expenses:delete', (id: number) => expenses.softDeleteExpense(id))

  // Settings
  handle('settings:getAll', () => settings.getAllSettings())
  handle('settings:get', (key: string) => settings.getSettingValue(key))
  handle('settings:update', (data: Record<string, string>, userId?: number) =>
    settings.updateSettings(data, userId)
  )

  // Audit
  handle('audit:getLogs', (limit?: number) => audit.getAuditLogs(limit))
  handle('audit:getForEntity', (entityType: string, entityId: number) =>
    audit.getAuditLogsForEntity(entityType, entityId)
  )

  // Search
  handle('search:global', (query: string) => search.globalSearch(query))

  // Backup
  handle('backup:create', (userId?: number) => backup.createBackup(userId))
  handle('backup:list', () => backup.listBackups())
  handle('backup:restore', (backupPath: string, userId?: number) =>
    backup.restoreBackup(backupPath, userId)
  )
  handle('backup:getDir', () => backup.getBackupDir())
  handle('backup:getDatabasePath', () => getDatabasePath())

  // File dialogs
  ipcMain.handle('dialog:openFile', async (_event, options: any) => {
    const result = await dialog.showOpenDialog(options)
    return result
  })
  ipcMain.handle('dialog:saveFile', async (_event, options: any) => {
    const result = await dialog.showSaveDialog(options)
    return result
  })
  ipcMain.handle('dialog:openDirectory', async (_event, options: any) => {
    const result = await dialog.showOpenDialog({ ...options, properties: ['openDirectory'] })
    return result
  })
}
