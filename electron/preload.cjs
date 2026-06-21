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
