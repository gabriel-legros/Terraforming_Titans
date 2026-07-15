let settingsSubtabManager = null;

function initializeSettingsSubtabs() {
  settingsSubtabManager = new SubtabManager('.settings-subtab', '.settings-subtab-content');
  settingsSubtabManager.activate('save-settings-subtab');
}

function initializeSettingsDom() {
  initializeLoadingOverlay();
  initializeSettingsSubtabs();
  initializeSaveSubtab();
  initializePreferencesSettingsSubtab();
  initializeStatisticsSubtab();
  initializeAchievementsSubtab();
  initializeCreditsSubtab();
}
