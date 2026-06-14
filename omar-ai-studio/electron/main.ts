import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import fs from 'fs'
import os from 'os'
import { execSync } from 'child_process'

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

ipcMain.handle('system:getHardwareInfo', async () => {
  const cpus = os.cpus()
  const totalMemBytes = os.totalmem()
  const freeMemBytes = os.freemem()

  let cpuBrand = cpus[0]?.model || 'Unknown CPU'
  let appleSiliconModel: string | null = null

  if (process.platform === 'darwin') {
    try {
      cpuBrand = execSync('sysctl -n machdep.cpu.brand_string', { timeout: 2000 })
        .toString().trim()
      // Apple Silicon — brand string is just "Apple M2 Pro" etc.
      const appleMatch = cpuBrand.match(/Apple\s+(M\d+(?:\s+(?:Pro|Max|Ultra|Base))?)/i)
      if (appleMatch) {
        appleSiliconModel = appleMatch[0]  // e.g. "Apple M2 Pro"
      }
    } catch {
      // Intel Mac or sysctl not available
    }
  }

  return {
    cpuBrand,
    cpuCores: cpus.length,
    totalMemBytes,
    freeMemBytes,
    appleSiliconModel,
    platform: process.platform,
    arch: process.arch
  }
})

ipcMain.handle('fs:readDir', async (_event, dirPath: string, maxDepth = 3) => {
  try {
    const results: { path: string; name: string; isDir: boolean; size: number; ext: string }[] = []
    const IGNORED = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '__pycache__', '.cache', 'coverage', '.turbo'])

    function readRecursive(currentPath: string, depth: number): void {
      if (depth > maxDepth) return
      let entries: ReturnType<typeof fs.readdirSync>
      try { entries = fs.readdirSync(currentPath, { withFileTypes: true }) } catch { return }
      for (const entry of entries) {
        if (entry.name.startsWith('.') || IGNORED.has(entry.name)) continue
        const fullPath = join(currentPath, entry.name)
        const isDir = entry.isDirectory()
        const ext = isDir ? '' : (entry.name.split('.').pop() || '')
        let size = 0
        if (!isDir) { try { size = fs.statSync(fullPath).size } catch {} }
        results.push({ path: fullPath, name: entry.name, isDir, size, ext })
        if (isDir) readRecursive(fullPath, depth + 1)
      }
    }

    readRecursive(dirPath, 0)
    return { success: true, data: results }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})
