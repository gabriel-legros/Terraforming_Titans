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
  // Instantiate the TabManager and load tabs from the constant
  tabManager = new TabManager({
    description: 'Manages game tabs and unlocks them based on effects.',
  }, tabParameters);

  // Set up the game scene, objects, and initial state
  const rotation = currentPlanetParameters.celestialParameters.rotationPeriod || 24;
  const dayDuration = rotationPeriodToDuration(rotation);
  dayNightCycle = new DayNightCycle(dayDuration);
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
  terraforming = new Terraforming(resources, celestialParameters);
  terraforming.initializeTerraforming();

  goldenAsteroid = new GoldenAsteroid();

  solisManager = new SolisManager();
  warpGateCommand = new WarpGateCommand();

  lifeDesigner = new LifeDesigner();
  lifeManager = new LifeManager();
  initializeLifeUI();

  milestonesManager = new MilestonesManager();
  createMilestonesUI();

  spaceManager = new SpaceManager(planetParameters);
  initializeHopeUI();
  initializeSpaceUI(spaceManager);

  if(!loadMostRecentSave()){  // Handle initial game state (building counts, etc.)
    initializeGameState();
  }
}

function initializeGameState(options = {}) {
  const preserveManagers = options.preserveManagers || false;
  const preserveJournal = options.preserveJournal || false;
  const skipStoryInitialization = options.skipStoryInitialization || false;
  let savedAdvancedResearch = null;
  let savedAlienArtifact = null;
  let savedProjectTravelState = null;
  let savedConstructionOffice = null;
  if (preserveManagers && typeof projectManager !== 'undefined' && typeof projectManager.saveTravelState === 'function') {
    savedProjectTravelState = projectManager.saveTravelState();
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
  tabManager = new TabManager({
    description: 'Manages game tabs and unlocks them based on effects.',
  }, tabParameters);

  if (!preserveJournal && typeof resetJournal === 'function') {
    resetJournal();
  }

  if (!preserveManagers) {
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

  const rotation = currentPlanetParameters.celestialParameters.rotationPeriod || 24;
  const dayDuration = rotationPeriodToDuration(rotation);
  dayNightCycle = new DayNightCycle(dayDuration);
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
  if (savedAdvancedResearch) {
    resources.colony.advancedResearch.value = savedAdvancedResearch.value;
    resources.colony.advancedResearch.unlocked = savedAdvancedResearch.unlocked;
  }
  if (savedAlienArtifact) {
    resources.special.alienArtifact.value = savedAlienArtifact.value;
    resources.special.alienArtifact.unlocked = savedAlienArtifact.unlocked;
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
  if (savedConstructionOffice && typeof restoreConstructionOfficeSettings === 'function') {
    restoreConstructionOfficeSettings(savedConstructionOffice);
  }
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
  const fundingRate = currentPlanetParameters.fundingRate || 0;
  fundingModule = new FundingModule(resources, fundingRate);
  populationModule = new PopulationModule(resources, currentPlanetParameters.populationParameters);

  celestialParameters = currentPlanetParameters.celestialParameters;
  terraforming = new Terraforming(resources, celestialParameters);
  terraforming.initializeTerraforming();

  goldenAsteroid = new GoldenAsteroid();

  if (!preserveManagers || !solisManager) {
    solisManager = new SolisManager();
  }
  if (!preserveManagers || !warpGateCommand) {
    warpGateCommand = new WarpGateCommand();
  }

  lifeDesigner = new LifeDesigner();
  lifeManager = new LifeManager();

  milestonesManager = new MilestonesManager();
  if (!preserveManagers) {
    storyManager = new StoryManager(progressData);  // Pass the progressData object
    if (!skipStoryInitialization) {
      storyManager.initializeStory();
      spaceManager = new SpaceManager(planetParameters);
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

  // When keeping existing managers, reapplied story effects need to
  // target the newly created game objects for this planet.
  if (preserveManagers && storyManager && typeof storyManager.reapplyEffects === 'function') {
    storyManager.reapplyEffects();
  }
  if (preserveManagers && skillManager && typeof skillManager.reapplyEffects === 'function') {
    skillManager.reapplyEffects();
  }
  if (preserveManagers && solisManager && typeof solisManager.reapplyEffects === 'function') {
    solisManager.reapplyEffects();
  }
  if (preserveManagers && warpGateCommand && typeof warpGateCommand.reapplyEffects === 'function') {
    warpGateCommand.reapplyEffects();
  }
  if (typeof nanotechManager !== 'undefined' && typeof nanotechManager.reapplyEffects === 'function') {
    nanotechManager.reapplyEffects();
    nanotechManager.updateUI();
  }
}

function updateLogic(delta) {
  const increment = delta / 1000;
  playTimeSeconds += increment;
  totalPlayTimeSeconds += increment;
  dayNightCycle.update(delta);

  const allStructures = {...buildings, ...colonies};
  // Update funding
  terraforming.update(delta);
  
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
  if (warpGateCommand) {
    warpGateCommand.update(delta);
  }

  lifeDesigner.update(delta);

  milestonesManager.update(delta);

  // **** Update the Story Manager ****
  // This will check objectives for active events, process completions,
  // apply rewards, and check for/activate newly available events.
  storyManager.update(); // <--- NEW CENTRAL UPDATE CALL

  recalculateTotalRates();

}

function updateRender(force = false) {
  // Always-on UI pieces
  updateDayNightDisplay();           // Day/night display is global
  updateResourceDisplay(resources);  // Resources are global
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
    }

    if (isActive('special-projects')) {
      renderProjects();
    }

    if (isActive('research')) {
      updateResearchUI();
    }

    if (isActive('terraforming')) {
      updateTerraformingUI();
    }

    if (isActive('space') && typeof updateSpaceUI === 'function') {
      updateSpaceUI();
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
    renderProjects();
    updateResearchUI();
    updateTerraformingUI();
    updateStatisticsDisplay();
    updateHopeUI();
    if (typeof updateSpaceUI === 'function') updateSpaceUI();
  }

  // Milestones often affect multiple views; keep updated
  updateMilestonesUI();
}

function update(time, delta) {
  const speed = (typeof gameSpeed !== 'undefined') ? gameSpeed : 1;
  const scaledDelta = delta * speed;
  updateLogic(scaledDelta);   // Update game state
  updateRender();             // Render updated game state

  autosave(scaledDelta);      // Call the autosave function
}

function startNewGame() {
  defaultPlanet = 'mars';
  currentPlanetParameters = planetParameters.mars;
  totalPlayTimeSeconds = 0;
  initializeGameState();
}
