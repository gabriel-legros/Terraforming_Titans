const { app, BrowserWindow, Menu, session, shell, powerSaveBlocker, screen, dialog, clipboard, protocol, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { createModService } = require('./mods/mod-service.cjs');
const { resolveSubscribedWorkshopMods } = require('./mods/workshop-service.cjs');

const appDisplayName = 'Terraforming Titans';
const defaultSteamAppId = 4864000;
const appIconPath = path.join(__dirname, '..', 'assets', 'images', 'cover_small.png');
const preloadPath = path.join(__dirname, 'preload.cjs');
const crashPreloadPath = path.join(__dirname, 'crash-preload.cjs');
const saveSlotNames = new Set(['autosave', 'exitsave', 'pretravel', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5']);
let fullscreenKeybindCode = 'F11';
const fullscreenKeybindCaptureResolvers = new Map();
const recentCrashSignatures = new Map();
let crashWindow = null;
let latestCrashReport = null;
let quitting = false;
let modService = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'tt-game',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true
    }
  }
]);

app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.setName(appDisplayName);

function getCrashLogPath() {
  return path.join(app.getPath('userData'), 'logs', 'crash.log');
}

function writeCrashLog(reportText) {
  const logPath = getCrashLogPath();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  if (fs.existsSync(logPath) && fs.statSync(logPath).size > 1024 * 1024) {
    const existingLog = fs.readFileSync(logPath, 'utf8');
    fs.writeFileSync(logPath, existingLog.slice(-512 * 1024), 'utf8');
  }
  fs.appendFileSync(logPath, `${reportText}\n\n`, 'utf8');
  return logPath;
}

function redactCrashPaths(value) {
  let redacted = String(value || '');
  const privatePaths = [
    [app.getPath('userData'), '<game-data>'],
    [app.getAppPath(), '<game>'],
    [app.getPath('home'), '<user-home>']
  ];
  privatePaths.forEach(([privatePath, replacement]) => {
    const slashPath = privatePath.replace(/\\/g, '/');
    const variants = new Set([privatePath, slashPath, encodeURI(slashPath)]);
    variants.forEach(variant => {
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      redacted = redacted.replace(new RegExp(escapedVariant, 'gi'), replacement);
    });
  });
  return redacted;
}

function createCrashReport(type, message, stack, details) {
  const timestamp = new Date().toISOString();
  const safeMessage = redactCrashPaths(message);
  const safeDetails = redactCrashPaths(details);
  const safeStack = redactCrashPaths(stack);
  const reportLines = [
    `[${timestamp}] ${type}`,
    `Message: ${safeMessage}`,
    `Game: ${app.getVersion()}`,
    `Electron: ${process.versions.electron}`,
    `Chrome: ${process.versions.chrome}`,
    `Platform: ${process.platform} ${process.arch}`
  ];
  if (safeDetails) {
    reportLines.push(`Details: ${safeDetails}`);
  }
  if (safeStack) {
    reportLines.push('', safeStack);
  }
  return {
    type,
    message: safeMessage,
    text: reportLines.join('\n'),
    logPath: ''
  };
}

