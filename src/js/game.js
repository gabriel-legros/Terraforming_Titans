const config = {
  type: Phaser.AUTO,
  width: 0,
  height: 0,
  parent: 'container',
  scene: {
    key: 'mainScene',  // Add a key for the scene
    preload: preload,
    create: create,
    update: update
  },
  fps: {
    limit: 30,  // The game defaults to 30 updates per second
    forceSetTimeOut: true  // Don't use RAF
  },
  autoPause: false  // This prevents the game from pausing when the tab is inactive
};

var game = null;
let lastFrameTimeMs = 0;
const LOGIC_DELTA_QUANTUM_MS = terraformingParameters.gameplay.simulation.resourceSubstepMs;
let logicDeltaCarryMs = 0;
const GAME_FRAMERATE_OPTIONS = [10, 20, 30];
const DEFAULT_GAME_FRAMERATE = 30;

function normalizeGameFramerate(framerate) {
  const parsedValue = Number(framerate);
  return GAME_FRAMERATE_OPTIONS.includes(parsedValue)
    ? parsedValue
    : DEFAULT_GAME_FRAMERATE;
}

function getGameFramerate() {
  return normalizeGameFramerate(gameSettings.framerate);
}

function applyGameFramerateSetting() {
  const framerate = getGameFramerate();
  gameSettings.framerate = framerate;
  config.fps.limit = framerate;
  if (game && game.loop) {
    const targetMs = 1000 / framerate;
    game.loop.targetFps = framerate;
    game.loop._target = targetMs;
    game.loop.actualFps = Math.min(game.loop.actualFps, framerate);
    if (game.loop.raf) {
      game.loop.raf.target = targetMs;
    }
    resetGameFrameClock(true);
  }
}

function resetGameFrameClock(resetCarry = false) {
  lastFrameTimeMs = performance.now();
  if (resetCarry) {
    logicDeltaCarryMs = 0;
  }
  updateRender.lastDelta = 0;
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    resetGameFrameClock();
  }
});

window.addEventListener('focus', () => {
  resetGameFrameClock();
});

window.addEventListener('pageshow', () => {
  resetGameFrameClock();
});

function initializeTerraformingTitansDom() {
  applyLanguageToDom();
  initializeSettingsDom();
  initializeColonyDomUI();
  initializeJournalDom();
}

function startTerraformingTitansGame() {
  initializeTerraformingTitansDom();
  game = new Phaser.Game(config);
  applyGameFramerateSetting();
}

document.addEventListener('DOMContentLoaded', startTerraformingTitansGame);

function preload() {
  // Load assets (images, sounds, etc.) here
}

function create() {
  initializeDefaultGlobals();

  const startupSelection = window.electronStartup
    ? window.electronStartup.getSelection()
    : { mode: 'latest', slot: '' };
  restoreAutomationOnStartupWithoutPrompt = startupSelection.runScriptsOnStart === true;
  let startupSaveLoaded = false;
  if (startupSelection.mode === 'slot') {
    startupSaveLoaded = loadGame(`gameState_${startupSelection.slot}`, false);
  } else if (startupSelection.mode === 'temporary') {
    startupSaveLoaded = loadGame(startupSelection.saveData, false);
  } else if (startupSelection.mode === 'latest') {
    startupSaveLoaded = loadMostRecentSave();
  }
  restoreAutomationOnStartupWithoutPrompt = false;

  if (!startupSaveLoaded) {  // Handle initial game state (building counts, etc.)
      initializeGameState();
      if (typeof openTerraformingWorldTab === 'function') {
        openTerraformingWorldTab();
      }
      if (typeof hideLoadingOverlay === 'function') {
        hideLoadingOverlay();
      }
      resetGameFrameClock(true);
    }
    registerExitSaveHandler();
    return;
}

