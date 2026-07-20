const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modLauncher', {
  getState() {
    return ipcRenderer.invoke('mod-launcher:get-state');
  },
  launch(options) {
    return ipcRenderer.invoke('mod-launcher:launch', options);
  },
  refresh() {
    return ipcRenderer.invoke('mod-launcher:refresh');
  },
  openLocalMods() {
    return ipcRenderer.invoke('mod-launcher:open-local-mods');
  },
  openWorkshop() {
    return ipcRenderer.invoke('mod-launcher:open-workshop');
  },
  onStateChanged(callback) {
    ipcRenderer.on('mod-launcher:state-changed', (_event, state) => callback(state));
  },
  onWorkshopChanged(callback) {
    ipcRenderer.on('mod-launcher:workshop-changed', (_event, workshop) => callback(workshop));
  }
});
