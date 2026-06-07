declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

async function invoke<T>(channel: string, ...args: any[]): Promise<T> {
  const response = await window.electron.invoke(channel, ...args)
  if (!response.success) {
    throw new Error(response.error || 'حدث خطأ غير متوقع')
  }
  return response.data as T
}

export const api = {
  // Auth
  auth: {
    login: (username: string, password: string) =>
      invoke<{ success: boolean; user?: any }>('auth:login', username, password),
    hasUsers: () => invoke<boolean>('auth:hasUsers'),
    createAdmin: (data: any) => invoke<any>('auth:createAdmin', data),
    getFirst: () => invoke<any>('auth:getFirst'),
  },

  // Users
  users: {
    getAll: () => invoke<any[]>('users:getAll'),
    create: (data: any) => invoke<any>('users:create', data),
    update: (id: number, data: any) => invoke<any>('users:update', id, data),
    delete: (id: number) => invoke<boolean>('users:delete', id),
    changePassword: (id: number, password: string) =>
      invoke<boolean>('users:changePassword', id, password),
  },

  // Contacts
  contacts: {
    getAll: () => invoke<any[]>('contacts:getAll'),
    getById: (id: number) => invoke<any>('contacts:getById', id),
    findByPhone: (phone: string) => invoke<any | null>('contacts:findByPhone', phone),
    search: (query: string) => invoke<any[]>('contacts:search', query),
    create: (data: any) => invoke<any>('contacts:create', data),
    update: (id: number, data: any) => invoke<any>('contacts:update', id, data),
    delete: (id: number) => invoke<boolean>('contacts:delete', id),
    restore: (id: number) => invoke<boolean>('contacts:restore', id),
    getProfile: (id: number) => invoke<any>('contacts:getProfile', id),
  },

  // Devices
  devices: {
    getAll: (filters?: any) => invoke<{ items: any[]; total: number }>('devices:getAll', filters),
    getById: (id: number) => invoke<any>('devices:getById', id),
    findBySerial: (serial: string) => invoke<any | null>('devices:findBySerial', serial),
    findByImei: (imei: string) => invoke<any | null>('devices:findByImei', imei),
    search: (query: string) => invoke<any[]>('devices:search', query),
    update: (id: number, data: any, userId?: number) =>
      invoke<any>('devices:update', id, data, userId),
    delete: (id: number, userId?: number) => invoke<boolean>('devices:delete', id, userId),
    getDetail: (id: number) => invoke<any>('devices:getDetail', id),
    getStats: () => invoke<any>('devices:getStats'),
    returnDevice: (id: number, returnPrice: number, userId?: number) =>
      invoke<any>('devices:return', id, returnPrice, userId),
  },

  // Purchases
  purchases: {
    getAll: (limit?: number) => invoke<any[]>('purchases:getAll', limit),
    getById: (id: number) => invoke<any>('purchases:getById', id),
    create: (data: any) => invoke<any>('purchases:create', data),
    update: (id: number, data: any, userId?: number) =>
      invoke<any>('purchases:update', id, data, userId),
    delete: (id: number, userId?: number) => invoke<boolean>('purchases:delete', id, userId),
    getReport: (from: string, to: string) => invoke<any[]>('purchases:getReport', from, to),
  },

  // Sales
  sales: {
    getAll: (limit?: number) => invoke<any[]>('sales:getAll', limit),
    getById: (id: number) => invoke<any>('sales:getById', id),
    create: (data: any) => invoke<any>('sales:create', data),
    update: (id: number, data: any, userId?: number) =>
      invoke<any>('sales:update', id, data, userId),
    delete: (id: number, userId?: number) => invoke<boolean>('sales:delete', id, userId),
    getReport: (from: string, to: string) => invoke<any[]>('sales:getReport', from, to),
    getDashboard: () => invoke<any>('sales:getDashboard'),
  },

  // Invoices
  invoices: {
    getAll: (limit?: number) => invoke<any[]>('invoices:getAll', limit),
    getById: (id: number) => invoke<any>('invoices:getById', id),
    getByNumber: (num: string) => invoke<any | null>('invoices:getByNumber', num),
    delete: (id: number, userId?: number) => invoke<boolean>('invoices:delete', id, userId),
  },

  // Expenses
  expenses: {
    getByDevice: (deviceId: number) => invoke<any[]>('expenses:getByDevice', deviceId),
    add: (data: any) => invoke<any>('expenses:add', data),
    delete: (id: number) => invoke<boolean>('expenses:delete', id),
  },

  // Settings
  settings: {
    getAll: () => invoke<Record<string, string>>('settings:getAll'),
    get: (key: string) => invoke<string>('settings:get', key),
    update: (data: Record<string, string>, userId?: number) =>
      invoke<void>('settings:update', data, userId),
  },

  // Audit
  audit: {
    getLogs: (limit?: number) => invoke<any[]>('audit:getLogs', limit),
    getForEntity: (entityType: string, entityId: number) =>
      invoke<any[]>('audit:getForEntity', entityType, entityId),
  },

  // Search
  search: {
    global: (query: string) => invoke<any[]>('search:global', query),
  },

  // Backup
  backup: {
    create: (userId?: number) =>
      invoke<{ success: boolean; path?: string; error?: string }>('backup:create', userId),
    list: () => invoke<any[]>('backup:list'),
    restore: (backupPath: string, userId?: number) =>
      invoke<{ success: boolean; error?: string }>('backup:restore', backupPath, userId),
    getDir: () => invoke<string>('backup:getDir'),
    getDatabasePath: () => invoke<string>('backup:getDatabasePath'),
  },

  // Salespeople
  salespeople: {
    getAll: () => invoke<any[]>('salespeople:getAll'),
    getActive: () => invoke<any[]>('salespeople:getActive'),
    create: (name: string) => invoke<any>('salespeople:create', name),
    toggle: (id: number) => invoke<any>('salespeople:toggle', id),
    delete: (id: number) => invoke<boolean>('salespeople:delete', id),
    getReport: (from: string, to: string) => invoke<any[]>('salespeople:getReport', from, to),
    setPin: (id: number, pin: string) => invoke<void>('salespeople:setPin', id, pin),
    removePin: (id: number) => invoke<void>('salespeople:removePin', id),
    verifyPin: (id: number, pin: string) => invoke<boolean>('salespeople:verifyPin', id, pin),
  },

  // Device Options
  deviceOptions: {
    getAll: () => invoke<{ model: string[]; storage: string[]; color: string[] }>('deviceOptions:getAll'),
    getByType: (type: 'model' | 'storage' | 'color') =>
      invoke<{ id: number; type: string; value: string; sort_order: number }[]>('deviceOptions:getByType', type),
    add: (type: 'model' | 'storage' | 'color', value: string) =>
      invoke<any>('deviceOptions:add', type, value),
    delete: (id: number) => invoke<boolean>('deviceOptions:delete', id),
    reorder: (id: number, direction: 'up' | 'down') =>
      invoke<void>('deviceOptions:reorder', id, direction),
  },

  // Payments
  payments: {
    add: (data: any) => invoke<any>('payments:add', data),
    getForTransaction: (type: 'purchase' | 'sale', transactionId: number) =>
      invoke<any[]>('payments:getForTransaction', type, transactionId),
    getPending: () => invoke<{ purchases: any[]; sales: any[] }>('payments:getPending'),
  },

  // Printers
  printers: {
    list: (): Promise<any[]> => window.electron.invoke('printers:list'),
    printLabel: (html: string, options: any): Promise<{ success: boolean; reason?: string }> =>
      window.electron.invoke('print:label', html, options),
  },

  // Camera
  camera: {
    requestAccess: () => invoke<boolean>('camera:requestAccess'),
    openSettings: () => invoke<void>('camera:openSettings'),
  },

  // Dialogs
  dialog: {
    openFile: (options?: any) => window.electron.invoke('dialog:openFile', options),
    saveFile: (options?: any) => window.electron.invoke('dialog:saveFile', options),
    openDirectory: (options?: any) => window.electron.invoke('dialog:openDirectory', options),
  },
}