function initializeDefaultGlobals(){
  if (!gameSettings.pauseKeybind) {
    gameSettings.pauseKeybind = 'Space';
  }
  if (!gameSettings.dialogueSkipKeybind) {
    gameSettings.dialogueSkipKeybind = 'NumpadAdd';
  }
  if (!gameSettings.fullscreenKeybind) {
    gameSettings.fullscreenKeybind = 'F11';
  }
  setPauseKeybindCode(gameSettings.pauseKeybind);
  setDialogueSkipKeybindCode(gameSettings.dialogueSkipKeybind);
  setFullscreenKeybindCode(gameSettings.fullscreenKeybind);
  shipEfficiency = 1;
  // Instantiate the TabManager and load tabs from the constant
  tabManager = new TabManager({
    description: 'Manages game tabs and unlocks them based on effects.',
  }, tabParameters);

  resetStructureDisplayState();
  resetProjectDisplayState();
  if (GAME_FEATURES.whiteNoiseKeepAlive && gameSettings.keepTabRunningAudio) {
    startBackgroundSilence();
  }

  // Set up the game scene, objects, and initial state
  const rotation = currentPlanetParameters.celestialParameters.dayNightPeriod || currentPlanetParameters.celestialParameters.rotationPeriod || 24;
  const { duration: dayDuration, direction: rotationDirection } = rotationPeriodToDuration(rotation);
  dayNightCycle = new DayNightCycle(dayDuration, rotationDirection);
  updateDayNightDisplay();

  // Initialize resources
  resources = createResources(currentPlanetParameters.resources);
  createResourceDisplay(resources);
  celestialParameters = currentPlanetParameters.celestialParameters;
  terraforming = new Terraforming(resources, celestialParameters, currentPlanetParameters.specialAttributes);

  // Initialize buildings
  setProjectStorageProviders({});
  buildings = initializeBuildings(buildingsParameters);
  createBuildingButtons(buildings);
  if (typeof applyDayNightSettingEffects === 'function') {
    applyDayNightSettingEffects();
  }
  if (typeof initializeBuildingAlerts === 'function') {
    initializeBuildingAlerts();
  }

  // Initialize projects using the ProjectManager
  projectManager = new ProjectManager();
  projectManager.initializeProjects(projectParameters);
  if (typeof initializeProjectAlerts === 'function') {
    initializeProjectAlerts();
  }

  colonies = initializeColonies(colonyParameters);
  createColonyButtons(colonies);
  initializeColonyAlerts();
  initializeColonySubtabs();
  // Initialize colony slider settings with clean state
  colonySliderSettings = new ColonySlidersManager();
  initializeColonySlidersUI();
  if (typeof nanotechManager !== 'undefined') {
    nanotechManager.updateUI();
  }

  // Combine buildings and colonies into the structures object
  structures = { ...buildings, ...colonies };

  // Initialize research
    researchManager = new ResearchManager(researchParameters);
    initializeResearchUI();
    if (typeof initializeResearchAlerts === 'function') {
      initializeResearchAlerts();
    }

  // Initialize skills
  skillManager = new SkillManager(skillParameters);

  //Initialize funding
  const fundingRate = currentPlanetParameters.fundingRate || 0;
  fundingModule = new FundingModule(resources, fundingRate);

  //initialize population module
  populationModule = new PopulationModule(resources, currentPlanetParameters.populationParameters);

  // Initialize StoryManager
  storyManager = new StoryManager(progressData);  // Pass the progressData object

  terraforming.initializeTerraforming();
  terraformingGraphsManager.reset();
  if (typeof window !== 'undefined') {
    window.terraformingManager = terraforming;
  }

  goldenAsteroid = new GoldenAsteroid();

  automationManager = new AutomationManager();
  solisManager = new SolisManager();
  warpGateCommand = new WarpGateCommand();

  nanotechManager = new NanotechManager();
  followersManager = new FollowersManager();

  lifeDesigner = new LifeDesigner();
  lifeManager = new LifeManager();
  initializeLifeUI();

  milestonesManager = new MilestonesManager();
  createMilestonesUI();

  spaceManager = new SpaceManager(planetParameters);
  globalThis.spaceManager = spaceManager;
  galaxyManager = new GalaxyManager();
  galaxyInvasionManager = new GalacticInvasionManager();
  galaxyManager.galacticInvasionManager = galaxyInvasionManager;
  artificialManager = setArtificialManager(new ArtificialManager());
  atlasManager = new AtlasManager();
  initializeHopeUI();
  initializeSpaceUI(spaceManager);
  atlasManager.refreshUIVisibility();
  if (typeof galaxyManager.initialize === 'function') {
    galaxyManager.initialize();
  }
  warpGateNetworkManager = new WarpGateNetworkManager();
  warpGateNetworkManager.syncUnlocks();

  rwgManager = new RwgManager();
  patienceManager = new PatienceManager();
  earthManager = new EarthManager();
  achievementManager = new AchievementManager();
  registerDefaultTabActivationHandlers();
  }

function registerDefaultTabActivationHandlers() {
  registerTabActivationHandler('buildings', () => {
    updateBuildingDisplay(buildings);
  });
  registerTabActivationHandler('special-projects', () => {
    renderProjects();
  });
  registerTabActivationHandler('colonies', () => {
    updateColonySlidersUI();
    updateFollowersUI();
    nanotechManager.updateUI();
  });
  registerTabActivationHandler('research', () => {
    updateResearchUI();
  });
  registerTabActivationHandler('terraforming', () => {
    updateTerraformingUI();
  });
  registerTabActivationHandler('space', () => {
    updateSpaceUI();
    updateGalaxyUI({ force: true });
    updateGalacticInvasionUI({ force: true });
  });
  registerTabActivationHandler('settings', () => {
    const activeSettingsSubtab = settingsSubtabManager.getActiveId();
    if (activeSettingsSubtab === 'statistics-settings-subtab') {
      updateStatisticsDisplay();
    } else if (activeSettingsSubtab === 'achievements-settings-subtab') {
      updateAchievementsDisplay();
    }
  });
}

/**
 * Unified method to prepare for planet travel.
 * Saves pre-travel state and returns travel state data for managers that persist.
 * @returns {Object} Travel state data to be restored after travel
 */
let preparedTravelState = null;

