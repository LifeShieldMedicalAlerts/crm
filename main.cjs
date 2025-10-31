const { app, BrowserWindow, session } = require('electron')
const path = require('path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'public/preload.js'),
      enableRemoteModule: true
    }
  })

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`
  win.loadURL(startUrl)

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
    session.defaultSession.clearCache();
  }

  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
  if (permission === 'media' || permission === 'microphone') {
    callback(true); // Allow
  } else {
    callback(false);
  }
});
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})