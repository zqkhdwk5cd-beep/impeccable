import { app, BrowserWindow, session, systemPreferences } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database'
import { registerIpcHandlers } from './ipc-handlers'
import { startDailyBackup } from './backup'

let mainWindow: BrowserWindow | null = null

// __dirname = dist/main/main/ (in both dev and packaged)
// preload  = dist/main/preload/index.js  → one level up  → ../preload/index.js
// renderer = dist/renderer/index.html    → two levels up → ../../renderer/index.html
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const PRELOAD_PATH = path.join(__dirname, '../preload/index.js')
const RENDERER_PATH = path.join(__dirname, '../../renderer/index.html')

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Team Store - إدارة الأجهزة',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#f8fafc',
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(RENDERER_PATH)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Allow camera access for box scanning
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media')
  })

  // Request macOS camera permission proactively
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('camera')
    if (status === 'not-determined') {
      systemPreferences.askForMediaAccess('camera')
    }
  }

  try {
    initDatabase()
    registerIpcHandlers()
    startDailyBackup()
    createWindow()
  } catch (err) {
    console.error('Startup error:', err)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
