const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modCreator', {
  getState() {
    return ipcRenderer.invoke('mod-creator:get-state');
  },
  refresh() {
    return ipcRenderer.invoke('mod-creator:refresh');
  },
  choosePreview(instanceId) {
    return ipcRenderer.invoke('mod-creator:choose-preview', instanceId);
  },
  clearPreview(instanceId) {
    return ipcRenderer.invoke('mod-creator:clear-preview', instanceId);
  },
  publish(details) {
    return ipcRenderer.invoke('mod-creator:publish', details);
  },
  openModFolder(instanceId) {
    return ipcRenderer.invoke('mod-creator:open-mod-folder', instanceId);
  },
  openWorkshopItem(workshopId) {
    return ipcRenderer.invoke('mod-creator:open-workshop-item', workshopId);
  },
  openWorkshop() {
    return ipcRenderer.invoke('mod-creator:open-workshop');
  },
  openTerms() {
    return ipcRenderer.invoke('mod-creator:open-terms');
  },
  onStateChanged(callback) {
    ipcRenderer.on('mod-creator:state-changed', (_event, state) => callback(state));
  },
  onProgress(callback) {
    ipcRenderer.on('mod-creator:progress', (_event, progress) => callback(progress));
  }
});
