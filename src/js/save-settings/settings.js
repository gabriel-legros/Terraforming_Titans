let settingsSubtabManager = null;

const LEGACY_GAME_SETTING_DEFAULTS = {
  showSpaceStorageResources: false,
  enableTerraformingSubsteps: true,
  showSpaceStorageInDefaultPanel: false,
  showNetResourceRateWithAutobuild: false,
  highlightFullResourceCaps: false,
  resourceDepletionWarningSeconds: 120,
  autoPauseEnergyEnabled: false,
  autoPauseEnergyThreshold: 0,
  autoPauseColonistsEnabled: false,
  autoPauseColonistsThreshold: 0,
  immigrationPool: false,
  disableColonistDecay: false,
  pauseKeybind: 'Space',
  dialogueSkipKeybind: 'NumpadAdd',
  fullscreenKeybind: 'F11',
  noSpecializationWarningOnTravel: false,
  alwaysDisableAutomationOnLoad: false,
  disableFusionConsumptionScaling: false,
  disableSpeedControls: false,
  unfulfilledMaintenancePenalties: false,
  earlyAdvancedOversight: false,
  phaseChangeHeat: false,
  factoryHeating: false,
  realisticFactoryEnergyConsumption: false,
  infinitePatience: false,
  liftersStrippingCap: false,
  orbitalCap: false,
  allowSpaceStorageBiomassWithdrawOnNonHumanDominion: false,
  noOverpopulationCylinders: false,
  colorblindPalette: 'redGreen',
  uiScale: 1,
  difficultySettingsLocked: false,
  difficultySettingsLockedWorldKey: '',
  difficultySettingsLockedWorldName: '',
};

