let settingsElements = null;

function cacheSettingsElements() {
  if (settingsElements) {
    return settingsElements;
  }

  settingsElements = {
    autosaveIntervalSelect: document.getElementById('autosave-interval-select'),
    keepTabRunningAudioToggle: document.getElementById('keep-tab-running-audio-toggle'),
    celsiusToggle: document.getElementById('celsius-toggle'),
    silenceToggle: document.getElementById('solis-silence-toggle'),
    milestoneToggle: document.getElementById('milestone-silence-toggle'),
    showSpaceStorageInDefaultPanelToggle: document.getElementById('show-space-storage-in-default-panel-toggle'),
    unlockToggle: document.getElementById('unlock-alert-toggle'),
    dayNightToggle: document.getElementById('day-night-toggle'),
    darkModeToggle: document.getElementById('dark-mode-toggle'),
    preserveAutoStartToggle: document.getElementById('preserve-project-auto-start-toggle'),
    preserveProjectSettingsToggle: document.getElementById('preserve-project-settings-toggle'),
    keepHiddenStructuresToggle: document.getElementById('keep-hidden-structures-toggle'),
    autobuildSetActiveToggle: document.getElementById('autobuild-set-active-toggle'),
    colonyUpgradeUncheckAutobuildToggle: document.getElementById('colony-upgrade-uncheck-autobuild-toggle'),
    roundBuildingToggle: document.getElementById('round-building-toggle'),
    scientificNotationThresholdInput: document.getElementById('scientific-notation-threshold-input'),
    simplifyGoldenAsteroidToggle: document.getElementById('simplify-golden-asteroid-toggle'),
    suppressFaithToggle: document.getElementById('suppress-faith-toggle'),
    suppressFaithTooltip: document.getElementById('suppress-faith-tooltip'),
    preserveProjectSettingsTooltip: document.getElementById('preserve-project-settings-tooltip'),
    startBackgroundSilenceButton: document.getElementById('start-background-silence-button'),
    pauseButton: document.getElementById('pause-button'),
  };

  return settingsElements;
}

