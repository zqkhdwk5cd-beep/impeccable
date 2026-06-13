import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    getDataDir: () => ipcRenderer.invoke('fs:getDataDir')
  },
  dialog: {
    showSaveDialog: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('dialog:showOpenDialog', options)
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
