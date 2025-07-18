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
    target: 30,  // The game will run at 20 updates per second
    forceSetTimeOut: true  // Ensure that the tick rate is strictly followed
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
  if (typeof initializeBuildingAlerts === 'function') {
    initializeBuildingAlerts();
  }

  // Initialize projects using the ProjectManager
  projectManager = new ProjectManager();
  projectManager.initializeProjects(projectParameters);
  if (typeof initializeProjectAlerts === 'function') {
    initializeProjectAlerts();
  }

  oreScanner = new OreScanning(currentPlanetParameters);

  colonies = initializeColonies(colonyParameters);
  createColonyButtons(colonies);
  initializeColonySlidersUI();

  // Combine buildings and colonies into the structures object
  structures = { ...buildings, ...colonies };

  // Initialize research
  researchManager = new ResearchManager(researchParameters);
  initializeResearchUI();

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
  if (preserveManagers && resources && resources.colony && resources.colony.advancedResearch) {
    savedAdvancedResearch = {
      value: resources.colony.advancedResearch.value,
      unlocked: resources.colony.advancedResearch.unlocked,
    };
  }
  tabManager = new TabManager({
    description: 'Manages game tabs and unlocks them based on effects.',
  }, tabParameters);

  if (!preserveJournal && typeof resetJournal === 'function') {
    resetJournal();
  }

  gameSettings.useCelsius = false;
  
  globalEffects = new EffectableEntity({description : 'Manages global effects'});

  playTimeSeconds = 0;

  const rotation = currentPlanetParameters.celestialParameters.rotationPeriod || 24;
  const dayDuration = rotationPeriodToDuration(rotation);
  dayNightCycle = new DayNightCycle(dayDuration);
  resources = {};
  resources = createResources(currentPlanetParameters.resources);
  if (savedAdvancedResearch) {
    resources.colony.advancedResearch.value = savedAdvancedResearch.value;
    resources.colony.advancedResearch.unlocked = savedAdvancedResearch.unlocked;
  }
  buildings = initializeBuildings(buildingsParameters);
  projectManager = new ProjectManager();
  projectManager.initializeProjects(projectParameters);
  oreScanner = new OreScanning(currentPlanetParameters);
  colonies = initializeColonies(colonyParameters);
  structures = { ...buildings, ...colonies };
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
}

function updateLogic(delta) {
  playTimeSeconds += delta / 1000;
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
  oreScanner.updateScan(delta);  // Update ore scanning progress

  goldenAsteroid.update(delta);

  if (solisManager) {
    solisManager.update(delta);
  }

  lifeDesigner.update(delta);

  milestonesManager.update(delta);

  // **** Update the Story Manager ****
  // This will check objectives for active events, process completions,
  // apply rewards, and check for/activate newly available events.
  storyManager.update(); // <--- NEW CENTRAL UPDATE CALL

  recalculateTotalRates();
}

function updateRender() {
  updateDayNightDisplay();           // Update day/night display (handled in dayNightCycle)
  updateResourceDisplay(resources);
  updateBuildingDisplay(buildings);  // Render building information
  updateColonyDisplay(colonies);     // Render colony information
  if (typeof updateGrowthRateDisplay === 'function') {
    updateGrowthRateDisplay();
  }
  renderProjects();                  // Render project information (handled in projects.js)
  updateResearchUI();
  updateTerraformingUI();
  updateWarnings();
  updateMilestonesUI();
  updateHopeUI();
  if (typeof updateSpaceUI === 'function') {
    updateSpaceUI();
  }
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
  initializeGameState();
}