let settingsElements = null;
let pauseKeybindCaptureActive = false;
let dialogueSkipKeybindCaptureActive = false;

function cacheSettingsElements() {
  if (settingsElements) {
    return settingsElements;
  }

  settingsElements = {
    autosaveIntervalSelect: document.getElementById('autosave-interval-select'),
    whiteNoiseOption: document.getElementById('white-noise-settings-option'),
    keepTabRunningAudioToggle: document.getElementById('keep-tab-running-audio-toggle'),
    whiteNoiseTooltip: document.getElementById('white-noise-tooltip'),
    electronFullscreenOption: document.getElementById('electron-fullscreen-settings-option'),
    electronFullscreenToggle: document.getElementById('electron-fullscreen-toggle'),
    terraformingSubstepsToggle: document.getElementById('terraforming-substeps-toggle'),
    celsiusToggle: document.getElementById('celsius-toggle'),
    colorblindPaletteSelect: document.getElementById('colorblind-palette-select'),
    silenceToggle: document.getElementById('solis-silence-toggle'),
    milestoneToggle: document.getElementById('milestone-silence-toggle'),
    showSpaceStorageInDefaultPanelToggle: document.getElementById('show-space-storage-in-default-panel-toggle'),
    netResourceRateDisplayToggle: document.getElementById('net-resource-rate-display-toggle'),
    immigrationPoolToggle: document.getElementById('immigration-pool-toggle'),
    immigrationPoolTooltip: document.getElementById('immigration-pool-tooltip'),
    unlockToggle: document.getElementById('unlock-alert-toggle'),
    dayNightToggle: document.getElementById('day-night-toggle'),
    dayNightTooltip: document.getElementById('day-night-tooltip'),
    darkModeSelect: document.getElementById('dark-mode-select'),
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
    disableFusionConsumptionScalingTooltip: document.getElementById('disable-fusion-consumption-scaling-tooltip'),
    disableSpeedControlsToggle: document.getElementById('disable-speed-controls-toggle'),
    disableSpeedControlsTooltip: document.getElementById('disable-speed-controls-tooltip'),
    unfulfilledMaintenancePenaltiesToggle: document.getElementById('unfulfilled-maintenance-penalties-toggle'),
    unfulfilledMaintenancePenaltiesTooltip: document.getElementById('unfulfilled-maintenance-penalties-tooltip'),
    earlyAdvancedOversightToggle: document.getElementById('early-advanced-oversight-toggle'),
    earlyAdvancedOversightTooltip: document.getElementById('early-advanced-oversight-tooltip'),
    factoryHeatingToggle: document.getElementById('factory-heating-toggle'),
    factoryHeatingTooltip: document.getElementById('factory-heating-tooltip'),
    realisticFactoryEnergyConsumptionToggle: document.getElementById('realistic-factory-energy-consumption-toggle'),
    realisticFactoryEnergyConsumptionTooltip: document.getElementById('realistic-factory-energy-consumption-tooltip'),
    infinitePatienceToggle: document.getElementById('infinite-patience-toggle'),
    liftersStrippingCapToggle: document.getElementById('lifters-stripping-cap-toggle'),
    liftersStrippingCapTooltip: document.getElementById('lifters-stripping-cap-tooltip'),
    orbitalCapToggle: document.getElementById('orbital-cap-toggle'),
    orbitalCapTooltip: document.getElementById('orbital-cap-tooltip'),
    noOverpopulationCylindersToggle: document.getElementById('no-overpopulation-cylinders-toggle'),
    noOverpopulationCylindersTooltip: document.getElementById('no-overpopulation-cylinders-tooltip'),
    buildingCostMultiplierInput: document.getElementById('building-cost-multiplier-input'),
    researchCostMultiplierInput: document.getElementById('research-cost-multiplier-input'),
    workerRequirementMultiplierInput: document.getElementById('worker-requirement-multiplier-input'),
    projectDurationMultiplierInput: document.getElementById('project-duration-multiplier-input'),
    popGrowthMultiplierInput: document.getElementById('pop-growth-multiplier-input'),
    lifeGrowthMultiplierInput: document.getElementById('life-growth-multiplier-input'),
    maintenanceCostMultiplierInput: document.getElementById('maintenance-cost-multiplier-input'),
    spaceshipEnergyBeforeSpaceElevatorMultiplierInput: document.getElementById('spaceship-energy-before-space-elevator-multiplier-input'),
    spaceshipEnergyBeforeSpaceElevatorTooltip: document.getElementById('spaceship-energy-before-space-elevator-tooltip'),
    spaceshipEnergyAfterSpaceElevatorMultiplierInput: document.getElementById('spaceship-energy-after-space-elevator-multiplier-input'),
    spaceshipEnergyAfterSpaceElevatorTooltip: document.getElementById('spaceship-energy-after-space-elevator-tooltip'),
    advancedResearchMultiplierInput: document.getElementById('advanced-research-multiplier-input'),
    skillPointsGainMultiplierInput: document.getElementById('skill-points-gain-multiplier-input'),
    galaxyFleetCapacityMultiplierInput: document.getElementById('galaxy-fleet-capacity-multiplier-input'),
    galaxyThreatScalingMultiplierInput: document.getElementById('galaxy-threat-scaling-multiplier-input'),
    galaxyThreatScalingTooltip: document.getElementById('galaxy-threat-scaling-tooltip'),
    invasionMultiplierInput: document.getElementById('invasion-multiplier-input'),
    invasionMultiplierTooltip: document.getElementById('invasion-multiplier-tooltip'),
    artificialWorldConstructionTimeMultiplierInput: document.getElementById('artificial-world-construction-time-multiplier-input'),
    rwgRewardsCapInput: document.getElementById('rwg-rewards-cap-input'),
    rwgRewardsCapTooltip: document.getElementById('rwg-rewards-cap-tooltip'),
    lockDifficultySettingsButton: document.getElementById('lock-difficulty-settings-button'),
    difficultyLockStatus: document.getElementById('difficulty-lock-status'),
    suppressFaithTooltip: document.getElementById('suppress-faith-tooltip'),
    preserveProjectSettingsTooltip: document.getElementById('preserve-project-settings-tooltip'),
    terraformingSubstepsTooltip: document.getElementById('terraforming-substeps-tooltip'),
    startBackgroundSilenceButton: document.getElementById('start-background-silence-button'),
    pauseButton: document.getElementById('pause-button'),
    electronExitGameButton: document.getElementById('electron-exit-game-button'),
    pauseKeybindCaptureButton: document.getElementById('pause-keybind-capture-button'),
    dialogueSkipKeybindCaptureButton: document.getElementById('dialogue-skip-keybind-capture-button'),
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

function getDialogueSkipKeybindButtonLabel() {
  const current = getDialogueSkipKeybindDisplay();
  return t('ui.settings.dialogueSkipKeybindCaptureButton', { keybind: current }, `Capture key (${current})`);
}

function updateDialogueSkipKeybindButtons() {
  const cached = cacheSettingsElements();
  if (!cached.dialogueSkipKeybindCaptureButton) {
    return;
  }
  if (dialogueSkipKeybindCaptureActive) {
    cached.dialogueSkipKeybindCaptureButton.textContent = t('ui.settings.keybindCapturing', {}, 'Press any key...');
    return;
  }
  cached.dialogueSkipKeybindCaptureButton.textContent = getDialogueSkipKeybindButtonLabel();
}

function normalizeThemeMode(mode) {
  if (mode === 'darkGrey' || mode === 'darkBlue' || mode === 'light') {
    return mode;
  }
  if (mode === 'default') {
    return 'light';
  }
  return gameSettings.darkMode ? 'darkBlue' : 'light';
}

function applyThemeModeSetting() {
  const mode = normalizeThemeMode(gameSettings.themeMode);
  gameSettings.themeMode = mode;
  gameSettings.darkMode = mode !== 'light';
  document.body.classList.toggle('dark-mode', gameSettings.darkMode);
  document.body.classList.toggle('dark-grey-mode', mode === 'darkGrey');
  document.body.classList.toggle('dark-blue-mode', mode === 'darkBlue');
  const cached = cacheSettingsElements();
  if (cached.darkModeSelect && cached.darkModeSelect.value !== mode) {
    cached.darkModeSelect.value = mode;
  }
}

function isDifficultySettingsLocked() {
  return gameSettings.difficultySettingsLocked === true;
}

const DIFFICULTY_LOCK_STORY_WORLDS = [
  { key: 'mars', fallbackName: 'Mars', minChapter: 0 },
  { key: 'titan', fallbackName: 'Titan', minChapter: 4 },
  { key: 'callisto', fallbackName: 'Callisto', minChapter: 7 },
  { key: 'ganymede', fallbackName: 'Ganymede', minChapter: 10 },
  { key: 'vega2', fallbackName: 'Vega-2', minChapter: 14 },
  { key: 'venus', fallbackName: 'Venus', minChapter: 18 },
  { key: 'umbra', fallbackName: 'Umbra', minChapter: 21 },
  { key: 'solisprime', fallbackName: 'Solis Prime', minChapter: 24 },
  { key: 'gabbag', fallbackName: 'Gabbag', minChapter: 27 },
  { key: 'tartarus', fallbackName: 'Tartarus', minChapter: 30 },
  { key: 'hades', fallbackName: 'Hades', minChapter: 33 },
  { key: 'poseidon', fallbackName: 'Poseidon', minChapter: 36 },
  { key: 'styx', fallbackName: 'Styx', minChapter: 39 },
  { key: 'zeus', fallbackName: 'Zeus', minChapter: 42 },
  { key: 'olympus', fallbackName: 'Olympus', minChapter: 46 },
  { key: 'earth', fallbackName: 'Earth', minChapter: 50 },
];

function getLatestStoryWorldForDifficultyLock() {
  const chapter = Number(storyManager.currentChapter || 0);
  let world = DIFFICULTY_LOCK_STORY_WORLDS[0];
  for (let i = 1; i < DIFFICULTY_LOCK_STORY_WORLDS.length; i += 1) {
    if (chapter >= DIFFICULTY_LOCK_STORY_WORLDS[i].minChapter) {
      world = DIFFICULTY_LOCK_STORY_WORLDS[i];
    }
  }
  return world;
}

function getDifficultyLockStoryWorldName(world) {
  return t(`catalogs.planets.${world.key}.name`, {}, world.fallbackName);
}

function getDifficultyLockStoryWorldLabel(world) {
  const number = DIFFICULTY_LOCK_STORY_WORLDS.indexOf(world) + 1;
  const name = getDifficultyLockStoryWorldName(world);
  return t('ui.settings.difficultyLockWorldLabel', { number, name }, `World ${number}: ${name}`);
}

function getDifficultyLockStoryWorldByKey(key) {
  for (let i = 0; i < DIFFICULTY_LOCK_STORY_WORLDS.length; i += 1) {
    if (DIFFICULTY_LOCK_STORY_WORLDS[i].key === key) {
      return DIFFICULTY_LOCK_STORY_WORLDS[i];
    }
  }
  return null;
}

function getDifficultyLockWorldLabel() {
  const world = getDifficultyLockStoryWorldByKey(gameSettings.difficultySettingsLockedWorldKey);
  if (world) {
    return getDifficultyLockStoryWorldLabel(world);
  }
  const name = gameSettings.difficultySettingsLockedWorldName || gameSettings.difficultySettingsLockedWorldKey;
  return name || t('ui.settings.difficultyLockUnknownWorld', {}, 'Unknown world');
}

function updateDifficultyLockUI() {
  const cached = cacheSettingsElements();
  const locked = isDifficultySettingsLocked();
  const controls = [
    cached.dayNightToggle,
    cached.earlyAdvancedOversightToggle,
    cached.disableFusionConsumptionScalingToggle,
    cached.disableSpeedControlsToggle,
    cached.immigrationPoolToggle,
    cached.unfulfilledMaintenancePenaltiesToggle,
    cached.factoryHeatingToggle,
    cached.realisticFactoryEnergyConsumptionToggle,
    cached.infinitePatienceToggle,
    cached.liftersStrippingCapToggle,
    cached.orbitalCapToggle,
    cached.noOverpopulationCylindersToggle,
    cached.buildingCostMultiplierInput,
    cached.researchCostMultiplierInput,
    cached.workerRequirementMultiplierInput,
    cached.projectDurationMultiplierInput,
    cached.popGrowthMultiplierInput,
    cached.lifeGrowthMultiplierInput,
    cached.maintenanceCostMultiplierInput,
    cached.spaceshipEnergyBeforeSpaceElevatorMultiplierInput,
    cached.spaceshipEnergyAfterSpaceElevatorMultiplierInput,
    cached.advancedResearchMultiplierInput,
    cached.skillPointsGainMultiplierInput,
    cached.galaxyFleetCapacityMultiplierInput,
    cached.galaxyThreatScalingMultiplierInput,
    cached.invasionMultiplierInput,
    cached.artificialWorldConstructionTimeMultiplierInput,
    cached.rwgRewardsCapInput,
  ];

  for (let i = 0; i < controls.length; i += 1) {
    if (controls[i]) {
      controls[i].disabled = locked;
    }
  }

  if (cached.lockDifficultySettingsButton) {
    cached.lockDifficultySettingsButton.disabled = locked;
    cached.lockDifficultySettingsButton.textContent = locked
      ? t('ui.settings.difficultyLockedButton', {}, 'Difficulty locked')
      : t('ui.settings.lockDifficultySettings', {}, 'Lock difficulty settings');
  }

  if (cached.difficultyLockStatus) {
    const world = getDifficultyLockWorldLabel();
    cached.difficultyLockStatus.textContent = locked
      ? t('ui.settings.difficultyLockedStatus', { world }, `Difficulty settings locked on ${world}.`)
      : t('ui.settings.difficultyUnlockedStatus', {}, 'Difficulty settings are not locked.');
  }
}

function lockDifficultySettings() {
  if (isDifficultySettingsLocked()) {
    return;
  }
  const world = getLatestStoryWorldForDifficultyLock();
  gameSettings.difficultySettingsLocked = true;
  gameSettings.difficultySettingsLockedWorldKey = world.key;
  gameSettings.difficultySettingsLockedWorldName = getDifficultyLockStoryWorldName(world);
  updateDifficultyLockUI();
}

function confirmDifficultySettingsLock() {
  if (isDifficultySettingsLocked()) {
    return;
  }
  const world = getLatestStoryWorldForDifficultyLock();
  const worldLabel = getDifficultyLockStoryWorldLabel(world);
  createSystemChoicePopup(
    t('ui.settings.lockDifficultyConfirmTitle', {}, 'Lock difficulty settings?'),
    t(
      'ui.settings.lockDifficultyConfirmText',
      { world: worldLabel },
      `This permanently locks difficulty settings for this save. The lock will be recorded at latest story world: ${worldLabel}.`
    ),
    t('ui.settings.lockDifficultyConfirmYes', {}, 'Lock'),
    t('ui.settings.lockDifficultyConfirmNo', {}, 'Cancel'),
    lockDifficultySettings,
    () => {}
  );
}

function wireDifficultyMultiplierInput(input, settingId) {
  if (!input) {
    return;
  }
  gameSettings[settingId] = normalizeDifficultySettingValue(settingId, gameSettings[settingId]);
  input.value = formatDifficultyMultiplierValue(gameSettings[settingId]);
  input.dataset[settingId] = String(gameSettings[settingId]);
  wireStringNumberInput(input, {
    parseValue: value => normalizeDifficultySettingValue(settingId, parseFlexibleNumber(value)),
    formatValue: value => formatDifficultyMultiplierValue(value),
    onValue: parsed => {
      if (isDifficultySettingsLocked()) {
        updateDifficultySettingInputs();
        return;
      }
      gameSettings[settingId] = parsed;
      applyDifficultySettingEffects();
      updateBuildingDisplay(buildings);
      updateColonyDisplay(colonies);
      updateResearchUI();
      for (const projectName in projectManager.projects) {
        updateProjectUI(projectName);
      }
      if (galaxyManager) {
        updateGalaxyUI({ force: true });
      }
      if (galaxyInvasionManager) {
        updateGalacticInvasionUI({ force: true });
      }
      if (artificialManager) {
        artificialManager.updateUI(true);
      }
    },
    datasetKey: settingId,
  });
}

function wireDifficultyNullableCapInput(input, settingId) {
  if (!input) {
    return;
  }
  gameSettings[settingId] = normalizeDifficultySettingValue(settingId, gameSettings[settingId]);
  input.value = formatDifficultyNullableCapValue(gameSettings[settingId]);
  input.dataset[settingId] = gameSettings[settingId] === null ? '' : String(gameSettings[settingId]);
  wireStringNumberInput(input, {
    parseValue: value => normalizeDifficultySettingValue(settingId, value.trim() === '' ? null : parseFlexibleNumber(value)),
    formatValue: value => formatDifficultyNullableCapValue(value),
    onValue: parsed => {
      if (isDifficultySettingsLocked()) {
        updateDifficultySettingInputs();
        return;
      }
      gameSettings[settingId] = parsed;
      applyRWGEffects();
      updateRWGEffectsUI();
    },
    datasetKey: settingId,
  });
}

function updateDifficultySettingInputs() {
  const cached = cacheSettingsElements();
  const inputs = {
    buildingCostMultiplier: cached.buildingCostMultiplierInput,
    researchCostMultiplier: cached.researchCostMultiplierInput,
    workerRequirementMultiplier: cached.workerRequirementMultiplierInput,
    projectDurationMultiplier: cached.projectDurationMultiplierInput,
    popGrowthMultiplier: cached.popGrowthMultiplierInput,
    lifeGrowthMultiplier: cached.lifeGrowthMultiplierInput,
    maintenanceCostMultiplier: cached.maintenanceCostMultiplierInput,
    spaceshipEnergyBeforeSpaceElevatorMultiplier: cached.spaceshipEnergyBeforeSpaceElevatorMultiplierInput,
    spaceshipEnergyAfterSpaceElevatorMultiplier: cached.spaceshipEnergyAfterSpaceElevatorMultiplierInput,
    advancedResearchMultiplier: cached.advancedResearchMultiplierInput,
    skillPointsGainMultiplier: cached.skillPointsGainMultiplierInput,
    galaxyFleetCapacityMultiplier: cached.galaxyFleetCapacityMultiplierInput,
    galaxyThreatScalingMultiplier: cached.galaxyThreatScalingMultiplierInput,
    invasionMultiplier: cached.invasionMultiplierInput,
    artificialWorldConstructionTimeMultiplier: cached.artificialWorldConstructionTimeMultiplierInput,
    rwgRewardsCap: cached.rwgRewardsCapInput,
  };

  normalizeDifficultySettings();
  for (const settingId in inputs) {
    const input = inputs[settingId];
    if (!input) {
      continue;
    }
    if (settingId === 'rwgRewardsCap') {
      input.value = formatDifficultyNullableCapValue(gameSettings[settingId]);
      input.dataset[settingId] = gameSettings[settingId] === null ? '' : String(gameSettings[settingId]);
    } else {
      input.value = formatDifficultyMultiplierValue(gameSettings[settingId]);
      input.dataset[settingId] = String(gameSettings[settingId]);
    }
  }
  updateDifficultyLockUI();
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

  cached.whiteNoiseOption.hidden = !GAME_FEATURES.whiteNoiseKeepAlive;
  cached.whiteNoiseOption.classList.toggle('build-target-hidden', !GAME_FEATURES.whiteNoiseKeepAlive);
  if (GAME_FEATURES.whiteNoiseKeepAlive && cached.keepTabRunningAudioToggle) {
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
  } else {
    gameSettings.keepTabRunningAudio = false;
    stopBackgroundSilence();
  }

  if (GAME_FEATURES.whiteNoiseKeepAlive && cached.whiteNoiseTooltip) {
    attachDynamicInfoTooltip(
      cached.whiteNoiseTooltip,
      t(
        'ui.settings.whiteNoiseTooltip',
        {},
        'After your first click or keypress it plays a quiet white noise loop to prevent the browser from throttling background execution. Much more quiet on Firefox. May still work even if the tab is muted.'
      )
    );
  }

  cached.electronFullscreenOption.hidden = !GAME_FEATURES.electronWindowControls;
  cached.electronFullscreenOption.classList.toggle('build-target-hidden', !GAME_FEATURES.electronWindowControls);
  cached.electronExitGameButton.hidden = !GAME_FEATURES.electronWindowControls;
  cached.electronExitGameButton.classList.toggle('build-target-hidden', !GAME_FEATURES.electronWindowControls);
  if (GAME_FEATURES.electronWindowControls) {
    window.electronWindowControls.isFullscreen().then(enabled => {
      cached.electronFullscreenToggle.checked = enabled;
    });
    window.electronWindowControls.onFullscreenChanged(enabled => {
      cached.electronFullscreenToggle.checked = enabled;
    });
    cached.electronFullscreenToggle.addEventListener('change', () => {
      window.electronWindowControls.setFullscreen(cached.electronFullscreenToggle.checked).then(enabled => {
        cached.electronFullscreenToggle.checked = enabled;
      });
    });
    cached.electronExitGameButton.addEventListener('click', () => {
      window.electronWindowControls.exitGame();
    });
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

  if (cached.colorblindPaletteSelect) {
    cached.colorblindPaletteSelect.value = getColorblindPaletteKey();
    cached.colorblindPaletteSelect.addEventListener('change', () => {
      gameSettings.colorblindPalette = cached.colorblindPaletteSelect.value;
      applyColorblindPaletteSettings();
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
      updateResourceViewToggleState(resources);
      updateResourceDisplay(resources, 0);
    });
  }

  if (cached.netResourceRateDisplayToggle) {
    cached.netResourceRateDisplayToggle.checked = gameSettings.showNetResourceRateWithAutobuild;
    cached.netResourceRateDisplayToggle.addEventListener('change', () => {
      gameSettings.showNetResourceRateWithAutobuild = cached.netResourceRateDisplayToggle.checked;
      updateResourceDisplay(resources, 0);
    });
  }

  if (cached.immigrationPoolToggle) {
    cached.immigrationPoolToggle.checked = gameSettings.immigrationPool;
    cached.immigrationPoolToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.immigrationPoolToggle.checked = gameSettings.immigrationPool;
        return;
      }
      gameSettings.immigrationPool = cached.immigrationPoolToggle.checked;
    });
  }

  if (cached.immigrationPoolTooltip) {
    attachDynamicInfoTooltip(
      cached.immigrationPoolTooltip,
      t(
        'ui.settings.immigrationPoolTooltip',
        {},
        'When enabled, strong colony growth above the galactic baseline on non-Mars worlds draws from the off-world galactic population pool instead of creating all growth locally. Immigration only happens while this world is less full than the galactic population pool, and colonist imports also draw from that pool when available.'
      )
    );
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
      if (isDifficultySettingsLocked()) {
        cached.dayNightToggle.checked = gameSettings.disableDayNightCycle;
        return;
      }
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

  if (cached.darkModeSelect) {
    applyThemeModeSetting();
    cached.darkModeSelect.addEventListener('change', () => {
      gameSettings.themeMode = cached.darkModeSelect.value;
      applyThemeModeSetting();
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
      if (isDifficultySettingsLocked()) {
        cached.disableFusionConsumptionScalingToggle.checked = gameSettings.disableFusionConsumptionScaling;
        return;
      }
      gameSettings.disableFusionConsumptionScaling = cached.disableFusionConsumptionScalingToggle.checked;
      reapplySharedManagerEffects({
        includeConditionalReconcile: true
      });
    });
  }

  if (cached.disableFusionConsumptionScalingTooltip) {
    attachDynamicInfoTooltip(
      cached.disableFusionConsumptionScalingTooltip,
      t(
        'ui.settings.disableFusionConsumptionScalingTooltip',
        {},
        'When enabled, upgrades and world rewards can still make Fusion Reactors and Superalloy Fusion Reactors produce more energy, but they will not make those buildings consume more hydrogen or other fuel.'
      )
    );
  }

  if (cached.disableSpeedControlsToggle) {
    cached.disableSpeedControlsToggle.checked = gameSettings.disableSpeedControls;
    cached.disableSpeedControlsToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.disableSpeedControlsToggle.checked = gameSettings.disableSpeedControls;
        return;
      }
      gameSettings.disableSpeedControls = cached.disableSpeedControlsToggle.checked;
      applySpeedControlsSetting();
    });
  }

  if (cached.disableSpeedControlsTooltip) {
    attachDynamicInfoTooltip(
      cached.disableSpeedControlsTooltip,
      t(
        'ui.settings.disableSpeedControlsTooltip',
        {},
        'The game was balanced to be fully playable on 1x speed and is the experience the developer wanted for themselves.  If you want the intended experience feel free to disable them.'
      )
    );
  }

  if (cached.unfulfilledMaintenancePenaltiesToggle) {
    cached.unfulfilledMaintenancePenaltiesToggle.checked = gameSettings.unfulfilledMaintenancePenalties;
    cached.unfulfilledMaintenancePenaltiesToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.unfulfilledMaintenancePenaltiesToggle.checked = gameSettings.unfulfilledMaintenancePenalties;
        return;
      }
      gameSettings.unfulfilledMaintenancePenalties = cached.unfulfilledMaintenancePenaltiesToggle.checked;
      if (!gameSettings.unfulfilledMaintenancePenalties) {
        for (const buildingName in buildings) {
          buildings[buildingName].maintenanceProductivity = 1;
        }
      }
    });
  }

  if (cached.unfulfilledMaintenancePenaltiesTooltip) {
    attachDynamicInfoTooltip(
      cached.unfulfilledMaintenancePenaltiesTooltip,
      t(
        'ui.settings.unfulfilledMaintenancePenaltiesTooltip',
        {},
        'When enabled, unpaid building maintenance lowers affected buildings over 900 seconds. Each building trends toward the worst paid maintenance ratio among the resources it needs, and actual productivity is capped by that value.'
      )
    );
  }

  if (cached.earlyAdvancedOversightToggle) {
    cached.earlyAdvancedOversightToggle.checked = gameSettings.earlyAdvancedOversight;
    cached.earlyAdvancedOversightToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.earlyAdvancedOversightToggle.checked = gameSettings.earlyAdvancedOversight;
        return;
      }
      gameSettings.earlyAdvancedOversight = cached.earlyAdvancedOversightToggle.checked;
      applyDifficultySettingEffects();
      updateProjectUI('spaceMirrorFacility');
    });
  }

  if (cached.earlyAdvancedOversightTooltip) {
    attachDynamicInfoTooltip(
      cached.earlyAdvancedOversightTooltip,
      t(
        'ui.settings.earlyAdvancedOversightTooltip',
        {},
        'The game has a powerful solver for space mirrors that can automatically target specified temperature values.  It is intended to be something that must be earned, and is usually available on Story World 5.  If you find the fiddling too frustrating however feel free to have it early.  You still need the Space Mirror Facility Oversight research.'
      )
    );
  }

  if (cached.factoryHeatingToggle) {
    cached.factoryHeatingToggle.checked = gameSettings.factoryHeating;
    cached.factoryHeatingToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.factoryHeatingToggle.checked = gameSettings.factoryHeating;
        return;
      }
      gameSettings.factoryHeating = cached.factoryHeatingToggle.checked;
      if (!gameSettings.factoryHeating && terraforming) {
        terraforming.setFactoryHeatPower(0);
      }
      updateTerraformingUI();
    });
  }

  if (cached.factoryHeatingTooltip) {
    attachDynamicInfoTooltip(
      cached.factoryHeatingTooltip,
      t(
        'ui.settings.factoryHeatingTooltip',
        {},
        'When enabled, part of local building and colony energy use becomes planetary heat, while solar panels cool the planet by their energy production. Most structures convert all local energy into heat, while processes that store energy chemically, emit it off-world, or already model direct heating use lower coefficients. Mega Heat Sinks remove core heat first, then factory heat.'
      )
    );
  }

  if (cached.realisticFactoryEnergyConsumptionToggle) {
    cached.realisticFactoryEnergyConsumptionToggle.checked = gameSettings.realisticFactoryEnergyConsumption;
    cached.realisticFactoryEnergyConsumptionToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.realisticFactoryEnergyConsumptionToggle.checked = gameSettings.realisticFactoryEnergyConsumption;
        return;
      }
      gameSettings.realisticFactoryEnergyConsumption = cached.realisticFactoryEnergyConsumptionToggle.checked;
      applyDifficultySettingEffects();
      updateBuildingDisplay(buildings);
    });
  }

  if (cached.realisticFactoryEnergyConsumptionTooltip) {
    attachDynamicInfoTooltip(
      cached.realisticFactoryEnergyConsumptionTooltip,
      t(
        'ui.settings.realisticFactoryEnergyConsumptionTooltip',
        {},
        'When enabled, buildings use plausible industrial energy demands based on their workers and material throughput instead of the legacy balance values.'
      )
    );
  }

  if (cached.infinitePatienceToggle) {
    cached.infinitePatienceToggle.checked = gameSettings.infinitePatience;
    cached.infinitePatienceToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.infinitePatienceToggle.checked = gameSettings.infinitePatience;
        return;
      }
      gameSettings.infinitePatience = cached.infinitePatienceToggle.checked;
      patienceManager.enforceInfinitePatience();
      updatePatienceUI();
    });
  }

  if (cached.liftersStrippingCapToggle) {
    cached.liftersStrippingCapToggle.checked = gameSettings.liftersStrippingCap;
    cached.liftersStrippingCapToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.liftersStrippingCapToggle.checked = gameSettings.liftersStrippingCap;
        return;
      }
      gameSettings.liftersStrippingCap = cached.liftersStrippingCapToggle.checked;
      const lifters = projectManager.projects.lifters;
      lifters.normalizeAssignments();
      lifters.updateUI();
    });
  }

  if (cached.liftersStrippingCapTooltip) {
    attachDynamicInfoTooltip(
      cached.liftersStrippingCapTooltip,
      t(
        'ui.settings.liftersStrippingCapTooltip',
        {},
        'When enabled, Strip Atmosphere cannot have more lifters assigned than the current world geometric land value.'
      )
    );
  }

  if (cached.orbitalCapToggle) {
    cached.orbitalCapToggle.checked = gameSettings.orbitalCap;
    cached.orbitalCapToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.orbitalCapToggle.checked = gameSettings.orbitalCap;
        return;
      }
      gameSettings.orbitalCap = cached.orbitalCapToggle.checked;
      followersManager.markUIDirty();
      updateFollowersUI();
    });
  }

  if (cached.orbitalCapTooltip) {
    attachDynamicInfoTooltip(
      cached.orbitalCapTooltip,
      t(
        'ui.settings.orbitalCapTooltip',
        {},
        'When enabled, available Orbitals cannot exceed the current world geometric land value.'
      )
    );
  }

  if (cached.noOverpopulationCylindersToggle) {
    cached.noOverpopulationCylindersToggle.checked = gameSettings.noOverpopulationCylinders;
    cached.noOverpopulationCylindersToggle.addEventListener('change', () => {
      if (isDifficultySettingsLocked()) {
        cached.noOverpopulationCylindersToggle.checked = gameSettings.noOverpopulationCylinders;
        return;
      }
      gameSettings.noOverpopulationCylinders = cached.noOverpopulationCylindersToggle.checked;
      updateProjectUI('overpopulationOneillCylinders');
    });
  }

  if (cached.noOverpopulationCylindersTooltip) {
    attachDynamicInfoTooltip(
      cached.noOverpopulationCylindersTooltip,
      t(
        'ui.settings.noOverpopulationCylindersTooltip',
        {},
        "World 14 has a feature known as the 'Zeus catapult' that is very powerful but makes a lot of sense narratively.  It is arguably too powerful.  By checking this box you can ensure you gain nothing from it.  The project will still appear."
      )
    );
  }

  wireDifficultyMultiplierInput(cached.buildingCostMultiplierInput, 'buildingCostMultiplier');
  wireDifficultyMultiplierInput(cached.researchCostMultiplierInput, 'researchCostMultiplier');
  wireDifficultyMultiplierInput(cached.workerRequirementMultiplierInput, 'workerRequirementMultiplier');
  wireDifficultyMultiplierInput(cached.projectDurationMultiplierInput, 'projectDurationMultiplier');
  wireDifficultyMultiplierInput(cached.popGrowthMultiplierInput, 'popGrowthMultiplier');
  wireDifficultyMultiplierInput(cached.lifeGrowthMultiplierInput, 'lifeGrowthMultiplier');
  wireDifficultyMultiplierInput(cached.maintenanceCostMultiplierInput, 'maintenanceCostMultiplier');
  wireDifficultyMultiplierInput(cached.spaceshipEnergyBeforeSpaceElevatorMultiplierInput, 'spaceshipEnergyBeforeSpaceElevatorMultiplier');
  wireDifficultyMultiplierInput(cached.spaceshipEnergyAfterSpaceElevatorMultiplierInput, 'spaceshipEnergyAfterSpaceElevatorMultiplier');
  wireDifficultyMultiplierInput(cached.advancedResearchMultiplierInput, 'advancedResearchMultiplier');
  wireDifficultyMultiplierInput(cached.skillPointsGainMultiplierInput, 'skillPointsGainMultiplier');
  wireDifficultyMultiplierInput(cached.galaxyFleetCapacityMultiplierInput, 'galaxyFleetCapacityMultiplier');
  wireDifficultyMultiplierInput(cached.galaxyThreatScalingMultiplierInput, 'galaxyThreatScalingMultiplier');
  wireDifficultyMultiplierInput(cached.invasionMultiplierInput, 'invasionMultiplier');
  wireDifficultyMultiplierInput(cached.artificialWorldConstructionTimeMultiplierInput, 'artificialWorldConstructionTimeMultiplier');
  wireDifficultyNullableCapInput(cached.rwgRewardsCapInput, 'rwgRewardsCap');

  if (cached.lockDifficultySettingsButton) {
    cached.lockDifficultySettingsButton.addEventListener('click', confirmDifficultySettingsLock);
  }
  updateDifficultyLockUI();

  if (cached.rwgRewardsCapTooltip) {
    attachDynamicInfoTooltip(
      cached.rwgRewardsCapTooltip,
      t(
        'ui.settings.rwgRewardsCapTooltip',
        {},
        'Limits how many random worlds count toward rewards in each random world type. Leave blank for uncapped rewards. Hazard bonuses count toward the same cap.'
      )
    );
  }

  if (cached.spaceshipEnergyBeforeSpaceElevatorTooltip) {
    attachDynamicInfoTooltip(
      cached.spaceshipEnergyBeforeSpaceElevatorTooltip,
      t(
        'ui.settings.spaceshipEnergyBeforeSpaceElevatorMultiplierTooltip',
        {},
        'Multiplies colony energy costs for spaceship projects before the Space Elevator is completed.  Use 100-500 if you want a realistic value.'
      )
    );
  }

  if (cached.spaceshipEnergyAfterSpaceElevatorTooltip) {
    attachDynamicInfoTooltip(
      cached.spaceshipEnergyAfterSpaceElevatorTooltip,
      t(
        'ui.settings.spaceshipEnergyAfterSpaceElevatorMultiplierTooltip',
        {},
        'Multiplies colony energy costs for spaceship projects after the Space Elevator is completed.  Use 10-20 if you want a realistic value.'
      )
    );
  }

  if (cached.galaxyThreatScalingTooltip) {
    attachDynamicInfoTooltip(
      cached.galaxyThreatScalingTooltip,
      t(
        'ui.settings.galaxyThreatScalingTooltip',
        {},
        'Multiplies how much extra fleet capacity AI factions gain as they react to UHF expansion and late-game threat.'
      )
    );
  }

  if (cached.invasionMultiplierTooltip) {
    attachDynamicInfoTooltip(
      cached.invasionMultiplierTooltip,
      t(
        'ui.settings.invasionMultiplierTooltip',
        {},
        'Multiplies the fleet power of newly started galactic invasions.'
      )
    );
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

  if (cached.dialogueSkipKeybindCaptureButton) {
    updateDialogueSkipKeybindButtons();
    cached.dialogueSkipKeybindCaptureButton.addEventListener('click', () => {
      if (dialogueSkipKeybindCaptureActive) {
        return;
      }
      dialogueSkipKeybindCaptureActive = true;
      updateDialogueSkipKeybindButtons();
      const captureKeydown = event => {
        event.preventDefault();
        event.stopPropagation();
        dialogueSkipKeybindCaptureActive = false;
        setDialogueSkipKeybindCode(event.code);
        updateDialogueSkipKeybindButtons();
        document.removeEventListener('keydown', captureKeydown, true);
      };
      document.addEventListener('keydown', captureKeydown, true);
    });
  }

}

function initializePreferencesSettingsSubtab() {
  initializeGameSpeedControls();
  addSettingsListeners();
}
