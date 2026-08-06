const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modLauncher', {
  getState() {
    return ipcRenderer.invoke('mod-launcher:get-state');
  },
  launch(options) {
    return ipcRenderer.invoke('mod-launcher:launch', options);
  },
  setRunScriptsOnStart(enabled) {
    return ipcRenderer.invoke('mod-launcher:set-run-scripts-on-start', enabled === true);
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
  openCreatorTools() {
    return ipcRenderer.invoke('mod-launcher:open-creator-tools');
  },
  importSaveFile() {
    return ipcRenderer.invoke('mod-launcher:import-save-file');
  },
  importSaveClipboard() {
    return ipcRenderer.invoke('mod-launcher:import-save-clipboard');
  },
  onStateChanged(callback) {
    ipcRenderer.on('mod-launcher:state-changed', (_event, state) => callback(state));
  },
  onWorkshopChanged(callback) {
    ipcRenderer.on('mod-launcher:workshop-changed', (_event, workshop) => callback(workshop));
  }
});
