import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import fs from 'fs'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#08080F',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC: File system operations
ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { success: true, data: content }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  try {
    fs.mkdirSync(join(filePath, '..'), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('fs:getDataDir', async () => {
  return app.getPath('userData')
})

ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
  const result = await dialog.showSaveDialog(options)
  return result
})

ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
  const result = await dialog.showOpenDialog(options)
  return result
})
