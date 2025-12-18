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
    }
    return;
}

function initializeDefaultGlobals(){
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

  celestialParameters = currentPlanetParameters.celestialParameters;
  terraforming = new Terraforming(resources, celestialParameters, currentPlanetParameters.specialAttributes);
  terraforming.initializeTerraforming();
  // Expose a stable reference for UI modules (avoid DOM id 'terraforming' collisions)
  if (typeof window !== 'undefined') {
    window.terraformingManager = terraforming;
  }
  // Expose a stable reference for UI modules (avoid DOM id 'terraforming' collisions)
  if (typeof window !== 'undefined') {
    window.terraformingManager = terraforming;
  }

  goldenAsteroid = new GoldenAsteroid();

  automationManager = new AutomationManager();
  solisManager = new SolisManager();
  warpGateCommand = new WarpGateCommand();

  nanotechManager = new NanotechManager();

  lifeDesigner = new LifeDesigner();
  lifeManager = new LifeManager();
  initializeLifeUI();

  milestonesManager = new MilestonesManager();
  createMilestonesUI();

  spaceManager = new SpaceManager(planetParameters);
  globalThis.spaceManager = spaceManager;
  galaxyManager = new GalaxyManager();
  artificialManager = setArtificialManager(new ArtificialManager());
  initializeHopeUI();
  initializeSpaceUI(spaceManager);
  if (typeof galaxyManager.initialize === 'function') {
    galaxyManager.initialize();
  }

  rwgManager = new RwgManager();
  patienceManager = new PatienceManager();
  }

/**
 * Unified method to prepare for planet travel.
 * Saves pre-travel state and returns travel state data for managers that persist.
 * @returns {Object} Travel state data to be restored after travel
 */
function prepareForTravel() {
  // Save pre-travel game state
  if (typeof saveGameToSlot === 'function') {
    try {
      saveGameToSlot('pretravel');
    } catch (_) {}
  }

  const travelState = {};

  // Save project manager travel state (includes space storage and all projects)
  if (typeof projectManager !== 'undefined' && typeof projectManager.saveTravelState === 'function') {
    travelState.projects = projectManager.saveTravelState();
  }

  // Save nanotech manager travel state
  if (typeof nanotechManager !== 'undefined' && typeof nanotechManager.prepareForTravel === 'function') {
    nanotechManager.prepareForTravel();
  }

  return travelState;
}

