'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onDeviceUpdate: (cb) => ipcRenderer.on('device-update', (_e, data) => cb(data)),
  retry:          ()   => ipcRenderer.invoke('retry'),
});