function showAutoTravelLoadingPopup() {
  if (!autoTravelLoadingPopupElement) {
    autoTravelLoadingPopupElement = document.getElementById('auto-travel-loading-popup');
  }
  if (!autoTravelLoadingPopupElement) {
    autoTravelLoadingPopupElement = document.createElement('div');
    autoTravelLoadingPopupElement.id = 'auto-travel-loading-popup';
    autoTravelLoadingPopupElement.className = 'auto-travel-loading-popup auto-travel-loading-popup--hidden';
    document.body.appendChild(autoTravelLoadingPopupElement);
  }
  const loadingText = t('ui.autoTravelLoading', {}, 'Auto travel in progress...');
  if (autoTravelLoadingPopupElement.textContent !== loadingText) {
    autoTravelLoadingPopupElement.textContent = loadingText;
  }
  if (!autoTravelLoadingPopupElement.parentNode) {
    document.body.appendChild(autoTravelLoadingPopupElement);
  }
  if (autoTravelLoadingPopupElement.classList.contains('auto-travel-loading-popup--hidden')) {
    autoTravelLoadingPopupElement.classList.remove('auto-travel-loading-popup--hidden');
  }
  if (autoTravelLoadingPopupElement.getAttribute('aria-hidden') !== 'false') {
    autoTravelLoadingPopupElement.setAttribute('aria-hidden', 'false');
  }
}

function hideAutoTravelLoadingPopup() {
  if (!autoTravelLoadingPopupElement) {
    autoTravelLoadingPopupElement = document.getElementById('auto-travel-loading-popup');
  }
  if (!autoTravelLoadingPopupElement) {
    return;
  }
  if (!autoTravelLoadingPopupElement.classList.contains('auto-travel-loading-popup--hidden')) {
    autoTravelLoadingPopupElement.classList.add('auto-travel-loading-popup--hidden');
  }
  if (autoTravelLoadingPopupElement.getAttribute('aria-hidden') !== 'true') {
    autoTravelLoadingPopupElement.setAttribute('aria-hidden', 'true');
  }
}

function updateAutoTravelLoadingPopupVisibility() {
  if (globalGameIsTraveling || isEquilibrating || (autoTravelContext && autoTravelContext.active)) {
    return;
  }
  hideAutoTravelLoadingPopup();
}

function prepareForTravel(options = {}) {
  const resetLevel = options.resetLevel ?? GAME_RESET_LEVEL.PLANET;
  if (options.savePretravel !== false) {
    try {
      saveGameToSlot('pretravel');
    } catch (_) {}
  }

  const projectTravelState = projectManager?.saveTravelState?.(resetLevel);
  const followerTravelState = resetLevel < followersManager.resetAt
    ? followersManager.prepareTravelState(resetLevel)
    : null;
  hazardManager?.prepareForTravel?.(terraforming);
  if (resetLevel < nanotechManager.resetAt) {
    nanotechManager.prepareForTravel(resetLevel);
  }

  const travelState = {
    resetLevel,
    projects: projectTravelState,
    followers: followerTravelState,
    resources: resources
      ? capturePreservedTravelResourceState(resources, resetLevel)
      : null,
    autoBuild: typeof structures !== 'undefined'
      ? captureAutoBuildSettings(structures, resetLevel)
      : null,
    constructionOffice: captureConstructionOfficeSettings(resetLevel),
    lifeDesigner: lifeDesigner?.prepareTravelState?.(resetLevel),
    hazardousMachinery: hazardManager?.hazardousMachineryHazard?.saveTravelState?.(resetLevel)
  };

  preparedTravelState = travelState;
  return travelState;
}

function rebaseDynamicMassInitialGeometryAfterHazards() {
  if (currentPlanetParameters.specialAttributes?.dynamicMass !== true) {
    return;
  }
  terraforming.synchronizeGlobalResources();
  terraforming.refreshDynamicWorldGeometry(currentPlanetParameters);
  Object.assign(terraforming.initialCelestialParameters, terraforming.celestialParameters);
}

