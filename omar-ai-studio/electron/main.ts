import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import fs from 'fs'
import os from 'os'
import http from 'http'
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
      contextIsolation: true,
      webSecurity: false
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
// ComfyUI proxy — makes HTTP requests from main process (no renderer security restrictions)
ipcMain.handle('comfyui:get', async (_event, path: string) => {
  return new Promise<{ ok: boolean; data: unknown; status: number }>((resolve) => {
    const req = http.get(`http://127.0.0.1:8188${path}`, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, status: res.statusCode ?? 0, data: JSON.parse(body) })
        } catch {
          resolve({ ok: res.statusCode === 200, status: res.statusCode ?? 0, data: body })
        }
      })
    })
    req.on('error', () => resolve({ ok: false, status: 0, data: null }))
    req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false, status: 0, data: null }) })
  })
})

ipcMain.handle('comfyui:post', async (_event, path: string, body: string) => {
  return new Promise<{ ok: boolean; data: unknown; status: number }>((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: 8188,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, status: res.statusCode ?? 0, data: JSON.parse(data) })
        } catch {
          resolve({ ok: res.statusCode === 200, status: res.statusCode ?? 0, data })
        }
      })
    })
    req.on('error', () => resolve({ ok: false, status: 0, data: null }))
    req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false, status: 0, data: null }) })
    req.write(body)
    req.end()
  })
})

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
