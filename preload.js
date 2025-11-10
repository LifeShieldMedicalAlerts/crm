const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onCheckCanClose: (callback) => {
    ipcRenderer.on('check-can-close', callback);
    return () => ipcRenderer.removeListener('check-can-close', callback);
  },
  respondCanClose: (canClose) => ipcRenderer.send('can-close-response', canClose)
});