function initializeGameState(options = {}) {
  const preserveManagers = options.preserveManagers || false;
  const preserveJournal = options.preserveJournal || false;
  const skipStoryInitialization = options.skipStoryInitialization || false;
  let savedAdvancedResearch = null;
  let savedAlienArtifact = null;
  let savedProjectTravelState = null;
  let savedConstructionOffice = null;
  let savedAntimatter = null;
  let savedLifeDesignerTravelState = null;
  if (!preserveManagers && !globalGameIsLoadingFromSave) {
    resetStructureDisplayState();
    resetProjectDisplayState();
  } else if (preserveManagers && !globalGameIsLoadingFromSave && !gameSettings.keepHiddenStructuresOnTravel) {
    structureDisplayState.hidden = {};
  }
  goldenAsteroid?.resetForTravel?.();
  if (preserveManagers) {
    // Use unified prepareForTravel when preserving managers (planet travel)
    const travelState = prepareForTravel();
    savedProjectTravelState = travelState.projects;
  }
  if (preserveManagers && typeof captureAutoBuildSettings === 'function' && typeof structures !== 'undefined') {
    captureAutoBuildSettings(structures);
  }
  if (preserveManagers && typeof captureConstructionOfficeSettings === 'function') {
    savedConstructionOffice = captureConstructionOfficeSettings();
  }
  if (preserveManagers && resources && resources.colony && resources.colony.advancedResearch) {
    savedAdvancedResearch = {
      value: resources.colony.advancedResearch.value,
      unlocked: resources.colony.advancedResearch.unlocked,
    };
  }
  if (preserveManagers && resources && resources.special && resources.special.alienArtifact) {
    savedAlienArtifact = {
      value: resources.special.alienArtifact.value,
      unlocked: resources.special.alienArtifact.unlocked,
    };
  }
  if (preserveManagers && resources && resources.special && resources.special.antimatter) {
    savedAntimatter = {
      value: resources.special.antimatter.value,
      unlocked: resources.special.antimatter.unlocked,
      enabled: resources.special.antimatter.enabled,
    };
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
    gameSettings.disableAutosave = false;
    gameSettings.useCelsius = false;
    gameSettings.disableDayNightCycle = false;
    const dayNightToggle = typeof document !== 'undefined' ? document.getElementById('day-night-toggle') : null;
    if (dayNightToggle) {
      dayNightToggle.checked = gameSettings.disableDayNightCycle;
    }
    nanotechManager.reset();
  }

  globalEffects = new EffectableEntity({description : 'Manages global effects'});

  playTimeSeconds = 0;
  realPlayTimeSeconds = 0;

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
  if (savedAdvancedResearch) {
    resources.colony.advancedResearch.value = savedAdvancedResearch.value;
    resources.colony.advancedResearch.unlocked = savedAdvancedResearch.unlocked;
  }
  if (savedAlienArtifact) {
    resources.special.alienArtifact.value = savedAlienArtifact.value;
    resources.special.alienArtifact.unlocked = savedAlienArtifact.unlocked;
  }
  if (savedAntimatter) {
    resources.special.antimatter.value = savedAntimatter.value;
    resources.special.antimatter.unlocked = savedAntimatter.unlocked;
    if (Object.prototype.hasOwnProperty.call(savedAntimatter, 'enabled')) {
      resources.special.antimatter.enabled = savedAntimatter.enabled;
    }
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
  if (
    projectManager?.projects?.satellite &&
    researchManager.getResearchById('companion_satellite')?.isResearched &&
    spaceManager?.getTerraformedPlanetCount
  ) {
    const count = Math.floor(spaceManager.getTerraformedPlanetCount());
    const proj = projectManager.projects.satellite;
    proj.repeatCount = Math.min(count, proj.maxRepeatCount);
    proj.update?.(0);
  }
  if (!preserveManagers || !skillManager) {
    skillManager = new SkillManager(skillParameters);
  }
  // Reset colony management sliders to their default values
  // so a fresh game always starts from a clean state. Saved games
  // will overwrite these values after loading.
  if (typeof resetColonySliders === 'function') {
    resetColonySliders();
  }
  if (typeof resetMirrorOversightSettings === 'function') {
    resetMirrorOversightSettings();
  }

  celestialParameters = currentPlanetParameters.celestialParameters;
  terraforming = new Terraforming(resources, celestialParameters, currentPlanetParameters.specialAttributes);
  terraforming.initializeTerraforming();

  // Rebuild the Planet Visualizer with fresh references (resources/terraforming)
  if (typeof window !== 'undefined') {
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
  if (!preserveManagers || !artificialManager) {
    artificialManager = setArtificialManager(new ArtificialManager());
  } else if (artificialManager && typeof artificialManager.updateUI === 'function') {
    artificialManager.updateUI({ force: true });
  }

  milestonesManager = new MilestonesManager();
  if (!preserveManagers || !galaxyManager) {
    galaxyManager = new GalaxyManager();
  }
  if (typeof galaxyManager.initialize === 'function') {
    galaxyManager.initialize();
  }
  if (!preserveManagers) {
    storyManager = new StoryManager(progressData);  // Pass the progressData object
    if (!skipStoryInitialization) {
      storyManager.initializeStory();
      spaceManager = new SpaceManager(planetParameters);
      globalThis.spaceManager = spaceManager;
    }
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
  if (typeof galaxyManager?.refreshUIVisibility === 'function') {
    galaxyManager.refreshUIVisibility();
  } else if (typeof updateGalaxyUI === 'function') {
    updateGalaxyUI();
  }

  hazardManager = setHazardManager(new HazardManager());
  const planetHazards = currentPlanetParameters && currentPlanetParameters.hazards
    ? currentPlanetParameters.hazards
    : {};
  hazardManager.initialize(planetHazards);

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
    solisManager.reapplyEffects();
  }
  if (preserveManagers && warpGateCommand && typeof warpGateCommand.reapplyEffects === 'function') {
    warpGateCommand.reapplyEffects();
  }
  if (preserveManagers && patienceManager && typeof patienceManager.reapplyEffects === 'function') {
    patienceManager.reapplyEffects();
  }
  if (typeof nanotechManager !== 'undefined' && typeof nanotechManager.reapplyEffects === 'function') {
    nanotechManager.reapplyEffects();
  }

  hazardManager.ensureCrusaderPresence(terraforming);
}

function updateLogic(delta) {
  const increment = delta / 1000;
  playTimeSeconds += increment;
  totalPlayTimeSeconds += increment;
  dayNightCycle.update(delta);

  colonySliderSettings.updateColonySlidersEffect();

  if (galaxyManager && typeof galaxyManager.update === 'function') {
    galaxyManager.update(delta);
  }

  const allStructures = {...buildings, ...colonies};

  produceResources(delta, allStructures);

  // Update happiness for each colony
  for (const colonyName in colonies) {
    const colony = colonies[colonyName];
    colony.updateHappiness(delta);
  }

  populationModule.updatePopulation(delta);

  autoBuild(allStructures, delta);

  projectManager.updateProjects(delta);

  goldenAsteroid.update(delta);

  if (solisManager) {
    solisManager.update(delta);
  }
  if (automationManager) {
    automationManager.update(delta);
  }
  if (warpGateCommand) {
    warpGateCommand.update(delta);
  }
  if (artificialManager) {
    artificialManager.update(delta);
  }

  lifeDesigner.update(delta);

  milestonesManager.update(delta);

  // **** Update the Story Manager ****
  // This will check objectives for active events, process completions,
  // apply rewards, and check for/activate newly available events.
  storyManager.update(); // <--- NEW CENTRAL UPDATE CALL

  if (typeof applyRWGEffects === 'function') {
    applyRWGEffects();
  }

  recalculateTotalRates();


  patienceManager.update();
}

function updateRender(force = false, options = {}) {
  const deltaMs = (typeof updateRender.lastDelta === 'number') ? updateRender.lastDelta : 0;
  const deltaSeconds = Math.max(0, Math.min(0.1, deltaMs / 1000));
  updateRender.lastDelta = 0;
  const forceAllSubtabs = options.forceAllSubtabs === true;

  // Always-on UI pieces
  updateDayNightDisplay();           // Day/night display is global
  updateResourceDisplay(resources, deltaSeconds);  // Resources are global
  updateWarnings();                  // Global warnings
  // Always keep alert badges in sync regardless of active tab
  if (typeof updateBuildingAlert === 'function') updateBuildingAlert();
  if (typeof updateProjectAlert === 'function') updateProjectAlert();
  if (typeof updateResearchAlert === 'function') updateResearchAlert();
  if (typeof updateHopeAlert === 'function') updateHopeAlert();

  // Gate heavy per-tab UI updates behind tab visibility
  if (typeof document !== 'undefined') {
    const isActive = (id) => {
      if (force) return true;
      const el = document.getElementById(id);
      return !!(el && el.classList.contains('active'));
    };

    if (isActive('buildings')) {
      updateBuildingDisplay(buildings);
    }

    if (isActive('colonies')) {
      updateColonyDisplay(colonies);
      if (typeof updateGrowthRateDisplay === 'function') {
        updateGrowthRateDisplay();
      }
      updateColonySlidersUI();
    }

    if (isActive('special-projects')) {
      renderProjects();
    }

    if (isActive('research')) {
      updateResearchUI();
    }

    if (isActive('terraforming')) {
      updateTerraformingUI(deltaSeconds, { forceAllSubtabs });
      // Ensure the visualizer resizes once the tab becomes visible
      if (typeof window !== 'undefined' && window.planetVisualizer && typeof window.planetVisualizer.onResize === 'function') {
        window.planetVisualizer.onResize();
      }
    }

    // Push world coverage to the visualizer for shading/tinting
    if (typeof window !== 'undefined' && window.planetVisualizer) {
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
          for (const z of zones) {
            // Returns fractions 0..1
            const f = calculateZonalSurfaceFractions(terraforming, z);
            zonal[z] = {
              water: Math.max(0, Math.min(1, f.ocean || 0)),
              ice: Math.max(0, Math.min(1, f.ice || 0)),
            };
          }
          pv.viz.zonalCoverage = zonal;
          if (typeof pv.setBaseColor === 'function') {
            const baseColor = currentPlanetParameters?.visualization?.baseColor;
            pv.setBaseColor(baseColor, { fromGame: true });
          }
        }
      } catch (e) {
        // Non-fatal if terraforming utilities are not ready yet
      }
    }

    if (isActive('space') && typeof updateSpaceUI === 'function') {
      updateSpaceUI();
      if (typeof updateGalaxyUI === 'function') updateGalaxyUI({ force: force || forceAllSubtabs });
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
    renderProjects();
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
  const speed = (typeof gameSpeed !== 'undefined') ? gameSpeed : 1;
  const scaledDelta = delta * speed;
  const realIncrement = delta / 1000;
  realPlayTimeSeconds += realIncrement;
  totalRealPlayTimeSeconds += realIncrement;
  updateLogic(scaledDelta);   // Update game state
  updateRender.lastDelta = scaledDelta;
  updateRender();             // Render updated game state

  autosave(scaledDelta);      // Call the autosave function
}

function startNewGame() {
  defaultPlanet = 'mars';
  currentPlanetParameters = planetParameters.mars;
  totalPlayTimeSeconds = 0;
  totalRealPlayTimeSeconds = 0;
  initializeGameState();
  if (typeof openTerraformingWorldTab === 'function') {
    openTerraformingWorldTab();
  }
  updateRender(true, { forceAllSubtabs: true });
}

