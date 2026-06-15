const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const appIconPath = path.join(__dirname, '..', 'assets', 'images', 'cover_small.png');

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
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', event => {
    const targetUrl = event.url;
    if (!targetUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(targetUrl);
    }
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  app.setAppUserModelId('terraforming-titans');
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