function addSettingsListeners() {
  const cached = cacheSettingsElements();

  if (cached.autosaveIntervalSelect) {
    cached.autosaveIntervalSelect.value = String(getAutosaveIntervalSeconds());
    cached.autosaveIntervalSelect.addEventListener('change', () => {
      setAutosaveIntervalSeconds(Number(cached.autosaveIntervalSelect.value));
      updateAutosaveText();
    });
  }

  if (cached.keepTabRunningAudioToggle) {
    cached.keepTabRunningAudioToggle.checked = gameSettings.keepTabRunningAudio;
    cached.keepTabRunningAudioToggle.addEventListener('pointerdown', () => {
      if (!cached.keepTabRunningAudioToggle.checked) {
        startBackgroundSilence();
      }
    });
    cached.keepTabRunningAudioToggle.addEventListener('change', () => {
      gameSettings.keepTabRunningAudio = cached.keepTabRunningAudioToggle.checked;
      if (gameSettings.keepTabRunningAudio) {
        startBackgroundSilence();
      } else {
        stopBackgroundSilence();
      }
    });
  }

  if (cached.celsiusToggle) {
    cached.celsiusToggle.checked = gameSettings.useCelsius;
    cached.celsiusToggle.addEventListener('change', () => {
      gameSettings.useCelsius = cached.celsiusToggle.checked;
      updateTerraformingUI();
      if (typeof updateBuildingDisplay === 'function') {
        updateBuildingDisplay(buildings);
      }
    });
  }

  if (cached.silenceToggle) {
    cached.silenceToggle.checked = gameSettings.silenceSolisAlert;
    cached.silenceToggle.addEventListener('change', () => {
      gameSettings.silenceSolisAlert = cached.silenceToggle.checked;
      updateHopeAlert();
    });
  }

  if (cached.showSpaceStorageInDefaultPanelToggle) {
    cached.showSpaceStorageInDefaultPanelToggle.checked = gameSettings.showSpaceStorageInDefaultPanel;
    cached.showSpaceStorageInDefaultPanelToggle.addEventListener('change', () => {
      gameSettings.showSpaceStorageInDefaultPanel = cached.showSpaceStorageInDefaultPanelToggle.checked;
      if (gameSettings.showSpaceStorageInDefaultPanel) {
        gameSettings.showSpaceStorageResources = false;
      }
      createResourceDisplay(resources);
    });
  }

  if (cached.unlockToggle) {
    cached.unlockToggle.checked = gameSettings.silenceUnlockAlert;
    cached.unlockToggle.addEventListener('change', () => {
      gameSettings.silenceUnlockAlert = cached.unlockToggle.checked;
      if (typeof updateBuildingAlert === 'function') updateBuildingAlert();
      if (typeof updateProjectAlert === 'function') updateProjectAlert();
    });
  }

  if (cached.dayNightToggle) {
    cached.dayNightToggle.checked = gameSettings.disableDayNightCycle;
    cached.dayNightToggle.addEventListener('change', () => {
      gameSettings.disableDayNightCycle = cached.dayNightToggle.checked;
      if (typeof applyDayNightSettingEffects === 'function') applyDayNightSettingEffects();
      updateDayNightDisplay();
      if (typeof updateBuildingDisplay === 'function') {
        updateBuildingDisplay(buildings);
      }
    });
  }

  if (cached.darkModeToggle) {
    cached.darkModeToggle.checked = gameSettings.darkMode;
    document.body.classList.toggle('dark-mode', gameSettings.darkMode);
    cached.darkModeToggle.addEventListener('change', () => {
      gameSettings.darkMode = cached.darkModeToggle.checked;
      document.body.classList.toggle('dark-mode', gameSettings.darkMode);
    });
  }

  if (cached.preserveAutoStartToggle) {
    cached.preserveAutoStartToggle.checked = gameSettings.preserveProjectAutoStart;
    cached.preserveAutoStartToggle.addEventListener('change', () => {
      gameSettings.preserveProjectAutoStart = cached.preserveAutoStartToggle.checked;
    });
  }

  if (cached.preserveProjectSettingsToggle) {
    cached.preserveProjectSettingsToggle.checked = gameSettings.preserveProjectSettingsOnTravel;
    cached.preserveProjectSettingsToggle.addEventListener('change', () => {
      gameSettings.preserveProjectSettingsOnTravel = cached.preserveProjectSettingsToggle.checked;
    });
  }

  if (cached.preserveProjectSettingsTooltip) {
    attachDynamicInfoTooltip(
      cached.preserveProjectSettingsTooltip,
      'Keeps most project settings when travelling, including import disable limits, Space Mirror Facility oversight settings, and resource disposal selections. On World 11, a much more powerful version of this setting will be available.'
    );
  }

  if (cached.keepHiddenStructuresToggle) {
    cached.keepHiddenStructuresToggle.checked = gameSettings.keepHiddenStructuresOnTravel;
    cached.keepHiddenStructuresToggle.addEventListener('change', () => {
      gameSettings.keepHiddenStructuresOnTravel = cached.keepHiddenStructuresToggle.checked;
    });
  }

  if (cached.autobuildSetActiveToggle) {
    cached.autobuildSetActiveToggle.checked = gameSettings.autobuildAlsoSetsActive;
    cached.autobuildSetActiveToggle.addEventListener('change', () => {
      gameSettings.autobuildAlsoSetsActive = cached.autobuildSetActiveToggle.checked;
    });
  }

  if (cached.colonyUpgradeUncheckAutobuildToggle) {
    cached.colonyUpgradeUncheckAutobuildToggle.checked = gameSettings.colonyUpgradeUnchecksAutobuild;
    cached.colonyUpgradeUncheckAutobuildToggle.addEventListener('change', () => {
      gameSettings.colonyUpgradeUnchecksAutobuild = cached.colonyUpgradeUncheckAutobuildToggle.checked;
    });
  }

  if (cached.roundBuildingToggle) {
    cached.roundBuildingToggle.checked = gameSettings.roundBuildingConstruction;
    cached.roundBuildingToggle.addEventListener('change', () => {
      gameSettings.roundBuildingConstruction = cached.roundBuildingToggle.checked;
      updateBuildingDisplay(buildings);
      updateColonyDisplay(colonies);
    });
  }

  if (cached.scientificNotationThresholdInput) {
    cached.scientificNotationThresholdInput.value = formatScientific(gameSettings.scientificNotationThreshold ?? 1e30);
    const thresholdWire = wireStringNumberInput(cached.scientificNotationThresholdInput, {
      parseValue: value => {
        const parsed = parseFlexibleNumber(value);
        return Math.max(1, parsed || 0);
      },
      formatValue: value => formatScientific(value),
      onValue: parsed => {
        gameSettings.scientificNotationThreshold = parsed;
      },
      datasetKey: 'scientificNotationThreshold',
    });
    thresholdWire.syncParsedValue();
  }

  if (cached.simplifyGoldenAsteroidToggle) {
    cached.simplifyGoldenAsteroidToggle.checked = gameSettings.simplifyGoldenAsteroid;
    cached.simplifyGoldenAsteroidToggle.addEventListener('change', () => {
      gameSettings.simplifyGoldenAsteroid = cached.simplifyGoldenAsteroidToggle.checked;
    });
  }

  if (cached.suppressFaithTooltip) {
    attachDynamicInfoTooltip(
      cached.suppressFaithTooltip,
      'The game has a faith system.  Some people do not like it.  You can choose to get rid of it, but you will forfeit its benefits.'
    );
  }

  if (cached.suppressFaithToggle) {
    cached.suppressFaithToggle.checked = gameSettings.suppressFaith;
    cached.suppressFaithToggle.addEventListener('change', () => {
      gameSettings.suppressFaith = cached.suppressFaithToggle.checked;
      if (followersManager && followersManager.reapplyEffects) {
        followersManager.reapplyEffects();
      }
    });
  }

  if (cached.startBackgroundSilenceButton) {
    cached.startBackgroundSilenceButton.addEventListener('click', () => {
      startBackgroundSilence();
    });
  }

  if (cached.pauseButton) {
    cached.pauseButton.addEventListener('click', togglePause);
  }
}

function initializePreferencesSettingsSubtab() {
  addSettingsListeners();
}
