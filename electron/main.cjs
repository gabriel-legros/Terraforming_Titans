const { app, BrowserWindow, Menu, session, shell, powerSaveBlocker, screen, dialog, clipboard, protocol, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { createModCatalog, createModService } = require('./mods/mod-service.cjs');
const { readModLoadout, reconcileModLoadout, writeModLoadout } = require('./mods/mod-loadout.cjs');
const { resolveSubscribedWorkshopMods } = require('./mods/workshop-service.cjs');
const { createWorkshopPublisher } = require('./mods/workshop-publisher.cjs');
const { createSaveCatalog, createTemporarySave } = require('./mod-launcher/save-catalog.cjs');

const appDisplayName = 'Terraforming Titans';
const defaultSteamAppId = 4864000;
const appIconPath = path.join(__dirname, '..', 'assets', 'images', 'cover_small.png');
const preloadPath = path.join(__dirname, 'preload.cjs');
const crashPreloadPath = path.join(__dirname, 'crash-preload.cjs');
const launcherPath = path.join(__dirname, 'mod-launcher', 'index.html');
const launcherPreloadPath = path.join(__dirname, 'mod-launcher', 'preload.cjs');
const creatorPath = path.join(__dirname, 'mod-creator', 'index.html');
const creatorPreloadPath = path.join(__dirname, 'mod-creator', 'preload.cjs');
const saveSlotNames = new Set([
  'autosave',
  'autosave1',
  'autosave2',
  'autosave3',
  'autosave4',
  'autosave5',
  'autosave6',
  'autosave7',
  'autosave8',
  'autosave9',
  'exitsave',
  'pretravel',
  'slot1',
  'slot2',
  'slot3',
  'slot4',
  'slot5'
]);
let fullscreenKeybindCode = 'F11';
const fullscreenKeybindCaptureResolvers = new Map();
const recentCrashSignatures = new Map();
let crashWindow = null;
let latestCrashReport = null;
let quitting = false;
let modService = null;
let launcherWindow = null;
let creatorWindow = null;
let workshopPublisher = null;
let launcherCatalog = null;
let launcherLoadout = null;
let launcherSaveCatalog = null;
let launcherWorkshopResult = {
  installedMods: [],
  status: { enabled: false, initialized: false, error: '', items: [] }
};
let launcherRefreshing = false;
let launcherStartupError = '';
let launcherSelectedSave = '';
let launcherTemporarySave = null;
let launcherTemporarySaveData = '';
let startupSelection = { mode: 'latest', slot: '' };
let gameLaunchStarted = false;

function getSavedWindowState(saveData) {
  try {
    const savedWindowState = JSON.parse(saveData).electronWindowState;
    if (!savedWindowState
      || !Number.isInteger(savedWindowState.width)
      || !Number.isInteger(savedWindowState.height)
      || savedWindowState.width < 1024
      || savedWindowState.height < 700) {
      return null;
    }
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    return {
      width: Math.min(savedWindowState.width, workAreaSize.width),
      height: Math.min(savedWindowState.height, workAreaSize.height),
      fullscreen: savedWindowState.fullscreen === true
    };
  } catch (_error) {
    return null;
  }
}

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

function getPublicCreatorError(error) {
  let message = redactCrashPaths(error && error.message ? error.message : String(error));
  if (launcherCatalog) {
    launcherCatalog.entries.forEach(entry => {
      const escapedPath = entry.modRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      message = message.replace(new RegExp(escapedPath, 'gi'), '<mod-folder>');
    });
  }
  return message.replace(/[A-Za-z]:[\\/][^\r\n]*/g, '<local-file>');
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
  ipcMain.on('window:get-state', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const bounds = win.getNormalBounds();
    event.returnValue = {
      width: bounds.width,
      height: bounds.height,
      fullscreen: win.isFullScreen()
    };
  });
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
    const allowedScales = [0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5];
    const nextScale = allowedScales.includes(scale) ? scale : 1;
    win.webContents.setZoomFactor(nextScale);
    return nextScale;
  });
  ipcMain.on('window:exit-game', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.close();
  });
  ipcMain.on('window:exit-to-launcher', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    gameLaunchStarted = false;
    createLauncherWindow();
    refreshLauncherCatalog();
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
    if (gamePath === 'index.html') {
      const indexHtml = fs.readFileSync(filePath, 'utf8');
      return new Response(modService.injectModContent(indexHtml), {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
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
  ipcMain.on('startup:get-selection', event => {
    event.returnValue = isGameFrame(event.senderFrame) ? startupSelection : null;
  });
}

function isLauncherFrame(frame) {
  return frame && frame.url === pathToFileURL(launcherPath).toString();
}

function getLauncherState() {
  const reconciled = reconcileModLoadout(launcherCatalog.entries, launcherLoadout);
  const publicById = new Map(launcherCatalog.publicItems.map(item => [item.instanceId, item]));
  const enabledById = new Map(reconciled.publicItems.map(item => [item.instanceId, item.enabled]));
  return {
    version: app.getVersion(),
    mods: reconciled.ordered.map(entry => ({
      ...publicById.get(entry.instanceId),
      enabled: enabledById.get(entry.instanceId)
    })),
    saves: launcherTemporarySave
      ? [launcherTemporarySave, ...launcherSaveCatalog.saves]
      : launcherSaveCatalog.saves,
    selectedSave: launcherSelectedSave,
    workshop: launcherWorkshopResult.status,
    refreshing: launcherRefreshing,
    creatorBusy: workshopPublisher ? workshopPublisher.isBusy() : false,
    error: launcherStartupError || launcherLoadout.error || ''
  };
}

function sendLauncherState() {
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.webContents.send('mod-launcher:state-changed', getLauncherState());
  }
}

function rebuildLauncherCatalog() {
  launcherCatalog = createModCatalog({
    appRoot: path.join(__dirname, '..'),
    userDataPath: app.getPath('userData'),
    isPackaged: app.isPackaged,
    workshopMods: launcherWorkshopResult.installedMods
  });
}

function refreshLauncherCatalog() {
  if (launcherRefreshing) {
    return Promise.resolve(false);
  }
  launcherRefreshing = true;
  sendLauncherState();
  return resolveSubscribedWorkshopMods(steamIntegration, {
    onUpdate(workshopStatus) {
      launcherWorkshopResult.status = workshopStatus;
      if (launcherWindow && !launcherWindow.isDestroyed()) {
        launcherWindow.webContents.send('mod-launcher:workshop-changed', workshopStatus);
      }
    }
  }).then(workshopResult => {
    launcherWorkshopResult = workshopResult;
    workshopResult.status.items.forEach(item => {
      if (item.status === 'installed') {
        console.log(`Steam Workshop item ${item.workshopId} is installed and ready.`);
      } else {
        console.warn(`Steam Workshop item ${item.workshopId} ${item.status}: ${item.message}`);
      }
    });
    rebuildLauncherCatalog();
    launcherLoadout = readModLoadout(app.getPath('userData'));
    launcherSaveCatalog = createSaveCatalog(app.getPath('userData'));
    const selectionAvailable = launcherSelectedSave === 'new'
      || (launcherSelectedSave === 'temporary' && launcherTemporarySave)
      || launcherSaveCatalog.saves.some(save => save.selectionId === launcherSelectedSave && save.valid);
    if (!selectionAvailable) {
      launcherSelectedSave = launcherSaveCatalog.defaultSelection;
    }
    launcherRefreshing = false;
    sendLauncherState();
    return true;
  }).catch(error => {
    launcherWorkshopResult.status.error = error.message;
    launcherRefreshing = false;
    sendLauncherState();
    return false;
  });
}

function selectTemporarySave(saveData, label) {
  launcherTemporarySave = createTemporarySave(saveData, label);
  launcherTemporarySaveData = saveData;
  launcherSelectedSave = launcherTemporarySave.selectionId;
  return launcherTemporarySave;
}

function createLauncherWindow() {
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.show();
    launcherWindow.focus();
    return launcherWindow;
  }
  launcherWindow = new BrowserWindow({
    width: 1180,
    height: 790,
    minWidth: 920,
    minHeight: 640,
    title: appDisplayName,
    backgroundColor: '#07111f',
    icon: appIconPath,
    show: false,
    webPreferences: {
      preload: launcherPreloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  launcherWindow.once('ready-to-show', () => launcherWindow.show());
  launcherWindow.setMenuBarVisibility(false);
  launcherWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  launcherWindow.on('closed', () => {
    launcherWindow = null;
  });
  launcherWindow.loadFile(launcherPath);
  return launcherWindow;
}

function isCreatorFrame(frame) {
  return frame && frame.url === pathToFileURL(creatorPath).toString();
}

function sendCreatorState(state) {
  if (creatorWindow && !creatorWindow.isDestroyed()) {
    creatorWindow.webContents.send('mod-creator:state-changed', state || workshopPublisher.getState());
  }
  sendLauncherState();
}

function sendCreatorProgress(progress) {
  if (creatorWindow && !creatorWindow.isDestroyed()) {
    creatorWindow.webContents.send('mod-creator:progress', progress);
  }
}

function createCreatorWindow() {
  if (creatorWindow && !creatorWindow.isDestroyed()) {
    creatorWindow.show();
    creatorWindow.focus();
    return creatorWindow;
  }
  creatorWindow = new BrowserWindow({
    width: 1344,
    height: 936,
    minWidth: 900,
    minHeight: 650,
    title: `${appDisplayName} Creator Tools`,
    backgroundColor: '#07111f',
    icon: appIconPath,
    parent: launcherWindow,
    show: false,
    webPreferences: {
      preload: creatorPreloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  creatorWindow.once('ready-to-show', () => creatorWindow.show());
  creatorWindow.setMenuBarVisibility(false);
  creatorWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  creatorWindow.on('close', event => {
    if (!quitting && workshopPublisher.isBusy()) {
      event.preventDefault();
    }
  });
  creatorWindow.on('closed', () => {
    creatorWindow = null;
  });
  creatorWindow.loadFile(creatorPath);
  return creatorWindow;
}

function registerModCreatorHandlers() {
  const { ipcMain } = require('electron');
  ipcMain.handle('mod-creator:get-state', event => {
    return isCreatorFrame(event.senderFrame) ? workshopPublisher.getState() : null;
  });
  ipcMain.handle('mod-creator:refresh', async event => {
    if (!isCreatorFrame(event.senderFrame) || workshopPublisher.isBusy()) {
      return workshopPublisher.getState();
    }
    rebuildLauncherCatalog();
    sendLauncherState();
    await workshopPublisher.refreshPublishedItems();
    return workshopPublisher.getState();
  });
  ipcMain.handle('mod-creator:choose-preview', async (event, instanceId) => {
    if (!isCreatorFrame(event.senderFrame) || workshopPublisher.isBusy()) {
      return { success: false, error: 'Creator Tools is busy.' };
    }
    try {
      const modRoot = workshopPublisher.getModFolder(String(instanceId));
      const result = await dialog.showOpenDialog(creatorWindow, {
        title: 'Choose Workshop Preview Image',
        defaultPath: modRoot,
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }
        ]
      });
      if (result.canceled || !result.filePaths.length) {
        return { success: true, canceled: true };
      }
      workshopPublisher.setPreview(String(instanceId), result.filePaths[0]);
      return { success: true };
    } catch (error) {
      return { success: false, error: getPublicCreatorError(error) };
    }
  });
  ipcMain.handle('mod-creator:clear-preview', (event, instanceId) => {
    if (!isCreatorFrame(event.senderFrame) || workshopPublisher.isBusy()) {
      return false;
    }
    workshopPublisher.clearPreview(String(instanceId));
    return true;
  });
  ipcMain.handle('mod-creator:open-mod-folder', (event, instanceId) => {
    if (!isCreatorFrame(event.senderFrame)) {
      return false;
    }
    try {
      const folder = instanceId
        ? workshopPublisher.getModFolder(String(instanceId))
        : path.join(app.getPath('userData'), 'mods', 'local');
      fs.mkdirSync(folder, { recursive: true });
      shell.openPath(folder);
      return true;
    } catch (_error) {
      return false;
    }
  });
  ipcMain.handle('mod-creator:open-workshop-item', (event, workshopId) => {
    const itemId = String(workshopId || '');
    if (!isCreatorFrame(event.senderFrame) || !/^[1-9]\d*$/.test(itemId)) {
      return false;
    }
    openExternalUrl(`https://steamcommunity.com/sharedfiles/filedetails/?id=${itemId}`);
    return true;
  });
  ipcMain.handle('mod-creator:open-workshop', event => {
    if (!isCreatorFrame(event.senderFrame)) {
      return false;
    }
    openExternalUrl(`https://steamcommunity.com/app/${getSteamAppId(readBuildTargetSource())}/workshop/`);
    return true;
  });
  ipcMain.handle('mod-creator:open-terms', event => {
    if (!isCreatorFrame(event.senderFrame)) {
      return false;
    }
    openExternalUrl('https://steamcommunity.com/sharedfiles/workshoplegalagreement');
    return true;
  });
  ipcMain.handle('mod-creator:publish', async (event, details) => {
    if (!isCreatorFrame(event.senderFrame)) {
      return { success: false, error: 'Invalid Creator Tools request.' };
    }
    try {
      rebuildLauncherCatalog();
      const result = await workshopPublisher.publish(details);
      if (result.created || result.needsToAcceptAgreement) {
        openExternalUrl(`https://steamcommunity.com/sharedfiles/filedetails/?id=${result.workshopId}`);
      }
      return { ...result, state: workshopPublisher.getState() };
    } catch (error) {
      return { success: false, error: getPublicCreatorError(error), state: workshopPublisher.getState() };
    }
  });
}

function registerModLauncherHandlers() {
  const { ipcMain } = require('electron');
  ipcMain.handle('mod-launcher:get-state', event => {
    return isLauncherFrame(event.senderFrame) ? getLauncherState() : null;
  });
  ipcMain.handle('mod-launcher:refresh', event => {
    if (!isLauncherFrame(event.senderFrame)) {
      return null;
    }
    launcherSaveCatalog = createSaveCatalog(app.getPath('userData'));
    refreshLauncherCatalog();
    return getLauncherState();
  });
  ipcMain.handle('mod-launcher:open-local-mods', event => {
    if (!isLauncherFrame(event.senderFrame)) {
      return false;
    }
    const localModsPath = path.join(app.getPath('userData'), 'mods', 'local');
    fs.mkdirSync(localModsPath, { recursive: true });
    shell.openPath(localModsPath);
    return true;
  });
  ipcMain.handle('mod-launcher:open-workshop', event => {
    if (!isLauncherFrame(event.senderFrame)) {
      return false;
    }
    shell.openExternal(`https://steamcommunity.com/app/${getSteamAppId(readBuildTargetSource())}/workshop/`);
    return true;
  });
  ipcMain.handle('mod-launcher:open-creator-tools', event => {
    if (!isLauncherFrame(event.senderFrame) || launcherRefreshing) {
      return false;
    }
    createCreatorWindow();
    return true;
  });
  ipcMain.handle('mod-launcher:import-save-file', async event => {
    if (!isLauncherFrame(event.senderFrame) || launcherRefreshing || gameLaunchStarted) {
      return { success: false, error: 'The launcher is not ready.' };
    }
    const result = await dialog.showOpenDialog(launcherWindow, {
      title: 'Import save from file',
      buttonLabel: 'Import',
      filters: [{ name: 'JSON save files', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) {
      return { success: false, canceled: true };
    }
    try {
      const filePath = result.filePaths[0];
      const saveData = fs.readFileSync(filePath, 'utf8');
      const label = `Imported: ${path.basename(filePath)}`;
      return { success: true, save: selectTemporarySave(saveData, label) };
    } catch (error) {
      return { success: false, error: `Could not import that save: ${error.message}` };
    }
  });
  ipcMain.handle('mod-launcher:import-save-clipboard', event => {
    if (!isLauncherFrame(event.senderFrame) || launcherRefreshing || gameLaunchStarted) {
      return { success: false, error: 'The launcher is not ready.' };
    }
    try {
      const saveData = clipboard.readText().trim();
      if (!saveData) {
        return { success: false, error: 'The clipboard does not contain save data.' };
      }
      return {
        success: true,
        save: selectTemporarySave(saveData, 'Imported from Clipboard')
      };
    } catch (error) {
      return { success: false, error: `Could not import that save: ${error.message}` };
    }
  });
  ipcMain.handle('mod-launcher:launch', (event, options) => {
    if (!isLauncherFrame(event.senderFrame) || launcherRefreshing || workshopPublisher.isBusy() || gameLaunchStarted) {
      return { success: false, error: 'The launcher is not ready.' };
    }
    try {
      launchGame(options);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

function launchGame(options) {
  const availableIds = launcherCatalog.entries.map(entry => entry.instanceId);
  const requestedOrder = options.order.map(value => String(value));
  const requestedDisabled = options.disabled.map(value => String(value));
  const saveSelection = String(options.saveSelection);
  const entriesById = new Map(launcherCatalog.entries.map(entry => [entry.instanceId, entry]));
  if (requestedOrder.length !== availableIds.length
      || new Set(requestedOrder).size !== availableIds.length
      || requestedOrder.some(instanceId => !entriesById.has(instanceId))) {
    throw new Error('The mod catalog changed. Refresh the launcher and try again.');
  }
  const disabled = new Set(requestedDisabled);
  if (requestedDisabled.some(instanceId => !entriesById.has(instanceId))) {
    throw new Error('The disabled mod list contains an unknown mod.');
  }
  const orderedEntries = requestedOrder.map(instanceId => entriesById.get(instanceId));
  const activeEntries = orderedEntries.filter(entry => entry.valid && !disabled.has(entry.instanceId));
  const activeManifestIds = new Set();
  activeEntries.forEach(entry => {
    if (activeManifestIds.has(entry.id)) {
      throw new Error(`Disable one copy of duplicate mod id ${entry.id}.`);
    }
    activeManifestIds.add(entry.id);
  });

  if (saveSelection === 'new') {
    startupSelection = { mode: 'new', slot: '' };
  } else if (saveSelection === 'temporary' && launcherTemporarySave && launcherTemporarySaveData) {
    startupSelection = {
      mode: 'temporary',
      saveData: launcherTemporarySaveData,
      windowState: getSavedWindowState(launcherTemporarySaveData)
    };
  } else {
    const selectedSave = launcherSaveCatalog.saves.find(save => save.selectionId === saveSelection && save.valid);
    if (!selectedSave) {
      throw new Error('The selected save is no longer available. Refresh the launcher.');
    }
    startupSelection = {
      mode: 'slot',
      slot: selectedSave.slot,
      windowState: getSavedWindowState(readSaveStorageItem(`gameState_${selectedSave.slot}`))
    };
  }

  launcherLoadout = writeModLoadout(
    app.getPath('userData'),
    launcherLoadout,
    availableIds,
    requestedOrder,
    requestedDisabled
  );
  modService = createModService({
    appRoot: path.join(__dirname, '..'),
    mods: activeEntries,
    workshopStatus: launcherWorkshopResult.status
  });
  if (modService.publicSession.mods.length) {
    const modIds = modService.publicSession.mods.map(mod => mod.id).join(', ');
    console.log(`Mods active: ${modIds}.`);
  }
  gameLaunchStarted = true;
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.hide();
  }
  createWindow();
}

function launchLatestSaveFromCommandLine() {
  if (launcherSaveCatalog.defaultSelection === 'new') {
    throw new Error('No valid save is available to load.');
  }
  const reconciled = reconcileModLoadout(launcherCatalog.entries, launcherLoadout);
  const invalidEnabledMod = reconciled.ordered.find(entry => !entry.valid && !reconciled.disabled.has(entry.instanceId));
  if (invalidEnabledMod) {
    throw new Error(`Enabled mod ${invalidEnabledMod.id} is invalid.`);
  }
  launchGame({
    order: reconciled.ordered.map(entry => entry.instanceId),
    disabled: reconciled.ordered
      .filter(entry => reconciled.disabled.has(entry.instanceId))
      .map(entry => entry.instanceId),
    saveSelection: launcherSaveCatalog.defaultSelection
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
  const steamDeckFullscreen = shouldLaunchSteamDeckFullscreen();
  const savedWindowState = steamDeckFullscreen ? null : startupSelection.windowState;
  const launchFullscreen = steamDeckFullscreen || (savedWindowState ? savedWindowState.fullscreen : false);
  const displaySize = launchFullscreen ? screen.getPrimaryDisplay().bounds : null;
  const win = new BrowserWindow({
    width: launchFullscreen ? displaySize.width : (savedWindowState ? savedWindowState.width : 1400),
    height: launchFullscreen ? displaySize.height : (savedWindowState ? savedWindowState.height : 950),
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
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.close();
    }
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

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  app.setAppUserModelId('terraforming-titans');
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  launcherCatalog = createModCatalog({
    appRoot: path.join(__dirname, '..'),
    userDataPath: app.getPath('userData'),
    isPackaged: app.isPackaged,
    workshopMods: []
  });
  launcherLoadout = readModLoadout(app.getPath('userData'));
  launcherSaveCatalog = createSaveCatalog(app.getPath('userData'));
  launcherSelectedSave = launcherSaveCatalog.defaultSelection;
  workshopPublisher = createWorkshopPublisher({
    appId: getSteamAppId(readBuildTargetSource()),
    userDataPath: app.getPath('userData'),
    steamIntegration,
    getLocalEntries() {
      return launcherCatalog.entries;
    },
    onStateChanged: sendCreatorState,
    onProgress: sendCreatorProgress
  });
  registerModProtocol();
  registerCrashHandlers();
  registerSaveStorageHandlers();
  registerSteamAchievementHandlers();
  registerWindowControlHandlers();
  registerModHandlers();
  registerModLauncherHandlers();
  registerModCreatorHandlers();
  powerSaveBlocker.start('prevent-app-suspension');
  if (process.argv.includes('--skip-launcher')) {
    refreshLauncherCatalog().then(refreshed => {
      if (!refreshed) {
        launcherStartupError = launcherWorkshopResult.status.error || 'The mod catalog could not be refreshed.';
        createLauncherWindow();
        return;
      }
      try {
        launchLatestSaveFromCommandLine();
      } catch (error) {
        launcherStartupError = `Automatic launch failed: ${error.message}`;
        createLauncherWindow();
      }
    });
  } else {
    createLauncherWindow();
    refreshLauncherCatalog();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (gameLaunchStarted) {
        createWindow();
      } else {
        createLauncherWindow();
      }
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
