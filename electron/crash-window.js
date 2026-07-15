const crashTitle = document.getElementById('crash-title');
const crashDescription = document.getElementById('crash-description');
const crashReport = document.getElementById('crash-report');
const copyLogButton = document.getElementById('copy-log-button');
const openLogFolderButton = document.getElementById('open-log-folder-button');
const continueButton = document.getElementById('continue-button');
const closeGameButton = document.getElementById('close-game-button');

crashTitle.textContent = t('ui.crashWindow.title');
crashDescription.textContent = t('ui.crashWindow.description');
copyLogButton.textContent = t('ui.crashWindow.copyLog');
openLogFolderButton.textContent = t('ui.crashWindow.openLogFolder');
continueButton.textContent = t('ui.crashWindow.continue');
closeGameButton.textContent = t('ui.crashWindow.closeGame');

window.electronCrashWindow.onReport(report => {
  crashReport.textContent = report.text;
  openLogFolderButton.disabled = !report.logPath;
});

copyLogButton.addEventListener('click', () => {
  window.electronCrashWindow.copyLog();
});

openLogFolderButton.addEventListener('click', () => {
  window.electronCrashWindow.openLogFolder();
});

continueButton.addEventListener('click', () => {
  window.electronCrashWindow.close();
});

closeGameButton.addEventListener('click', () => {
  window.electronCrashWindow.quit();
});
