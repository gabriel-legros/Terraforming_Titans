const { app, BrowserWindow, Menu, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const appDisplayName = 'Terraforming Titans';
const defaultSteamAppId = 4864000;
const appIconPath = path.join(__dirname, '..', 'assets', 'images', 'cover_small.png');
const preloadPath = path.join(__dirname, 'preload.cjs');
const saveSlotNames = new Set(['autosave', 'exitsave', 'pretravel', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5']);

app.setName(appDisplayName);

function readBuildTargetSource() {
  const buildTargetPath = path.join(__dirname, '..', 'src', 'js', 'build-target.js');
  if (!fs.existsSync(buildTargetPath)) {
    return '';
  }
  return fs.readFileSync(buildTargetPath, 'utf8');
}

function isSteamBuildTarget(buildTargetSource) {
  return buildTargetSource.includes("GAME_BUILD_TARGET = 'steam'");
}

function getSteamAppId(buildTargetSource) {
  const envAppId = Number(process.env.TERRAFORMING_TITANS_STEAM_APP_ID);
  if (Number.isFinite(envAppId) && envAppId > 0) {
    return envAppId;
  }
  const match = /STEAM_APP_ID\s*=\s*(\d+)/.exec(buildTargetSource);
  if (match) {
    return Number(match[1]);
  }
  return defaultSteamAppId;
}

function createSteamIntegration() {
  const buildTargetSource = readBuildTargetSource();
  const integration = {
    enabled: false,
    initialized: false,
    client: null,
    error: ''
  };

  if (!isSteamBuildTarget(buildTargetSource)) {
    return integration;
  }

  const steamAppId = getSteamAppId(buildTargetSource);
  integration.enabled = true;
  try {
    const steamworks = require('steamworks.js');
    steamworks.electronEnableSteamOverlay();
    integration.client = steamworks.init(steamAppId);
    integration.initialized = true;
    console.log(`Steamworks initialized for AppID ${steamAppId}.`);
  } catch (error) {
    integration.error = error && error.message ? error.message : String(error);
    console.warn(`Steamworks unavailable: ${integration.error}`);
  }

  return integration;
}

const steamIntegration = createSteamIntegration();

function getSaveStoragePath(key) {
  if (key === 'saveSlotDates') {
    return path.join(app.getPath('userData'), 'saves', 'slot-dates.json');
  }
  if (key === 'saveSlotNames') {
    return path.join(app.getPath('userData'), 'saves', 'slot-names.json');
  }
  const match = /^gameState_(.+)$/.exec(key);
  if (match && saveSlotNames.has(match[1])) {
    return path.join(app.getPath('userData'), 'saves', `${match[1]}.json`);
  }
  return null;
}

function readSaveStorageItem(key) {
  const filePath = getSaveStoragePath(key);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function writeSaveStorageItem(key, value) {
  const filePath = getSaveStoragePath(key);
  if (!filePath) {
    return false;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, String(value), 'utf8');
  fs.renameSync(tempPath, filePath);
  return true;
}

function removeSaveStorageItem(key) {
  const filePath = getSaveStoragePath(key);
  if (!filePath) {
    return false;
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return true;
}

function registerSaveStorageHandlers() {
  const { ipcMain } = require('electron');
  ipcMain.on('save-storage:getItem', (event, key) => {
    event.returnValue = readSaveStorageItem(key);
  });
  ipcMain.on('save-storage:setItem', (event, key, value) => {
    event.returnValue = writeSaveStorageItem(key, value);
  });
  ipcMain.on('save-storage:removeItem', (event, key) => {
    event.returnValue = removeSaveStorageItem(key);
  });
}

function getSteamAchievementApiName(id) {
  return String(id).toUpperCase();
}

function activateSteamAchievement(id) {
  if (!steamIntegration.initialized) {
    return false;
  }

  const achievementId = getSteamAchievementApiName(id);
  try {
    if (steamIntegration.client.achievement.isActivated(achievementId)) {
      return true;
    }
    const activated = steamIntegration.client.achievement.activate(achievementId);
    const stored = steamIntegration.client.stats.store();
    if (activated && stored) {
      console.log(`Steam achievement activated: ${achievementId}`);
      return true;
    }
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.warn(`Steam achievement activation failed for ${achievementId}: ${message}`);
  }
  return false;
}

function registerSteamAchievementHandlers() {
  const { ipcMain } = require('electron');
  ipcMain.on('steam-achievements:activate', (_event, id) => {
    activateSteamAchievement(id);
  });
  ipcMain.on('steam-achievements:syncUnlocked', (_event, ids) => {
    if (!Array.isArray(ids)) {
      return;
    }
    ids.forEach((id) => activateSteamAchievement(id));
  });
}

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
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return;
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools({ mode: 'detach' });
      }
    }
    if (input.key === 'Escape' && win.webContents.isDevToolsOpened()) {
      event.preventDefault();
      win.webContents.closeDevTools();
    }
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
  app.setAppUserModelId('terraforming-titans');
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  registerSaveStorageHandlers();
  registerSteamAchievementHandlers();
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
