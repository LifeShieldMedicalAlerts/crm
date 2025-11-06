const { app, BrowserWindow, session, ipcMain } = require('electron');
const packageJson = require('./package.json');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let updateWindow;

// Detect if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Configure auto-updater (only in production)
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

if (!isDev) {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'LifeShieldMedicalAlerts',
    repo: 'crm'
  });
}

// Helper functions for update window
function closeUpdateWindow() {
  if (updateWindow) {
    updateWindow.close();
    updateWindow = null;
  }
}

function sendUpdateStatus(message, status = '') {
  if (updateWindow && updateWindow.webContents) {
    updateWindow.webContents.send('update-status', { message, status });
  }
}

// Create update window
function createUpdateWindow() {
  updateWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  updateWindow.loadFile('update.html');
}

ipcMain.handle('get-app-version', () => {
  return packageJson.version;
});

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: true
    },
    show: false
  });

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
    session.defaultSession.clearCache();
  }

  // Permission handler for media/microphone
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'microphone') {
      callback(true);
    } else {
      callback(false);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
  sendUpdateStatus('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  sendUpdateStatus(`Update available: v${info.version}`, 'Downloading...');
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available. App is up to date.');
  sendUpdateStatus('App is up to date!', 'Starting...');
  setTimeout(() => {
    closeUpdateWindow();
    createWindow();
  }, 1000);
});

autoUpdater.on('download-progress', (progressObj) => {
  const percent = progressObj.percent;
  console.log(`Download progress: ${Math.round(percent)}%`);
  if (updateWindow && updateWindow.webContents) {
    updateWindow.webContents.send('update-progress', percent);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded. Installing...');
  sendUpdateStatus('Update downloaded!', 'Installing and restarting...');
  setTimeout(() => {
    autoUpdater.quitAndInstall(true, true);
  }, 2000);
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  console.error('Error message:', err.message);
  
  sendUpdateStatus('Update check failed. Starting app...', '');
  setTimeout(() => {
    closeUpdateWindow();
    createWindow();
  }, 2000);
});

// App lifecycle events
app.whenReady().then(() => {
  if (isDev) {
    createWindow();
  } else {
    createUpdateWindow();
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isDev) {
        createWindow();
      } else {
        createUpdateWindow();
        autoUpdater.checkForUpdates();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