function initializeGameState(options = {}) {
  const resetLevel = options.resetLevel ?? GAME_RESET_LEVEL.NEW_GAME;
  const isLayerReset = resetLevel < GAME_RESET_LEVEL.NEW_GAME;
  const skipStoryInitialization = options.skipStoryInitialization || false;
  const managerSurvivesReset = {
    research: !!researchManager && resetLevel < researchManager.resetAt,
    skill: !!skillManager && resetLevel < skillManager.resetAt,
    automation: !!automationManager && resetLevel < automationManager.resetAt,
    solis: !!solisManager && resetLevel < solisManager.resetAt,
    warpGateCommand: !!warpGateCommand && resetLevel < warpGateCommand.resetAt,
    nanotech: !!nanotechManager && resetLevel < nanotechManager.resetAt,
    patience: !!patienceManager && resetLevel < patienceManager.resetAt,
    earth: !!earthManager && resetLevel < earthManager.resetAt,
    followers: !!followersManager && resetLevel < followersManager.resetAt,
    artificial: !!artificialManager && resetLevel < artificialManager.resetAt,
    atlas: !!atlasManager && resetLevel < atlasManager.resetAt,
    galaxy: !!galaxyManager && resetLevel < galaxyManager.resetAt,
    galaxyInvasion: !!galaxyInvasionManager && resetLevel < galaxyInvasionManager.resetAt,
    story: !!storyManager && resetLevel < storyManager.resetAt,
    achievement: !!achievementManager && resetLevel < achievementManager.resetAt,
    space: !!spaceManager && resetLevel < spaceManager.resetAt
  };
  suppressPlanetVisualizerRuntime = true;
  if (!isLayerReset) {
    shipEfficiency = 1;
  }
  globalGameIsTraveling = isLayerReset && !globalGameIsLoadingFromSave;
  autobuildCostTracker.reset();
  const pendingAutoTravelTabRestore = (
    autoTravelContext
    && autoTravelContext.active
    && autoTravelContext.restoreTabState
  ) ? { ...autoTravelContext.restoreTabState } : null;
  const restoreAutoTravelTabs = () => {
    if (!pendingAutoTravelTabRestore) {
      return;
    }
    const activateSubtabByDataId = (subtabId) => {
      if (!subtabId) return false;
      const button = document.querySelector(`[data-subtab="${subtabId}"]`);
      if (!button || button.classList.contains('hidden')) return false;
      button.click();
      return true;
    };
    const mainTabId = pendingAutoTravelTabRestore.mainTabId || '';
    if (mainTabId && tabManager && typeof tabManager.activateTab === 'function') {
      tabManager.activateTab(mainTabId);
    }
    if (mainTabId === 'space' && typeof activateSpaceSubtab === 'function') {
      activateSpaceSubtab(pendingAutoTravelTabRestore.spaceSubtabId || 'space-story');
    } else if (mainTabId === 'terraforming' && typeof activateTerraformingSubtab === 'function') {
      activateTerraformingSubtab(pendingAutoTravelTabRestore.terraformingSubtabId || 'world-terraforming');
    } else if (mainTabId === 'hope' && typeof activateHopeSubtab === 'function') {
      activateHopeSubtab(pendingAutoTravelTabRestore.hopeSubtabId || 'awakening-hope');
    } else if (mainTabId === 'colonies' && typeof activateColonySubtab === 'function') {
      activateColonySubtab(pendingAutoTravelTabRestore.colonySubtabId || 'workers-colony');
    } else if (mainTabId === 'settings') {
      activateSubtabByDataId(pendingAutoTravelTabRestore.settingsSubtabId || 'save-settings-subtab');
    }
  };
  let travelState = null;
  if (!isLayerReset && !globalGameIsLoadingFromSave) {
    resetStructureDisplayState();
    resetProjectDisplayState();
    resetResourceCategoryCollapseState();
  } else if (isLayerReset && !globalGameIsLoadingFromSave && !gameSettings.keepHiddenStructuresOnTravel) {
    structureDisplayState.hidden = {};
  }
  if (isLayerReset && !globalGameIsLoadingFromSave && !gameSettings.keepHiddenResearchOnTravel && typeof resetHiddenResearchOnTravel === 'function') {
    resetHiddenResearchOnTravel();
  }
  goldenAsteroid?.resetForTravel?.();
  if (isLayerReset) {
    // Use prepared travel state from departure when available to avoid overwriting pretravel save.
    travelState = preparedTravelState?.resetLevel === resetLevel
      ? preparedTravelState
      : prepareForTravel({ savePretravel: false, resetLevel });
    preparedTravelState = null;
  } else {
    preparedTravelState = null;
    if (!globalGameIsLoadingFromSave) {
      projectManager?.cleanupForReset?.(resetLevel);
      hazardManager?.prepareForTravel?.(terraforming);
    }
  }
  if (isLayerReset && resources) {
    clearResourceTooltipRateCooldownsForTravel(resources);
  }
  tabManager = new TabManager({
    description: 'Manages game tabs and unlocks them based on effects.',
  }, tabParameters);

  if (!isLayerReset && typeof resetJournal === 'function') {
    resetJournal();
  }

  if (!isLayerReset) {
    if (!globalGameIsLoadingFromSave) {
      fastestTerraformDays = null;
      fastestTerraformRealSeconds = null;
      birchWorldTerraformTimeSeconds = null;
      birchWorldTerraformRealTimeSeconds = null;
    }
    updateDifficultySettingInputs();
  }
  if (!managerSurvivesReset.nanotech) {
    nanotechManager.reset();
  }

  globalEffects = new EffectableEntity({description : 'Manages global effects'});
  androidResearch.activeEffects = [];
  androidResearch.booleanFlags = new Set();

  playTimeSeconds = 0;
  realPlayTimeSeconds = 0;
  patienceManager.resetWorldPatience();

  const rotation = currentPlanetParameters.celestialParameters.dayNightPeriod || currentPlanetParameters.celestialParameters.rotationPeriod || 24;
  const dayDurationData = rotationPeriodToDuration(rotation);
  dayNightCycle = new DayNightCycle(dayDurationData.duration, dayDurationData.direction);
  const existingResources = resources;
  resources = createResources(currentPlanetParameters.resources);
  if (existingResources) {
    for (const category in existingResources) {
      if (!resources[category]) {
        resources[category] = {};
      }
      for (const resourceName in existingResources[category]) {
        const savedResource = existingResources[category][resourceName];
        if (!resources[category][resourceName]) {
          // If the resource doesn't exist in the new defaults, add it directly from the save.
          resources[category][resourceName] = savedResource;
        }
      }
    }
  }

  // Restore default display values for all resources
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const res = resources[category][resourceName];
      if (res && typeof res.reinitializeDisplayElements === 'function') {
        res.reinitializeDisplayElements();
      }
    }
  }
  if (travelState?.resources) {
    restorePreservedTravelResourceState(resources, travelState.resources, resetLevel);
  }
  setProjectStorageProviders({});
  buildings = initializeBuildings(buildingsParameters);
  projectManager = new ProjectManager();
  projectManager.initializeProjects(projectParameters);
  if (travelState?.projects && typeof projectManager.loadTravelState === 'function') {
    projectManager.loadTravelState(travelState.projects, resetLevel);
  }
  colonies = initializeColonies(colonyParameters);
  structures = { ...buildings, ...colonies };
  if (travelState?.autoBuild && typeof restoreAutoBuildSettings === 'function') {
    restoreAutoBuildSettings(structures, travelState.autoBuild, resetLevel);
  }
  applyStructureDisplayPreferences(structures);
  if (travelState?.constructionOffice && typeof restoreConstructionOfficeSettings === 'function') {
    restoreConstructionOfficeSettings(travelState.constructionOffice, resetLevel);
  }

  const fundingRate = currentPlanetParameters.fundingRate || 0;
  fundingModule = new FundingModule(resources, fundingRate);
  populationModule = new PopulationModule(resources, currentPlanetParameters.populationParameters);

  lifeDesigner = new LifeDesigner();
  if (travelState?.lifeDesigner && lifeDesigner.restoreTravelState) {
    lifeDesigner.restoreTravelState(travelState.lifeDesigner, resetLevel);
  }
  lifeManager = new LifeManager();
  warpGateNetworkManager = new WarpGateNetworkManager();

  if (!managerSurvivesReset.research) {
    researchManager = new ResearchManager(researchParameters);
  } else {
    if (!globalGameIsLoadingFromSave && researchManager.clearEffectsOnTravel) {
      researchManager.clearEffectsOnTravel();
    }
    if (!globalGameIsLoadingFromSave && typeof researchManager.resetRegularResearch === 'function') {
      researchManager.resetRegularResearch();
    }
    if (typeof researchManager.reapplyEffects === 'function') {
      researchManager.reapplyEffects();
    }
  }
  projectManager.applyEffects();
  applyCompanionResearchTravelRewards();
  if (!managerSurvivesReset.skill) {
    skillManager = new SkillManager(skillParameters);
  }
  // Control values are world state, while slider unlocks/effects survive until
  // the manager's travel-state threshold is reached.
  colonySliderSettings.resetForLevel(resetLevel);
  if (typeof resetMirrorOversightSettings === 'function') {
    const mirrorProject = projectManager.projects.spaceMirrorFacility;
    const preserveMirrorSettings = isLayerReset
      && gameSettings.preserveProjectSettingsOnTravel
      && resetLevel < mirrorProject.travelStateResetAt;
    if (!preserveMirrorSettings) {
      resetMirrorOversightSettings();
    }
  }

  celestialParameters = currentPlanetParameters.celestialParameters;
  terraforming = new Terraforming(resources, celestialParameters, currentPlanetParameters.specialAttributes);
  terraforming.initializeTerraforming();
  terraformingGraphsManager.reset({
    preserveWindowState: isLayerReset && autoTravelContext && autoTravelContext.active
  });
  if (typeof window !== 'undefined') {
    window.terraformingManager = terraforming;
  }

  // Rebuild the Planet Visualizer with fresh references (resources/terraforming)
  const skipVisualizerInitialization = !!(
    autoTravelContext
    && autoTravelContext.active
    && autoTravelContext.skipWorldVisualizerInitialization
  );
  if (skipVisualizerInitialization) {
    suppressPlanetVisualizerRuntime = true;
    if (typeof window !== 'undefined') {
      window.destroyPlanetVisualizerUI();
    }
  } else if (typeof window !== 'undefined') {
    suppressPlanetVisualizerRuntime = false;
    window.initializePlanetVisualizerUI();
  }

  goldenAsteroid = new GoldenAsteroid();

  if (!managerSurvivesReset.automation) {
    automationManager = new AutomationManager();
  }
  if (!managerSurvivesReset.solis) {
    solisManager = new SolisManager();
  }
  if (!managerSurvivesReset.warpGateCommand) {
    warpGateCommand = new WarpGateCommand();
  }
  if (!managerSurvivesReset.patience) {
    patienceManager = new PatienceManager();
  }
  if (!managerSurvivesReset.earth) {
    earthManager = new EarthManager();
  }
  if (!managerSurvivesReset.followers) {
    followersManager = new FollowersManager();
  } else if (travelState?.followers && followersManager.restoreTravelState) {
    followersManager.restoreTravelState(travelState.followers, resetLevel);
  }
  if (!managerSurvivesReset.artificial) {
    artificialManager = setArtificialManager(new ArtificialManager());
  } else if (artificialManager && typeof artificialManager.updateUI === 'function') {
    artificialManager.updateUI({ force: true });
  }
  if (!managerSurvivesReset.atlas) {
    atlasManager = new AtlasManager();
  } else {
    atlasManager.refreshUIVisibility();
    atlasManager.updateUI({ force: true });
  }

  milestonesManager = new MilestonesManager();
  if (isLayerReset) {
    clearFestivalNotification();
  }
  if (!managerSurvivesReset.galaxy) {
    galaxyManager = new GalaxyManager();
  }
  if (!managerSurvivesReset.galaxyInvasion) {
    galaxyInvasionManager = new GalacticInvasionManager();
  }
  galaxyManager.galacticInvasionManager = galaxyInvasionManager;
  if (typeof galaxyManager.initialize === 'function') {
    galaxyManager.initialize();
  }
  warpGateNetworkManager.syncUnlocks();
  if (!managerSurvivesReset.story) {
    storyManager.destroy();
    storyManager = new StoryManager(progressData);  // Pass the progressData object
    if (!skipStoryInitialization) {
      storyManager.initializeStory();
    }
  }
  if (!managerSurvivesReset.space && !skipStoryInitialization) {
    spaceManager = new SpaceManager(planetParameters);
    globalThis.spaceManager = spaceManager;
  }
  spaceManager.syncGalacticPopulationResource();
  if (!managerSurvivesReset.achievement) {
    achievementManager = new AchievementManager();
  }

  hazardManager = setHazardManager(new HazardManager());
  const planetHazards = currentPlanetParameters && currentPlanetParameters.hazards
    ? currentPlanetParameters.hazards
    : {};
  hazardManager.initialize(planetHazards);
  if (travelState?.hazardousMachinery && hazardManager?.hazardousMachineryHazard?.loadTravelState) {
    hazardManager.hazardousMachineryHazard.loadTravelState(travelState.hazardousMachinery, resetLevel);
  }
  rebaseDynamicMassInitialGeometryAfterHazards();
  achievementManager.update();

  // Regenerate UI elements to bind to new objects
  createResourceDisplay(resources); // Also need to update resource display
  createBuildingButtons(buildings);
  if (typeof applyDayNightSettingEffects === 'function') {
    applyDayNightSettingEffects();
  }
  if (typeof initializeBuildingAlerts === 'function') {
    initializeBuildingAlerts();
  }
  createColonyButtons(colonies);
  if (projectManager.projects.matrioshkaBrain) {
    projectManager.projects.matrioshkaBrain.applyEffects();
  }
  initializeColonyAlerts();
  initializeFollowersUI();
  initializeColonySubtabs();
  initializeProjectsUI();
  renderProjects();
  if (typeof initializeProjectAlerts === 'function') {
    initializeProjectAlerts();
  }
  initializeColonySlidersUI();
  initializeResearchUI(); // Reinitialize research UI as well
  if (typeof initializeResearchAlerts === 'function') {
    initializeResearchAlerts();
  }
  initializeHopeUI();
  if (isLayerReset && typeof updateSpaceUI === 'function') {
    updateSpaceUI();
  } else if (!isLayerReset && typeof initializeSpaceUI === 'function') {
    initializeSpaceUI(spaceManager);
  }
  if (atlasManager) {
    atlasManager.refreshUIVisibility();
  }
  if (typeof galaxyManager?.refreshUIVisibility === 'function') {
    galaxyManager.refreshUIVisibility();
  } else if (typeof updateGalaxyUI === 'function') {
    updateGalaxyUI();
  }
  galaxyInvasionManager.refreshUIVisibility();
    updateLifeUI();

  // When keeping existing managers, reapplied story effects need to
  // target the newly created game objects for this planet.
  if (managerSurvivesReset.story && typeof storyManager.reapplyEffects === 'function') {
    storyManager.reapplyEffects();
  }
  if (managerSurvivesReset.skill && typeof skillManager.reapplyEffects === 'function') {
    skillManager.reapplyEffects();
  }
  if (isLayerReset) {
    applyDifficultySettingEffects();
  }
  if (managerSurvivesReset.automation && typeof automationManager.reapplyEffects === 'function') {
    automationManager.reapplyEffects();
  }
  if (managerSurvivesReset.solis && typeof solisManager.reapplyEffects === 'function') {
    solisManager.reapplyEffects({ grantStartingResources: true });
    hazardManager.applyTravelAdjustments(terraforming);
  }
  if (managerSurvivesReset.warpGateCommand && typeof warpGateCommand.reapplyEffects === 'function') {
    warpGateCommand.reapplyEffects();
  }
  if (managerSurvivesReset.patience && typeof patienceManager.reapplyEffects === 'function') {
    patienceManager.reapplyEffects();
  }
  if (managerSurvivesReset.followers && typeof followersManager.reapplyEffects === 'function') {
    followersManager.reapplyEffects();
  }
  if (managerSurvivesReset.atlas && typeof atlasManager.reapplyEffects === 'function') {
    atlasManager.reapplyEffects();
  }
  if (managerSurvivesReset.galaxyInvasion && galaxyInvasionManager.reapplyEffects) {
    galaxyInvasionManager.reapplyEffects();
  }
  if (typeof nanotechManager !== 'undefined' && typeof nanotechManager.reapplyEffects === 'function') {
    nanotechManager.reapplyEffects();
  }
  if (managerSurvivesReset.research) {
    researchManager.applyActiveEffects(false);
    researchManager.reapplyEffects();
  }

  applyPlanetParameterEffects();
  if (typeof applyRWGEffects === 'function') {
    applyRWGEffects();
  }
  hazardManager.ensureCrusaderPresence(terraforming);
  updateColonySubtabsVisibility();
  if (isLayerReset && typeof updateRender === 'function') {
    updateRender(true, { forceAllSubtabs: true });
  }
  if (managerSurvivesReset.automation) {
    automationManager.applyTravelCombinationPresets();
  }
  globalGameIsTraveling = false;
  restoreAutoTravelTabs();
  if (pendingAutoTravelTabRestore && typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      restoreAutoTravelTabs();
    });
  }
}