function loadGameSettings(savedSettings) {
  resetDifficultySettings();
  if (!savedSettings) {
    return;
  }

  Object.assign(gameSettings, savedSettings);
  if (!Object.prototype.hasOwnProperty.call(savedSettings, 'autosaveIntervalSeconds')) {
    gameSettings.autosaveIntervalSeconds = savedSettings.disableAutosave ? 0 : 300;
  }
  for (const settingId in LEGACY_GAME_SETTING_DEFAULTS) {
    if (!Object.prototype.hasOwnProperty.call(savedSettings, settingId)) {
      gameSettings[settingId] = LEGACY_GAME_SETTING_DEFAULTS[settingId];
    }
  }
  if (!Object.prototype.hasOwnProperty.call(savedSettings, 'themeMode')) {
    gameSettings.themeMode = gameSettings.darkMode ? 'darkBlue' : 'light';
  }

  setAutosaveIntervalSeconds(gameSettings.autosaveIntervalSeconds);
  applyGameFramerateSetting();
  delete gameSettings.disableAutosave;
  normalizeDifficultySettings();
  reapplySharedManagerEffects({ includeConditionalReconcile: true });
  setPauseKeybindCode(gameSettings.pauseKeybind);
  setDialogueSkipKeybindCode(gameSettings.dialogueSkipKeybind);
  setFullscreenKeybindCode(gameSettings.fullscreenKeybind);
  applySpeedControlsSetting();
  resetAutoPauseRateTracking();
  applyColorblindPaletteSettings();
  if (gameSettings.showSpaceStorageInDefaultPanel) {
    gameSettings.showSpaceStorageResources = false;
  }
  delete gameSettings.formatAutoBuildTargets;

  const cachedSettings = cacheSettingsElements();
  cachedSettings.autosaveIntervalSelect.value = String(getAutosaveIntervalSeconds());
  cachedSettings.framerateSelect.value = String(getGameFramerate());
  if (!GAME_FEATURES.whiteNoiseKeepAlive) {
    gameSettings.keepTabRunningAudio = false;
  }
  cachedSettings.keepTabRunningAudioToggle.checked = gameSettings.keepTabRunningAudio;
  cachedSettings.terraformingSubstepsToggle.checked = gameSettings.enableTerraformingSubsteps;
  cachedSettings.celsiusToggle.checked = gameSettings.useCelsius;
  cachedSettings.colorblindPaletteSelect.value = getColorblindPaletteKey();

  const debugEnabled = !!gameSettings.planetVisualizerDebugEnabled;
  planetVisualizerDebugEnabled = debugEnabled;
  if (planetVisualizer && planetVisualizer.setDebugMode) {
    planetVisualizer.setDebugMode(debugEnabled, { skipPersist: true });
  }

  cachedSettings.silenceToggle.checked = gameSettings.silenceSolisAlert;
  cachedSettings.milestoneToggle.checked = gameSettings.silenceMilestoneAlert;
  cachedSettings.showSpaceStorageInDefaultPanelToggle.checked = gameSettings.showSpaceStorageInDefaultPanel;
  cachedSettings.netResourceRateDisplayToggle.checked = gameSettings.showNetResourceRateWithAutobuild;
  cachedSettings.highlightFullResourceCapsToggle.checked = gameSettings.highlightFullResourceCaps;
  cachedSettings.resourceDepletionWarningSecondsInput.value = String(gameSettings.resourceDepletionWarningSeconds);
  cachedSettings.resourceDepletionWarningSecondsInput.dataset.resourceDepletionWarningSeconds = String(gameSettings.resourceDepletionWarningSeconds);
  cachedSettings.autoPauseEnergyToggle.checked = gameSettings.autoPauseEnergyEnabled;
  cachedSettings.autoPauseEnergyThresholdInput.value = String(formatNumber(gameSettings.autoPauseEnergyThreshold, false, 3, true));
  cachedSettings.autoPauseEnergyThresholdInput.dataset.autoPauseEnergyThreshold = String(gameSettings.autoPauseEnergyThreshold);
  cachedSettings.autoPauseColonistsToggle.checked = gameSettings.autoPauseColonistsEnabled;
  cachedSettings.autoPauseColonistsThresholdInput.value = String(formatNumber(gameSettings.autoPauseColonistsThreshold, false, 3, true));
  cachedSettings.autoPauseColonistsThresholdInput.dataset.autoPauseColonistsThreshold = String(gameSettings.autoPauseColonistsThreshold);
  cachedSettings.immigrationPoolToggle.checked = gameSettings.immigrationPool;
  cachedSettings.disableColonistDecayToggle.checked = gameSettings.disableColonistDecay;
  cachedSettings.unlockToggle.checked = gameSettings.silenceUnlockAlert;
  cachedSettings.dayNightToggle.checked = gameSettings.disableDayNightCycle;
  applyThemeModeSetting();
  applyElectronUIScaleSetting();
  cachedSettings.preserveAutoStartToggle.checked = gameSettings.preserveProjectAutoStart;
  cachedSettings.preserveProjectSettingsToggle.checked = gameSettings.preserveProjectSettingsOnTravel;
  cachedSettings.keepHiddenStructuresToggle.checked = gameSettings.keepHiddenStructuresOnTravel;
  cachedSettings.keepHiddenResearchToggle.checked = gameSettings.keepHiddenResearchOnTravel;
  cachedSettings.noSpecializationWarningOnTravelToggle.checked = gameSettings.noSpecializationWarningOnTravel;
  cachedSettings.autobuildSetActiveToggle.checked = gameSettings.autobuildAlsoSetsActive;
  cachedSettings.colonyUpgradeUncheckAutobuildToggle.checked = gameSettings.colonyUpgradeUnchecksAutobuild;
  cachedSettings.autobuildIgnoreAutoUpgradeColoniesToggle.checked = gameSettings.autobuildIgnoreAutoUpgradeColonies;
  cachedSettings.roundBuildingToggle.checked = gameSettings.roundBuildingConstruction;
  cachedSettings.scientificNotationThresholdInput.value = formatScientific(gameSettings.scientificNotationThreshold ?? 1e30);
  cachedSettings.scientificNotationThresholdInput.dataset.scientificNotationThreshold = String(gameSettings.scientificNotationThreshold ?? 1e30);
  cachedSettings.simplifyGoldenAsteroidToggle.checked = gameSettings.simplifyGoldenAsteroid;
  cachedSettings.suppressFaithToggle.checked = gameSettings.suppressFaith;
  cachedSettings.disableFusionConsumptionScalingToggle.checked = gameSettings.disableFusionConsumptionScaling;
  cachedSettings.disableSpeedControlsToggle.checked = gameSettings.disableSpeedControls;
  cachedSettings.unfulfilledMaintenancePenaltiesToggle.checked = gameSettings.unfulfilledMaintenancePenalties;
  cachedSettings.earlyAdvancedOversightToggle.checked = gameSettings.earlyAdvancedOversight;
  cachedSettings.phaseChangeHeatToggle.checked = gameSettings.phaseChangeHeat;
  cachedSettings.factoryHeatingToggle.checked = gameSettings.factoryHeating;
  cachedSettings.realisticFactoryEnergyConsumptionToggle.checked = gameSettings.realisticFactoryEnergyConsumption;
  cachedSettings.infinitePatienceToggle.checked = gameSettings.infinitePatience;
  cachedSettings.liftersStrippingCapToggle.checked = gameSettings.liftersStrippingCap;
  cachedSettings.orbitalCapToggle.checked = gameSettings.orbitalCap;
  cachedSettings.noOverpopulationCylindersToggle.checked = gameSettings.noOverpopulationCylinders;
  patienceManager.enforceInfinitePatience();
  updateDifficultySettingInputs();
  updatePauseKeybindButtons();
  updateDialogueSkipKeybindButtons();
  updateFullscreenKeybindButtons();
  if (followersManager && followersManager.reapplyEffects) {
    followersManager.reapplyEffects();
  }
  if (GAME_FEATURES.whiteNoiseKeepAlive && gameSettings.keepTabRunningAudio) {
    startBackgroundSilence();
  } else {
    stopBackgroundSilence();
  }
  refreshAllAutoBuildTargets();
  updateAutosaveText();
  completedResearchHidden = gameSettings.hideCompletedResearch || false;
  if (!globalGameIsLoadingFromSave) {
    updateAllResearchButtons(researchManager.researches);
    updateCompletedResearchVisibility();
    createResourceDisplay(resources);
  }
}

function initializeSettingsSubtabs() {
  if (settingsSubtabManager) {
    settingsSubtabManager.reset();
  } else {
    settingsSubtabManager = new SubtabManager('.settings-subtab', '.settings-subtab-content');
  }
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
