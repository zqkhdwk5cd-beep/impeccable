import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    getDataDir: () => ipcRenderer.invoke('fs:getDataDir'),
    readDir: (dirPath: string, maxDepth?: number) =>
      ipcRenderer.invoke('fs:readDir', dirPath, maxDepth)
  },
  dialog: {
    showSaveDialog: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('dialog:showOpenDialog', options)
  },
  system: {
    getHardwareInfo: () => ipcRenderer.invoke('system:getHardwareInfo')
  },
  comfyui: {
    get: (path: string) => ipcRenderer.invoke('comfyui:get', path),
    post: (path: string, body: string) => ipcRenderer.invoke('comfyui:post', path, body)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
