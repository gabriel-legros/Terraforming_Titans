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
    limit: 30,  // The game will run at 30 updates per second
    forceSetTimeOut: true  // Don't use RAF
  },
  autoPause: false  // This prevents the game from pausing when the tab is inactive
};

const game = new Phaser.Game(config);
if (typeof globalThis !== 'undefined') {
  globalThis.game = game;
}
let lastFrameTimeMs = 0;
const LOGIC_DELTA_QUANTUM_MS = 10;
let logicDeltaCarryMs = 0;

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

function preload() {
  // Load assets (images, sounds, etc.) here
}

function create() {
  initializeDefaultGlobals();

  // Initialize the Planet Visualizer (Terraforming -> World subtab)
  window.initializePlanetVisualizerUI();
  
  if(!loadMostRecentSave()){  // Handle initial game state (building counts, etc.)
      initializeGameState();
      if (typeof openTerraformingWorldTab === 'function') {
        openTerraformingWorldTab();
      }
      if (typeof hideLoadingOverlay === 'function') {
        hideLoadingOverlay();
      }
      resetGameFrameClock(true);
    }
    return;
}

function initializeDefaultGlobals(){
  if (!gameSettings.pauseKeybind) {
    gameSettings.pauseKeybind = 'Space';
  }
  setPauseKeybindCode(gameSettings.pauseKeybind);
  shipEfficiency = 1;
  // Instantiate the TabManager and load tabs from the constant
  tabManager = new TabManager({
    description: 'Manages game tabs and unlocks them based on effects.',
  }, tabParameters);

  resetStructureDisplayState();
  resetProjectDisplayState();
  if (gameSettings.keepTabRunningAudio) {
    startBackgroundSilence();
  }

  // Set up the game scene, objects, and initial state
  const rotation = currentPlanetParameters.celestialParameters.rotationPeriod || 24;
  const { duration: dayDuration, direction: rotationDirection } = rotationPeriodToDuration(rotation);
  dayNightCycle = new DayNightCycle(dayDuration, rotationDirection);
  updateDayNightDisplay();

  // Initialize resources
  resources = createResources(currentPlanetParameters.resources);
  createResourceDisplay(resources);
  celestialParameters = currentPlanetParameters.celestialParameters;
  terraforming = new Terraforming(resources, celestialParameters, currentPlanetParameters.specialAttributes);

  // Initialize buildings
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
    updateStatisticsDisplay();
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
  autoTravelLoadingPopupElement.textContent = t('ui.autoTravelLoading', {}, 'Auto travel in progress...');
  if (!autoTravelLoadingPopupElement.parentNode) {
    document.body.appendChild(autoTravelLoadingPopupElement);
  }
  autoTravelLoadingPopupElement.classList.remove('auto-travel-loading-popup--hidden');
  autoTravelLoadingPopupElement.setAttribute('aria-hidden', 'false');
}

function hideAutoTravelLoadingPopup() {
  if (!autoTravelLoadingPopupElement) {
    autoTravelLoadingPopupElement = document.getElementById('auto-travel-loading-popup');
  }
  if (!autoTravelLoadingPopupElement) {
    return;
  }
  autoTravelLoadingPopupElement.classList.add('auto-travel-loading-popup--hidden');
  autoTravelLoadingPopupElement.setAttribute('aria-hidden', 'true');
}

function updateAutoTravelLoadingPopupVisibility() {
  if (globalGameIsTraveling || isEquilibrating || (autoTravelContext && autoTravelContext.active)) {
    return;
  }
  hideAutoTravelLoadingPopup();
}

function prepareForTravel(options = {}) {
  if (options.savePretravel !== false) {
    try {
      saveGameToSlot('pretravel');
    } catch (_) {}
  }

  const travelState = {
    projects: projectManager?.saveTravelState?.(),
    followers: followersManager?.prepareTravelState?.()
  };

  hazardManager?.prepareForTravel?.(terraforming);
  nanotechManager?.prepareForTravel?.();

  preparedTravelState = travelState;
  return travelState;
}

