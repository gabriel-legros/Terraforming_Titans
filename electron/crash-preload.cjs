const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronCrashWindow', {
  onReport(callback) {
    ipcRenderer.on('crash-window:report', (_event, report) => {
      callback(report);
    });
  },
  copyLog() {
    ipcRenderer.send('crash-window:copy');
  },
  openLogFolder() {
    ipcRenderer.send('crash-window:open-log-folder');
  },
  close() {
    ipcRenderer.send('crash-window:close');
  },
  quit() {
    ipcRenderer.send('crash-window:quit');
  }
});