function updateLogic(delta, realDelta = delta) {
  if(isEquilibrating){
    return;
  }

  const increment = delta / 1000;
  playTimeSeconds += increment;
  totalPlayTimeSeconds += increment;
  dayNightCycle.update(delta);

  colonySliderSettings.updateColonySlidersEffect();

  if (!isCurrentWorldManagerDisabled('galaxyManager') && galaxyManager && typeof galaxyManager.update === 'function') {
    galaxyManager.update(delta);
  }
  if (!isCurrentWorldManagerDisabled('galaxyInvasionManager')) {
    galaxyInvasionManager.update(delta);
  }
  if (!isCurrentWorldManagerDisabled('rwgManager')) {
    rwgManager.updateDominionUnlocksFromGalaxy(galaxyManager);
  }
  warpGateNetworkManager.update(delta);

  const allStructures = {...buildings, ...colonies};

  produceResources(delta, allStructures);

  // Update happiness for each colony
  for (const colonyName in colonies) {
    const colony = colonies[colonyName];
    colony.updateHappiness(delta);
  }

  populationModule.updatePopulation(delta);

  projectManager.updateProjects(delta);

  autoBuild(allStructures, delta);

  goldenAsteroid.update(delta, realDelta);

  if (!isCurrentWorldManagerDisabled('solisManager') && solisManager) {
    solisManager.update(delta);
  }
  if (!isCurrentWorldManagerDisabled('spaceManager') && spaceManager) {
    spaceManager.update(delta);
  }
  if (!isCurrentWorldManagerDisabled('followersManager') && followersManager && typeof followersManager.update === 'function') {
    followersManager.update(delta);
  }
  if (!isCurrentWorldManagerDisabled('automationManager') && automationManager) {
    automationManager.update(delta);
  }
  if (!isCurrentWorldManagerDisabled('warpGateCommand') && warpGateCommand) {
    warpGateCommand.update(delta);
  }
  if (!isCurrentWorldManagerDisabled('artificialManager') && artificialManager) {
    artificialManager.update(delta);
  }
  if (!isCurrentWorldManagerDisabled('atlasManager') && atlasManager) {
    atlasManager.update(delta);
  }

  if (!isCurrentWorldManagerDisabled('lifeDesigner')) {
    lifeDesigner.update(delta);
  }

  if (!isCurrentWorldManagerDisabled('milestonesManager')) {
    milestonesManager.update(delta);
  }

  storyManager.update();
  achievementManager.update();

  recalculateTotalRates();


  if (!isCurrentWorldManagerDisabled('patienceManager')) {
    patienceManager.update(delta);
  }
  terraformingGraphsManager.update(delta);
}

