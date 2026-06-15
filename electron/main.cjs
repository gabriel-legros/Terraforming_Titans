const { app, BrowserWindow, Menu, session, shell } = require('electron');
const path = require('path');

const appIconPath = path.join(__dirname, '..', 'assets', 'images', 'cover_small.png');

function openExternalUrl(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'mailto:') {
      shell.openExternal(url);
    }
  } catch (_error) {
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 950,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#111827',
    icon: appIconPath,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', event => {
    const targetUrl = event.url;
    if (!targetUrl.startsWith('file://')) {
      event.preventDefault();
      openExternalUrl(targetUrl);
    }
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  app.setName('Terraforming Titans');
  app.setAppUserModelId('terraforming-titans');
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
