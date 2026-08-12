const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronCrashReporter', {
  report(report) {
    ipcRenderer.send('crash-report:renderer-error', report);
  }
});

contextBridge.exposeInMainWorld('electronSaveStorage', {
  getItem(key) {
    return ipcRenderer.sendSync('save-storage:getItem', String(key));
  },
  setItem(key, value) {
    return ipcRenderer.sendSync('save-storage:setItem', String(key), String(value));
  },
  removeItem(key) {
    return ipcRenderer.sendSync('save-storage:removeItem', String(key));
  }
});

contextBridge.exposeInMainWorld('electronFileExport', {
  save(filename, contents) {
    return ipcRenderer.invoke('file-export:save', String(filename), String(contents));
  }
});

contextBridge.exposeInMainWorld('electronMods', {
  getSession() {
    return ipcRenderer.sendSync('mods:get-session');
  }
});

contextBridge.exposeInMainWorld('electronStartup', {
  getSelection() {
    return ipcRenderer.sendSync('startup:get-selection');
  }
});

contextBridge.exposeInMainWorld('steamAchievements', {
  activate(id) {
    ipcRenderer.send('steam-achievements:activate', String(id));
  },
  syncUnlocked(ids) {
    ipcRenderer.send('steam-achievements:syncUnlocked', ids.map((id) => String(id)));
  }
});

contextBridge.exposeInMainWorld('electronWindowControls', {
  getWindowState() {
    return ipcRenderer.sendSync('window:get-state');
  },
  isFullscreen() {
    return ipcRenderer.invoke('window:is-fullscreen');
  },
  setFullscreen(enabled) {
    return ipcRenderer.invoke('window:set-fullscreen', enabled === true);
  },
  setFullscreenKeybind(code) {
    return ipcRenderer.invoke('window:set-fullscreen-keybind', String(code));
  },
  captureFullscreenKeybind() {
    return ipcRenderer.invoke('window:capture-fullscreen-keybind');
  },
  setZoomFactor(scale) {
    return ipcRenderer.invoke('window:set-zoom-factor', Number(scale));
  },
  exitGame() {
    ipcRenderer.send('window:exit-game');
  },
  exitToLauncher() {
    ipcRenderer.send('window:exit-to-launcher');
  },
  onFullscreenChanged(callback) {
    ipcRenderer.on('window:fullscreen-changed', (_event, enabled) => {
      callback(enabled === true);
    });
  }
});
