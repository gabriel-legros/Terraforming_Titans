let settingsElements = null;
let pauseKeybindCaptureActive = false;

function cacheSettingsElements() {
  if (settingsElements) {
    return settingsElements;
  }

  settingsElements = {
    autosaveIntervalSelect: document.getElementById('autosave-interval-select'),
    keepTabRunningAudioToggle: document.getElementById('keep-tab-running-audio-toggle'),
    whiteNoiseTooltip: document.getElementById('white-noise-tooltip'),
    terraformingSubstepsToggle: document.getElementById('terraforming-substeps-toggle'),
    celsiusToggle: document.getElementById('celsius-toggle'),
    silenceToggle: document.getElementById('solis-silence-toggle'),
    milestoneToggle: document.getElementById('milestone-silence-toggle'),
    showSpaceStorageInDefaultPanelToggle: document.getElementById('show-space-storage-in-default-panel-toggle'),
    unlockToggle: document.getElementById('unlock-alert-toggle'),
    dayNightToggle: document.getElementById('day-night-toggle'),
    dayNightTooltip: document.getElementById('day-night-tooltip'),
    darkModeToggle: document.getElementById('dark-mode-toggle'),
    preserveAutoStartToggle: document.getElementById('preserve-project-auto-start-toggle'),
    preserveAutoStartTooltip: document.getElementById('preserve-project-auto-start-tooltip'),
    preserveProjectSettingsToggle: document.getElementById('preserve-project-settings-toggle'),
    keepHiddenStructuresToggle: document.getElementById('keep-hidden-structures-toggle'),
    keepHiddenStructuresTooltip: document.getElementById('keep-hidden-structures-tooltip'),
    keepHiddenResearchToggle: document.getElementById('keep-hidden-research-toggle'),
    keepHiddenResearchTooltip: document.getElementById('keep-hidden-research-tooltip'),
    noSpecializationWarningOnTravelToggle: document.getElementById('no-specialization-warning-on-travel-toggle'),
    noSpecializationWarningOnTravelTooltip: document.getElementById('no-specialization-warning-on-travel-tooltip'),
    autobuildSetActiveToggle: document.getElementById('autobuild-set-active-toggle'),
    colonyUpgradeUncheckAutobuildToggle: document.getElementById('colony-upgrade-uncheck-autobuild-toggle'),
    roundBuildingToggle: document.getElementById('round-building-toggle'),
    roundBuildingTooltip: document.getElementById('round-building-tooltip'),
    scientificNotationThresholdInput: document.getElementById('scientific-notation-threshold-input'),
    scientificNotationTooltip: document.getElementById('scientific-notation-tooltip'),
    simplifyGoldenAsteroidToggle: document.getElementById('simplify-golden-asteroid-toggle'),
    simplifyGoldenAsteroidTooltip: document.getElementById('simplify-golden-asteroid-tooltip'),
    suppressFaithToggle: document.getElementById('suppress-faith-toggle'),
    disableFusionConsumptionScalingToggle: document.getElementById('disable-fusion-consumption-scaling-toggle'),
    suppressFaithTooltip: document.getElementById('suppress-faith-tooltip'),
    preserveProjectSettingsTooltip: document.getElementById('preserve-project-settings-tooltip'),
    terraformingSubstepsTooltip: document.getElementById('terraforming-substeps-tooltip'),
    startBackgroundSilenceButton: document.getElementById('start-background-silence-button'),
    pauseButton: document.getElementById('pause-button'),
    pauseKeybindCaptureButton: document.getElementById('pause-keybind-capture-button'),
  };

  return settingsElements;
}

function getPauseKeybindButtonLabel() {
  const current = getPauseKeybindDisplay();
  return t('ui.settings.pauseKeybindCaptureButton', { keybind: current }, `Capture key (${current})`);
}