function showCrashWindow(report) {
  latestCrashReport = report;
  if (!app.isReady()) {
    dialog.showErrorBox(appDisplayName, report.text);
    return;
  }
  if (crashWindow && !crashWindow.isDestroyed()) {
    crashWindow.webContents.send('crash-window:report', report);
    if (crashWindow.isMinimized()) {
      crashWindow.restore();
    }
    crashWindow.show();
    crashWindow.focus();
    return;
  }

  const gameWindow = BrowserWindow.getAllWindows()[0];
  let revealTimer = null;
  try {
    crashWindow = new BrowserWindow({
      width: 640,
      height: 460,
      minWidth: 520,
      minHeight: 360,
      title: appDisplayName,
      backgroundColor: '#111827',
      icon: appIconPath,
      alwaysOnTop: true,
      parent: gameWindow,
      show: false,
      webPreferences: {
        preload: crashPreloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    });
    crashWindow.center();
    crashWindow.setAlwaysOnTop(true, 'screen-saver');
    const revealCrashWindow = () => {
      if (!crashWindow || crashWindow.isDestroyed()) {
        return;
      }
      crashWindow.webContents.send('crash-window:report', latestCrashReport);
      crashWindow.show();
      crashWindow.focus();
    };
    revealTimer = setTimeout(revealCrashWindow, 1000);
    crashWindow.on('closed', () => {
      clearTimeout(revealTimer);
      crashWindow = null;
    });
    crashWindow.loadFile(path.join(__dirname, 'crash-window.html')).then(() => {
      clearTimeout(revealTimer);
      revealCrashWindow();
    }).catch(() => {
      clearTimeout(revealTimer);
      dialog.showErrorBox(appDisplayName, report.text);
    });
  } catch (_error) {
    clearTimeout(revealTimer);
    crashWindow = null;
    dialog.showErrorBox(appDisplayName, report.text);
  }
}

function reportCrash(type, message, stack, details) {
  const signature = `${type}\n${message}\n${stack}`;
  const now = Date.now();
  if (recentCrashSignatures.has(signature) && now - recentCrashSignatures.get(signature) < 3000) {
    return;
  }
  recentCrashSignatures.set(signature, now);
  for (const [knownSignature, timestamp] of recentCrashSignatures) {
    if (now - timestamp > 30000) {
      recentCrashSignatures.delete(knownSignature);
    }
  }

  const report = createCrashReport(type, message, stack, details);
  try {
    report.logPath = writeCrashLog(report.text);
  } catch (error) {
    report.text += `\n\nCrash log write failed: ${redactCrashPaths(error.message)}`;
  }
  showCrashWindow(report);
}

function registerCrashHandlers() {
  const { ipcMain } = require('electron');
  ipcMain.on('crash-report:renderer-error', (_event, report) => {
    reportCrash(report.type, report.message, report.stack, report.details);
  });
  ipcMain.on('crash-window:copy', () => {
    clipboard.writeText(latestCrashReport.text);
  });
  ipcMain.on('crash-window:open-log-folder', () => {
    shell.showItemInFolder(latestCrashReport.logPath);
  });
  ipcMain.on('crash-window:close', () => {
    crashWindow.close();
  });
  ipcMain.on('crash-window:quit', () => {
    app.quit();
  });
}

process.on('uncaughtException', error => {
  reportCrash('Main process exception', error.message, error.stack, 'The Electron main process encountered an uncaught error.');
});

process.on('unhandledRejection', reason => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : '';
  reportCrash('Main process rejection', message, stack, 'The Electron main process encountered an unhandled promise rejection.');
});

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

function shouldLaunchSteamDeckFullscreen() {
  return process.env.SteamDeck === '1';
}

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

function registerWindowControlHandlers() {
  const { ipcMain } = require('electron');
  ipcMain.handle('window:is-fullscreen', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win.isFullScreen();
  });
  ipcMain.handle('window:set-fullscreen', (event, enabled) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.setFullScreen(enabled === true);
    return win.isFullScreen();
  });
  ipcMain.handle('window:set-fullscreen-keybind', (_event, code) => {
    fullscreenKeybindCode = code || 'F11';
  });
  ipcMain.handle('window:capture-fullscreen-keybind', event => new Promise(resolve => {
    fullscreenKeybindCaptureResolvers.set(event.sender.id, resolve);
  }));
  ipcMain.handle('window:set-zoom-factor', (event, scale) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const allowedScales = [0.75, 0.9, 1, 1.1, 1.25, 1.5];
    const nextScale = allowedScales.includes(scale) ? scale : 1;
    win.webContents.setZoomFactor(nextScale);
    return nextScale;
  });
  ipcMain.on('window:exit-game', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.close();
  });
}