function updateRender(force = false, options = {}) {
  const deltaMs = (typeof updateRender.lastDelta === 'number') ? updateRender.lastDelta : 0;
  const deltaSeconds = deltaMs / 1000;
  updateRender.lastDelta = 0;
  const forceAllSubtabs = options.forceAllSubtabs === true;

  // Always-on UI pieces
  updateDayNightDisplay();           // Day/night display is global
  updateResourceDisplay(resources, deltaSeconds);  // Resources are global
  updateWarnings();                  // Global warnings
  storyManager.updateCurrentObjectiveUI();
  // Always keep alert badges in sync regardless of active tab
  if (typeof updateBuildingAlert === 'function') updateBuildingAlert();
  updateColonyAlert();
  updateColonySubtabsVisibility();
  if (typeof updateProjectAlert === 'function') updateProjectAlert();
  if (typeof updateResearchAlert === 'function') updateResearchAlert();
  if (typeof updateHopeAlert === 'function') updateHopeAlert();
  updateSidebarAutomationToggleVisibility();
  updateAutomationUI();
  updateAutoTravelLoadingPopupVisibility();

  // Gate heavy per-tab UI updates behind tab visibility
  if (typeof document !== 'undefined') {
    updateResortVacationGoldButton();
    terraformingGraphsManager.render();
    const tabContentCache = updateRender.tabContentCache || (updateRender.tabContentCache = {});
    const isActive = (id) => {
      if (force) return true;
      let el = tabContentCache[id];
      if (!el || !el.isConnected) {
        el = document.getElementById(id);
        tabContentCache[id] = el;
      }
      return !!(el && el.classList.contains('active'));
    };

    if (isActive('buildings')) {
      updateBuildingDisplay(buildings);
    }

    if (isActive('colonies')) {
      const renderAllColonySubtabs = forceAllSubtabs;
      const renderPopulationColonySubtab = renderAllColonySubtabs || isColonySubtabActiveFromState('population-colonies');
      const renderNanocolonySubtab = renderAllColonySubtabs || isColonySubtabActiveFromState('nanocolony-colonies');
      const renderFollowersSubtab = renderAllColonySubtabs || isColonySubtabActiveFromState('followers-colonies');

      if (renderPopulationColonySubtab) {
        updateColonyDisplay(colonies);
        if (typeof updateGrowthRateDisplay === 'function') {
          updateGrowthRateDisplay();
        }
        updateColonySlidersUI();
      }
      if (
        nanotechManager &&
        renderNanocolonySubtab
      ) {
        nanotechManager.updateUI();
      }
      if (renderFollowersSubtab) {
        updateFollowersUI();
      }
    }

    if (isActive('special-projects')) {
      renderProjects();
      automationManager.spaceshipAutomation.updateManualControlsUI();
      if (projectManager) projectManager.uiDirty = false;
    }

    if (isActive('research')) {
      updateResearchUI();
    }

    if (isActive('terraforming')) {
      if (hazardManager && hazardManager.uiDirty) {
        hazardManager.updateUI();
      }
      updateTerraformingUI(deltaSeconds, { forceAllSubtabs });
      // Ensure the visualizer resizes once the tab becomes visible
      if (!suppressPlanetVisualizerRuntime && typeof window !== 'undefined' && window.planetVisualizer && typeof window.planetVisualizer.onResize === 'function') {
        window.planetVisualizer.onResize();
      }
    }

    if (isActive('space') && typeof updateSpaceUI === 'function') {
      updateSpaceUI();
      if (typeof updateGalaxyUI === 'function') {
        const forceGalaxy = force || forceAllSubtabs || !!(galaxyManager && galaxyManager.forceUIRefresh);
        updateGalaxyUI({ force: forceGalaxy });
        if (galaxyManager) {
          galaxyManager.uiDirty = false;
          galaxyManager.forceUIRefresh = false;
        }
      }
      if (typeof updateRWGEffectsUI === 'function') updateRWGEffectsUI();
    }

    if (isActive('hope')) {
      updateHopeUI();
    }

    if (isActive('settings')) {
      const activeSettingsSubtab = settingsSubtabManager.getActiveId();
      if (force || forceAllSubtabs || activeSettingsSubtab === 'statistics-settings-subtab') {
        updateStatisticsDisplay();
      }
      if (force || forceAllSubtabs || activeSettingsSubtab === 'achievements-settings-subtab') {
        updateAchievementsDisplay();
      }
    }
  } else {
    // Non-DOM environment fallback (tests or headless): keep previous behavior
    updateBuildingDisplay(buildings);
    updateColonyDisplay(colonies);
    if (typeof updateGrowthRateDisplay === 'function') updateGrowthRateDisplay();
    updateColonySlidersUI();
    if (nanotechManager) nanotechManager.updateUI();
    renderProjects();
    if (projectManager) projectManager.uiDirty = false;
    updateResearchUI();
    updateTerraformingUI(deltaSeconds, { forceAllSubtabs });
    updateStatisticsDisplay();
    updateAchievementsDisplay();
    updateHopeUI();
    if (typeof updateSpaceUI === 'function') updateSpaceUI();
    if (typeof updateGalaxyUI === 'function') updateGalaxyUI({ force: force || forceAllSubtabs });
  }

  // Milestones often affect multiple views; keep updated
  updateMilestonesUI();
}

