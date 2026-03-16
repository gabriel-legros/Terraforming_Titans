let settingsSubtabManager = null;

function initializeSettingsSubtabs() {
  settingsSubtabManager = new SubtabManager('.settings-subtab', '.settings-subtab-content');
  settingsSubtabManager.activate('save-settings-subtab');
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    initializeLoadingOverlay();
    initializeSettingsSubtabs();
    initializeSaveSubtab();
    initializePreferencesSettingsSubtab();
    initializeStatisticsSubtab();
    initializeCreditsSubtab();
  });
}