function updatePauseKeybindButtons() {
  const cached = cacheSettingsElements();
  if (!cached.pauseKeybindCaptureButton) {
    return;
  }
  if (pauseKeybindCaptureActive) {
    cached.pauseKeybindCaptureButton.textContent = t('ui.settings.pauseKeybindCapturing', {}, 'Press any key...');
    return;
  }
  cached.pauseKeybindCaptureButton.textContent = getPauseKeybindButtonLabel();
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

  if (cached.whiteNoiseTooltip) {
    attachDynamicInfoTooltip(
      cached.whiteNoiseTooltip,
      t(
        'ui.settings.whiteNoiseTooltip',
        {},
        'After your first click or keypress it plays a quiet white noise loop to prevent the browser from throttling background execution. Much more quiet on Firefox. May still work even if the tab is muted.'
      )
    );
  }

  if (cached.terraformingSubstepsToggle) {
    cached.terraformingSubstepsToggle.checked = gameSettings.enableTerraformingSubsteps;
    cached.terraformingSubstepsToggle.addEventListener('change', () => {
      gameSettings.enableTerraformingSubsteps = cached.terraformingSubstepsToggle.checked;
    });
  }

  if (cached.terraformingSubstepsTooltip) {
    attachDynamicInfoTooltip(
      cached.terraformingSubstepsTooltip,
      t(
        'ui.settings.terraformingSubstepsTooltip',
        {},
        'By default, the climate model runs on a 10ms tick basis, instead of using the full time delta.  You can turn this off to improve performance, but decrease numerical stability of the climate model.'
      )
    );
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

  if (cached.dayNightTooltip) {
    attachDynamicInfoTooltip(
      cached.dayNightTooltip,
      t(
        'ui.settings.dayNightTooltip',
        {},
        'Stops time of day changes. Solar Panels and Ice Harvesters run at half efficiency and half maintenance. Leads to a more realistic, slightly easier and more relaxed experience.'
      )
    );
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

  if (cached.preserveAutoStartTooltip) {
    attachDynamicInfoTooltip(
      cached.preserveAutoStartTooltip,
      t(
        'ui.settings.preserveProjectAutoStartTooltip',
        {},
        'Keeps project auto-start selections when travelling.'
      )
    );
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

  if (cached.keepHiddenStructuresTooltip) {
    attachDynamicInfoTooltip(
      cached.keepHiddenStructuresTooltip,
      t(
        'ui.settings.keepHiddenBuildingsTooltip',
        {},
        'Keeps buildings you hide hidden after travelling to another world instead of revealing them when you arrive.'
      )
    );
  }

  if (cached.keepHiddenResearchToggle) {
    cached.keepHiddenResearchToggle.checked = gameSettings.keepHiddenResearchOnTravel;
    cached.keepHiddenResearchToggle.addEventListener('change', () => {
      gameSettings.keepHiddenResearchOnTravel = cached.keepHiddenResearchToggle.checked;
    });
  }

  if (cached.keepHiddenResearchTooltip) {
    attachDynamicInfoTooltip(
      cached.keepHiddenResearchTooltip,
      t(
        'ui.settings.keepHiddenResearchOnTravelTooltip',
        {},
        'Keeps research you hide hidden after travelling to another world instead of revealing it when you arrive.'
      )
    );
  }

  if (cached.noSpecializationWarningOnTravelToggle) {
    cached.noSpecializationWarningOnTravelToggle.checked = gameSettings.noSpecializationWarningOnTravel;
    cached.noSpecializationWarningOnTravelToggle.addEventListener('change', () => {
      gameSettings.noSpecializationWarningOnTravel = cached.noSpecializationWarningOnTravelToggle.checked;
    });
  }

  if (cached.noSpecializationWarningOnTravelTooltip) {
    attachDynamicInfoTooltip(
      cached.noSpecializationWarningOnTravelTooltip,
      t(
        'ui.settings.noSpecializationWarningOnTravelTooltip',
        {},
        'When enabled, traveling away from a world with no active or completed specialization asks for confirmation.'
      )
    );
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

  if (cached.roundBuildingTooltip) {
    attachDynamicInfoTooltip(
      cached.roundBuildingTooltip,
      t(
        'ui.settings.roundBuildingConstructionTooltip',
        {},
        'When manually constructing buildings, your number of constructed buildings will round to your build count. For example, with a build count of 100 and a current amount of 157, manually building will result in 200 buildings.'
      )
    );
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

  if (cached.scientificNotationTooltip) {
    attachDynamicInfoTooltip(
      cached.scientificNotationTooltip,
      t(
        'ui.settings.scientificNotationTooltip',
        {},
        'Values at or above this threshold are displayed in scientific notation, such as 1e30.'
      )
    );
  }

  if (cached.simplifyGoldenAsteroidToggle) {
    cached.simplifyGoldenAsteroidToggle.checked = gameSettings.simplifyGoldenAsteroid;
    cached.simplifyGoldenAsteroidToggle.addEventListener('change', () => {
      gameSettings.simplifyGoldenAsteroid = cached.simplifyGoldenAsteroidToggle.checked;
    });
  }

  if (cached.simplifyGoldenAsteroidTooltip) {
    attachDynamicInfoTooltip(
      cached.simplifyGoldenAsteroidTooltip,
      t(
        'ui.settings.simplifyGoldenAsteroidTooltip',
        {},
        'When enabled, the Golden Asteroid appears as a clickable golden button where the effect text is shown, instead of a moving image on the screen.'
      )
    );
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

  if (cached.disableFusionConsumptionScalingToggle) {
    cached.disableFusionConsumptionScalingToggle.checked = gameSettings.disableFusionConsumptionScaling;
    cached.disableFusionConsumptionScalingToggle.addEventListener('change', () => {
      gameSettings.disableFusionConsumptionScaling = cached.disableFusionConsumptionScalingToggle.checked;
      for (const key in structures) {
        const structure = structures[key];
        if (structure && structure.reconcileConditionalEffects) {
          structure.reconcileConditionalEffects();
        }
      }
      if (globalEffects.reconcileConditionalEffects) {
        globalEffects.reconcileConditionalEffects();
      }
      if (researchManager && researchManager.reapplyEffects) {
        researchManager.reapplyEffects();
      }
      if (skillManager && skillManager.reapplyEffects) {
        skillManager.reapplyEffects();
      }
      if (solisManager && solisManager.reapplyEffects) {
        solisManager.reapplyEffects();
      }
      if (warpGateCommand && warpGateCommand.reapplyEffects) {
        warpGateCommand.reapplyEffects();
      }
      if (patienceManager && patienceManager.reapplyEffects) {
        patienceManager.reapplyEffects();
      }
      if (followersManager && followersManager.reapplyEffects) {
        followersManager.reapplyEffects();
      }
      if (atlasManager && atlasManager.reapplyEffects) {
        atlasManager.reapplyEffects();
      }
      if (galaxyInvasionManager && galaxyInvasionManager.reapplyEffects) {
        galaxyInvasionManager.reapplyEffects();
      }
      if (nanotechManager && nanotechManager.reapplyEffects) {
        nanotechManager.reapplyEffects();
      }
    });
  }

  if (cached.startBackgroundSilenceButton) {
    cached.startBackgroundSilenceButton.addEventListener('click', () => {
      startBackgroundSilence();
    });
  }

  if (cached.pauseButton) {
    if (!isGamePaused()) {
      cached.pauseButton.textContent = t(
        'ui.settings.pauseButtonLabel',
        { keybind: getPauseKeybindDisplay() },
        `Pause (${getPauseKeybindDisplay()})`
      );
    }
    cached.pauseButton.addEventListener('click', togglePause);
  }

  if (cached.pauseKeybindCaptureButton) {
    updatePauseKeybindButtons();
    cached.pauseKeybindCaptureButton.addEventListener('click', () => {
      if (pauseKeybindCaptureActive) {
        return;
      }
      pauseKeybindCaptureActive = true;
      updatePauseKeybindButtons();
      const captureKeydown = event => {
        event.preventDefault();
        event.stopPropagation();
        pauseKeybindCaptureActive = false;
        setPauseKeybindCode(event.code);
        if (!isGamePaused() && cached.pauseButton) {
          cached.pauseButton.textContent = t(
            'ui.settings.pauseButtonLabel',
            { keybind: getPauseKeybindDisplay() },
            `Pause (${getPauseKeybindDisplay()})`
          );
        }
        updatePauseKeybindButtons();
        document.removeEventListener('keydown', captureKeydown, true);
      };
      document.addEventListener('keydown', captureKeydown, true);
    });
  }

}

function initializePreferencesSettingsSubtab() {
  addSettingsListeners();
}
