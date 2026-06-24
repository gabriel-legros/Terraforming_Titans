const { contextBridge, ipcRenderer } = require('electron');

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

contextBridge.exposeInMainWorld('steamAchievements', {
  activate(id) {
    ipcRenderer.send('steam-achievements:activate', String(id));
  },
  syncUnlocked(ids) {
    ipcRenderer.send('steam-achievements:syncUnlocked', ids.map((id) => String(id)));
  }
});

contextBridge.exposeInMainWorld('electronWindowControls', {
  isFullscreen() {
    return ipcRenderer.invoke('window:is-fullscreen');
  },
  setFullscreen(enabled) {
    return ipcRenderer.invoke('window:set-fullscreen', enabled === true);
  },
  exitGame() {
    ipcRenderer.send('window:exit-game');
  },
  onFullscreenChanged(callback) {
    ipcRenderer.on('window:fullscreen-changed', (_event, enabled) => {
      callback(enabled === true);
    });
  }
});