function update(time, delta) {
  const now = performance.now();
  let deltaMs = now - lastFrameTimeMs;
  if (deltaMs > 1000) deltaMs = 1000;
  lastFrameTimeMs = now;
  if (isEquilibrating) {
    updateRender.lastDelta = 0;
    return;
  }
  const manuallyPaused = typeof isGamePaused === 'function' && isGamePaused();
  const scaledDelta = deltaMs * gameSpeed;
  if (manuallyPaused) {
    updateRender.lastDelta = 0;
    updateRender();
    return;
  }
  const realIncrement = deltaMs / 1000;
  realPlayTimeSeconds += realIncrement;
  totalRealPlayTimeSeconds += realIncrement;
  const quantizedDelta = Math.floor((scaledDelta + logicDeltaCarryMs) / LOGIC_DELTA_QUANTUM_MS) * LOGIC_DELTA_QUANTUM_MS;
  logicDeltaCarryMs = scaledDelta + logicDeltaCarryMs - quantizedDelta;
  if (quantizedDelta <= 0) {
    goldenAsteroid.update(0, deltaMs);
    return;
  }
  updateLogic(quantizedDelta, deltaMs);   // Update game state
  const autoPaused = checkAutoPauseRates();
  updateRender.lastDelta = quantizedDelta;
  if (autoPaused) {
    updatePauseControls();
  }
  updateRender();             // Render updated game state

  autosave(quantizedDelta);      // Call the autosave function
}

function startNewGame() {
  defaultPlanet = 'mars';
  currentPlanetParameters = getPlanetParameters('mars');
  resetDifficultySettings();
  totalPlayTimeSeconds = 0;
  totalRealPlayTimeSeconds = 0;
  fastestTerraformDays = null;
  fastestTerraformRealSeconds = null;
  birchWorldTerraformTimeSeconds = null;
  birchWorldTerraformRealTimeSeconds = null;
  gameCompleted = false;
  initializeGameState();
  if (typeof openTerraformingWorldTab === 'function') {
    openTerraformingWorldTab();
  }
  updateRender(true, { forceAllSubtabs: true });
}