function registerModProtocol() {
  protocol.handle('tt-game', request => {
    const requestUrl = new URL(request.url);
    if (requestUrl.host !== 'app') {
      return new Response('Unknown mod content host.', { status: 404 });
    }
    let gamePath;
    try {
      gamePath = decodeURIComponent(requestUrl.pathname.replace(/^\/+/, '') || 'index.html');
    } catch (_error) {
      return new Response('Invalid mod content path.', { status: 400 });
    }
    const filePath = modService.resolveGameFile(gamePath);
    if (!filePath) {
      return new Response('Game content not found.', { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function isGameFrame(frame) {
  if (!frame) {
    return false;
  }
  const frameUrl = new URL(frame.url);
  return frameUrl.protocol === 'tt-game:' && frameUrl.host === 'app';
}

function registerModHandlers() {
  const { ipcMain } = require('electron');
  ipcMain.on('mods:get-session', event => {
    event.returnValue = isGameFrame(event.senderFrame)
      ? modService.publicSession
      : null;
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
  const launchFullscreen = shouldLaunchSteamDeckFullscreen();
  const displaySize = launchFullscreen ? screen.getPrimaryDisplay().bounds : null;
  const win = new BrowserWindow({
    width: launchFullscreen ? displaySize.width : 1400,
    height: launchFullscreen ? displaySize.height : 950,
    minWidth: 1024,
    minHeight: 700,
    fullscreen: launchFullscreen,
    backgroundColor: '#111827',
    icon: appIconPath,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return;
    }
    const captureKeybind = fullscreenKeybindCaptureResolvers.get(win.webContents.id);
    if (captureKeybind) {
      event.preventDefault();
      fullscreenKeybindCaptureResolvers.delete(win.webContents.id);
      captureKeybind(input.code);
      return;
    }
    if (input.code === fullscreenKeybindCode) {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
      return;
    }
    if (input.key === 'Escape' && win.isFullScreen()) {
      event.preventDefault();
      win.setFullScreen(false);
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

  win.on('enter-full-screen', () => {
    win.webContents.send('window:fullscreen-changed', true);
  });
  win.on('leave-full-screen', () => {
    win.webContents.send('window:fullscreen-changed', false);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', event => {
    const targetUrl = event.url;
    if (!targetUrl.startsWith('tt-game://app/')) {
      event.preventDefault();
      openExternalUrl(targetUrl);
    }
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    if (quitting) {
      return;
    }
    reportCrash(
      'Renderer process crash',
      `The game renderer stopped (${details.reason}).`,
      '',
      `Reason: ${details.reason}; exit code: ${details.exitCode}`
    );
  });

  win.loadURL('tt-game://app/index.html');
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  app.setAppUserModelId('terraforming-titans');
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  const workshopResult = await resolveSubscribedWorkshopMods(steamIntegration);
  modService = createModService({
    appRoot: path.join(__dirname, '..'),
    userDataPath: app.getPath('userData'),
    isPackaged: app.isPackaged,
    workshopMods: workshopResult.installedMods,
    workshopStatus: workshopResult.status
  });
  workshopResult.status.items.forEach(item => {
    if (item.status === 'installed') {
      console.log(`Steam Workshop item ${item.workshopId} is installed and ready.`);
    } else {
      console.warn(`Steam Workshop item ${item.workshopId} ${item.status}: ${item.message}`);
    }
  });
  if (modService.publicSession.mods.length) {
    const modIds = modService.publicSession.mods.map(mod => mod.id).join(', ');
    console.log(`Mods active: ${modIds}.`);
  }
  modService.publicSession.errors.forEach(error => {
    const source = error.workshopId ? `Workshop ${error.workshopId}` : error.folder;
    console.warn(`Mod skipped (${source}): ${error.message}`);
  });
  registerModProtocol();
  registerCrashHandlers();
  registerSaveStorageHandlers();
  registerSteamAchievementHandlers();
  registerWindowControlHandlers();
  registerModHandlers();
  powerSaveBlocker.start('prevent-app-suspension');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
