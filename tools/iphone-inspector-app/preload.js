'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  onDeviceUpdate: (cb) => ipcRenderer.on('device-update', (_e, d) => cb(d)),
  retry:          ()   => ipcRenderer.invoke('retry'),
  rawDiagnostics: ()   => ipcRenderer.invoke('raw-diagnostics'),
  generatePdf:    ()   => ipcRenderer.invoke('generate-pdf'),
});
