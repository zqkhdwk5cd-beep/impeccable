const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getTheme: () => ipcRenderer.invoke('get-theme'),
  onThemeChange: (cb) => ipcRenderer.on('theme-changed', (_e, theme) => cb(theme)),
  openExternal: (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
  },
});