function initializeGameState(options = {}) {
  const preserveManagers = options.preserveManagers || false;
  const preserveJournal = options.preserveJournal || false;
  const skipStoryInitialization = options.skipStoryInitialization || false;
  if (!preserveManagers) {
    shipEfficiency = 1;
  }
  globalGameIsTraveling = preserveManagers && !globalGameIsLoadingFromSave;
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
  let savedTravelResources = null;
  let savedProjectTravelState = null;
  let savedConstructionOffice = null;
  let savedLifeDesignerTravelState = null;
  let savedFollowersTravelState = null;
  let savedHazardousMachineryTravelState = null;
  if (!preserveManagers && !globalGameIsLoadingFromSave) {
    resetStructureDisplayState();
    resetProjectDisplayState();
    resetResourceCategoryCollapseState();
  } else if (preserveManagers && !globalGameIsLoadingFromSave && !gameSettings.keepHiddenStructuresOnTravel) {
    structureDisplayState.hidden = {};
  }
  if (preserveManagers && !globalGameIsLoadingFromSave && !gameSettings.keepHiddenResearchOnTravel && typeof resetHiddenResearchOnTravel === 'function') {
    resetHiddenResearchOnTravel();
  }
  goldenAsteroid?.resetForTravel?.();
  if (preserveManagers) {
    // Use prepared travel state from departure when available to avoid overwriting pretravel save.
    const travelState = preparedTravelState || prepareForTravel({ savePretravel: false });
    preparedTravelState = null;
    savedProjectTravelState = travelState.projects;
    savedFollowersTravelState = travelState.followers;
    savedHazardousMachineryTravelState = hazardManager?.hazardousMachineryHazard?.save
      ? hazardManager.hazardousMachineryHazard.save()
      : null;
  }
  if (preserveManagers && typeof captureAutoBuildSettings === 'function' && typeof structures !== 'undefined') {
    captureAutoBuildSettings(structures);
  }
  if (preserveManagers && typeof captureConstructionOfficeSettings === 'function') {
    savedConstructionOffice = captureConstructionOfficeSettings();
  }
  if (preserveManagers && resources) {
    savedTravelResources = capturePreservedTravelResourceState(resources);
  }
  if (preserveManagers && lifeDesigner?.prepareTravelState) {
    savedLifeDesignerTravelState = lifeDesigner.prepareTravelState();
  }
  tabManager = new TabManager({
    description: 'Manages game tabs and unlocks them based on effects.',
  }, tabParameters);

  if (!preserveJournal && typeof resetJournal === 'function') {
    resetJournal();
  }

  if (!preserveManagers) {
    gameSettings.autosaveIntervalSeconds = 300;
    gameSettings.useCelsius = false;
    gameSettings.disableDayNightCycle = false;
    gameSettings.showSpaceStorageResources = false;
    gameSettings.disableFusionConsumptionScaling = false;
    gameSettings.disableSpeedControls = false;
    gameSettings.unfulfilledMaintenancePenalties = false;
    gameSettings.earlyAdvancedOversight = false;
    gameSettings.factoryHeating = false;
    gameSettings.realisticFactoryEnergyConsumption = false;
    gameSettings.buildingCostMultiplier = 1;
    gameSettings.researchCostMultiplier = 1;
    gameSettings.workerRequirementMultiplier = 1;
    gameSettings.projectDurationMultiplier = 1;
    gameSettings.popGrowthMultiplier = 1;
    gameSettings.lifeGrowthMultiplier = 1;
    gameSettings.maintenanceCostMultiplier = 1;
    gameSettings.spaceshipEnergyBeforeSpaceElevatorMultiplier = 1;
    gameSettings.spaceshipEnergyAfterSpaceElevatorMultiplier = 1;
    gameSettings.advancedResearchMultiplier = 1;
    gameSettings.galaxyFleetCapacityMultiplier = 1;
    gameSettings.galaxyThreatScalingMultiplier = 1;
    gameSettings.artificialWorldConstructionTimeMultiplier = 1;
    if (!globalGameIsLoadingFromSave) {
      fastestTerraformDays = null;
      fastestTerraformRealSeconds = null;
      birchWorldTerraformTimeSeconds = null;
      birchWorldTerraformRealTimeSeconds = null;
    }
    const dayNightToggle = typeof document !== 'undefined' ? document.getElementById('day-night-toggle') : null;
    if (dayNightToggle) {
      dayNightToggle.checked = gameSettings.disableDayNightCycle;
    }
    updateDifficultySettingInputs();
    nanotechManager.reset();
  }

  globalEffects = new EffectableEntity({description : 'Manages global effects'});
  androidResearch.activeEffects = [];
  androidResearch.booleanFlags = new Set();

  playTimeSeconds = 0;
  realPlayTimeSeconds = 0;
  patienceManager.resetWorldPatience();

  const rotation = currentPlanetParameters.celestialParameters.rotationPeriod || 24;
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
  if (savedTravelResources) {
    restorePreservedTravelResourceState(resources, savedTravelResources);
  }
  buildings = initializeBuildings(buildingsParameters);
  projectManager = new ProjectManager();
  projectManager.initializeProjects(projectParameters);
  if (savedProjectTravelState && typeof projectManager.loadTravelState === 'function') {
    projectManager.loadTravelState(savedProjectTravelState);
  }
  colonies = initializeColonies(colonyParameters);
  structures = { ...buildings, ...colonies };
  if (preserveManagers && typeof restoreAutoBuildSettings === 'function') {
    restoreAutoBuildSettings(structures);
  }
  applyStructureDisplayPreferences(structures);
  if (savedConstructionOffice && typeof restoreConstructionOfficeSettings === 'function') {
    restoreConstructionOfficeSettings(savedConstructionOffice);
  }

  const fundingRate = currentPlanetParameters.fundingRate || 0;
  fundingModule = new FundingModule(resources, fundingRate);
  populationModule = new PopulationModule(resources, currentPlanetParameters.populationParameters);

  lifeDesigner = new LifeDesigner();
  if (preserveManagers && savedLifeDesignerTravelState && lifeDesigner.restoreTravelState) {
    lifeDesigner.restoreTravelState(savedLifeDesignerTravelState);
  }
  lifeManager = new LifeManager();
  warpGateNetworkManager = new WarpGateNetworkManager();

  if (!preserveManagers || !researchManager) {
    researchManager = new ResearchManager(researchParameters);
  } else {
    if (!globalGameIsLoadingFromSave && typeof researchManager.resetRegularResearch === 'function') {
      researchManager.resetRegularResearch();
    }
    if (typeof researchManager.reapplyEffects === 'function') {
      researchManager.reapplyEffects();
    }
  }
  projectManager.applyEffects();
  applyCompanionResearchTravelRewards();
  if (!preserveManagers || !skillManager) {
    skillManager = new SkillManager(skillParameters);
  }
  // Reset colony management sliders to their default values
  // so a fresh game always starts from a clean state. Saved games
  // will overwrite these values after loading.
  if (typeof resetColonySliders === 'function') {
    resetColonySliders(!preserveManagers);
  }
  if (typeof resetMirrorOversightSettings === 'function') {
    if (!preserveManagers || !gameSettings.preserveProjectSettingsOnTravel) {
      resetMirrorOversightSettings();
    }
  }

  celestialParameters = currentPlanetParameters.celestialParameters;
  terraforming = new Terraforming(resources, celestialParameters, currentPlanetParameters.specialAttributes);
  terraforming.initializeTerraforming();
  terraformingGraphsManager.reset({
    preserveWindowState: preserveManagers && autoTravelContext && autoTravelContext.active
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
      try {
        const pv = window.planetVisualizer;
        if (pv) {
          if (typeof pv.onResize === 'function') {
            window.removeEventListener('resize', pv.onResize);
          }
          const canvas = pv.renderer && pv.renderer.domElement;
          if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
          if (pv.debug && pv.debug.container && pv.debug.container.parentNode) {
            pv.debug.container.parentNode.removeChild(pv.debug.container);
          }
          window.planetVisualizer = null;
        }
      } catch (e) {}
    }
  } else if (typeof window !== 'undefined') {
    suppressPlanetVisualizerRuntime = false;
    try {
      const pv = window.planetVisualizer;
      if (pv) {
        // Detach resize listener
        if (typeof pv.onResize === 'function') {
          window.removeEventListener('resize', pv.onResize);
        }
        // Remove canvas
        const canvas = pv.renderer && pv.renderer.domElement;
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        // Remove debug panel if present
        if (pv.debug && pv.debug.container && pv.debug.container.parentNode) {
          pv.debug.container.parentNode.removeChild(pv.debug.container);
        }
        window.planetVisualizer = null;
      }
      if (typeof window.initializePlanetVisualizerUI === 'function') {
        window.initializePlanetVisualizerUI();
      }
    } catch (e) {
      // Non-fatal if visualizer not yet available
    }
  }

  goldenAsteroid = new GoldenAsteroid();

  if (!preserveManagers || !automationManager) {
    automationManager = new AutomationManager();
  }
  if (!preserveManagers || !solisManager) {
    solisManager = new SolisManager();
  }
  if (!preserveManagers || !warpGateCommand) {
    warpGateCommand = new WarpGateCommand();
  }
  if (!preserveManagers || !patienceManager) {
    patienceManager = new PatienceManager();
  }
  if (!preserveManagers || !earthManager) {
    earthManager = new EarthManager();
  }
  if (!preserveManagers || !followersManager) {
    followersManager = new FollowersManager();
  } else if (preserveManagers && savedFollowersTravelState && followersManager.restoreTravelState) {
    followersManager.restoreTravelState(savedFollowersTravelState);
  }
  if (!preserveManagers || !artificialManager) {
    artificialManager = setArtificialManager(new ArtificialManager());
  } else if (artificialManager && typeof artificialManager.updateUI === 'function') {
    artificialManager.updateUI({ force: true });
  }
  if (!preserveManagers || !atlasManager) {
    atlasManager = new AtlasManager();
  } else {
    atlasManager.refreshUIVisibility();
    atlasManager.updateUI({ force: true });
  }

  milestonesManager = new MilestonesManager();
  if (preserveManagers) {
    clearFestivalNotification();
  }
  if (!preserveManagers || !galaxyManager) {
    galaxyManager = new GalaxyManager();
  }
  if (!preserveManagers || !galaxyInvasionManager) {
    galaxyInvasionManager = new GalacticInvasionManager();
  }
  galaxyManager.galacticInvasionManager = galaxyInvasionManager;
  if (typeof galaxyManager.initialize === 'function') {
    galaxyManager.initialize();
  }
  warpGateNetworkManager.syncUnlocks();
  if (!preserveManagers) {
    storyManager = new StoryManager(progressData);  // Pass the progressData object
    if (!skipStoryInitialization) {
      storyManager.initializeStory();
      spaceManager = new SpaceManager(planetParameters);
      globalThis.spaceManager = spaceManager;
    }
  }

  hazardManager = setHazardManager(new HazardManager());
  const planetHazards = currentPlanetParameters && currentPlanetParameters.hazards
    ? currentPlanetParameters.hazards
    : {};
  hazardManager.initialize(planetHazards);
  if (preserveManagers && savedHazardousMachineryTravelState && hazardManager?.hazardousMachineryHazard?.load) {
    hazardManager.hazardousMachineryHazard.load(savedHazardousMachineryTravelState);
  }

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
  if (preserveManagers && typeof updateSpaceUI === 'function') {
    updateSpaceUI();
  } else if (!preserveManagers && typeof initializeSpaceUI === 'function') {
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
  if (preserveManagers && storyManager && typeof storyManager.reapplyEffects === 'function') {
    storyManager.reapplyEffects();
  }
  if (preserveManagers && skillManager && typeof skillManager.reapplyEffects === 'function') {
    skillManager.reapplyEffects();
  }
  if (preserveManagers && automationManager && typeof automationManager.reapplyEffects === 'function') {
    automationManager.reapplyEffects();
  }
  if (preserveManagers && solisManager && typeof solisManager.reapplyEffects === 'function') {
    solisManager.reapplyEffects({ grantStartingResources: true });
    hazardManager.applyTravelAdjustments(terraforming);
  }
  if (preserveManagers && warpGateCommand && typeof warpGateCommand.reapplyEffects === 'function') {
    warpGateCommand.reapplyEffects();
  }
  if (preserveManagers && patienceManager && typeof patienceManager.reapplyEffects === 'function') {
    patienceManager.reapplyEffects();
  }
  if (preserveManagers && followersManager && typeof followersManager.reapplyEffects === 'function') {
    followersManager.reapplyEffects();
  }
  if (preserveManagers && atlasManager && typeof atlasManager.reapplyEffects === 'function') {
    atlasManager.reapplyEffects();
  }
  if (preserveManagers && galaxyInvasionManager && galaxyInvasionManager.reapplyEffects) {
    galaxyInvasionManager.reapplyEffects();
  }
  if (typeof nanotechManager !== 'undefined' && typeof nanotechManager.reapplyEffects === 'function') {
    nanotechManager.reapplyEffects();
  }
  if (preserveManagers) {
    researchManager.applyActiveEffects(false);
    researchManager.reapplyEffects();
  }

  applyPlanetParameterEffects();
  if (typeof applyRWGEffects === 'function') {
    applyRWGEffects();
  }
  hazardManager.ensureCrusaderPresence(terraforming);
  updateColonySubtabsVisibility();
  if (preserveManagers && typeof updateRender === 'function') {
    updateRender(true, { forceAllSubtabs: true });
  }
  if (preserveManagers && automationManager) {
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
  buildings.antimatterBattery.updateAutoFillAfterProductionTick(delta);

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

  // **** Update the Story Manager ****
  // This will check objectives for active events, process completions,
  // apply rewards, and check for/activate newly available events.
  storyManager.update(); // <--- NEW CENTRAL UPDATE CALL

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
  updateAutoTravelLoadingPopupVisibility();

  // Gate heavy per-tab UI updates behind tab visibility
  if (typeof document !== 'undefined') {
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

    // Push world coverage to the visualizer for shading/tinting
    if (!suppressPlanetVisualizerRuntime && typeof window !== 'undefined' && window.planetVisualizer) {
      try {
        const pv = window.planetVisualizer;
        const mode = pv?.debug?.mode || 'game';
        if (mode !== 'debug') {
          // Global coverages for tinting
          const waterFrac = calculateAverageCoverage(terraforming, 'liquidWater') || 0;
          const lifeFrac = calculateAverageCoverage(terraforming, 'biomass') || 0;
          const pct = (x) => Math.max(0, Math.min(100, x * 100));
          pv.viz.coverage.water = pct(waterFrac);
          pv.viz.coverage.life = pct(lifeFrac);
          const cloudFrac = Number.isFinite(terraforming?.luminosity?.cloudFraction)
            ? Math.max(0, Math.min(1, terraforming.luminosity.cloudFraction))
            : waterFrac;
          pv.viz.coverage.cloud = pct(cloudFrac);

          // Zonal coverages for rendering bands
          const zones = ['tropical', 'temperate', 'polar'];
          const zonal = {};
          let hazardousLifeSum = 0;
          let zoneWeightSum = 0;
          for (const z of zones) {
            // Returns fractions 0..1
            const f = calculateZonalSurfaceFractions(terraforming, z);
            const hazardousLife = Math.max(0, Math.min(1, terraforming.zonalCoverageCache[z]?.hazardousBiomass || 0));
            const zoneWeight = terraforming.getZoneWeight ? terraforming.getZoneWeight(z) : getZonePercentage(z);
            hazardousLifeSum += hazardousLife * zoneWeight;
            zoneWeightSum += zoneWeight;
            zonal[z] = {
              water: Math.max(0, Math.min(1, f.ocean || 0)),
              ice: Math.max(0, Math.min(1, f.ice || 0)),
              life: Math.max(0, Math.min(1, f.biomass || 0)),
              hazardousLife,
            };
          }
          if (
            spaceManager.getCurrentPlanetKey() === 'earth' &&
            earthManager &&
            earthManager.enabled &&
            earthManager.getActionCount('addWater') >= EARTH_RECONSTRUCTION_MAX_WATER_STEPS
          ) {
            zonal.tropical.water = 0.71;
            zonal.temperate.water = 0.70;
          }
          pv.viz.coverage.hazardousLife = pct(zoneWeightSum > 0 ? hazardousLifeSum / zoneWeightSum : 0);
          pv.viz.zonalCoverage = zonal;
          if (typeof pv.setBaseColor === 'function') {
            const baseColor = pv.getGameBaseColor
              ? pv.getGameBaseColor()
              : currentPlanetParameters?.visualization?.baseColor;
            pv.setBaseColor(baseColor, { fromGame: true });
          }
        }
      } catch (e) {
        // Non-fatal if terraforming utilities are not ready yet
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
      updateStatisticsDisplay();
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
  updateRender.lastDelta = quantizedDelta;
  updateRender();             // Render updated game state

  autosave(quantizedDelta);      // Call the autosave function
}

function startNewGame() {
  defaultPlanet = 'mars';
  currentPlanetParameters = getPlanetParameters('mars');
  totalPlayTimeSeconds = 0;
  totalRealPlayTimeSeconds = 0;
  birchWorldTerraformTimeSeconds = null;
  birchWorldTerraformRealTimeSeconds = null;
  gameCompleted = false;
  initializeGameState();
  if (typeof openTerraformingWorldTab === 'function') {
    openTerraformingWorldTab();
  }
  updateRender(true, { forceAllSubtabs: true });
}

