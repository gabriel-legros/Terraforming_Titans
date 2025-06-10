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

function preload() {
  // Load assets (images, sounds, etc.) here
}

function create() {
  // Instantiate the TabManager and load tabs from the constant
  tabManager = new TabManager({
    description: 'Manages game tabs and unlocks them based on effects.',
  }, tabParameters);

  // Set up the game scene, objects, and initial state
  dayNightCycle = new DayNightCycle(120000); // Day duration of 2 minutes (120000 milliseconds)
  updateDayNightDisplay();

  // Initialize resources
  resources = createResources(currentPlanetParameters.resources);
  createResourceDisplay(resources);

  // Initialize buildings
  buildings = initializeBuildings(buildingsParameters);
  createBuildingButtons(buildings);

  // Initialize projects using the ProjectManager
  projectManager = new ProjectManager();
  projectManager.initializeProjects(projectParameters);

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

  lifeDesigner = new LifeDesigner();
  lifeManager = new LifeManager();
  initializeLifeUI();

  milestonesManager = new MilestonesManager();
  createMilestonesUI();

  spaceManager = new SpaceManager(planetParameters);
  initializeSpaceUI(spaceManager);

  if(!loadMostRecentSave()){  // Handle initial game state (building counts, etc.)
    initializeGameState();
  }
}

function initializeGameState(options = {}) {
  const preserveManagers = options.preserveManagers || false;
  tabManager = new TabManager({
    description: 'Manages game tabs and unlocks them based on effects.',
  }, tabParameters);

  gameSettings.useCelsius = false;
  
  globalEffects = new EffectableEntity({description : 'Manages global effects'});

  dayNightCycle = new DayNightCycle(120000); // Day duration of 2 minutes (120000 milliseconds)
  resources = {};
  resources = createResources(currentPlanetParameters.resources);
  buildings = initializeBuildings(buildingsParameters);
  projectManager = new ProjectManager();
  projectManager.initializeProjects(projectParameters);
  oreScanner = new OreScanning(currentPlanetParameters);
  colonies = initializeColonies(colonyParameters);
  structures = { ...buildings, ...colonies };
  researchManager = new ResearchManager(researchParameters);
  if (!preserveManagers || !skillManager) {
    skillManager = new SkillManager(skillParameters);
  }
  const fundingRate = currentPlanetParameters.fundingRate || 0;
  fundingModule = new FundingModule(resources, fundingRate);
  populationModule = new PopulationModule(resources, currentPlanetParameters.populationParameters);

  celestialParameters = currentPlanetParameters.celestialParameters;
  terraforming = new Terraforming(resources, celestialParameters);
  terraforming.initializeTerraforming();

  goldenAsteroid = new GoldenAsteroid();

  lifeDesigner = new LifeDesigner();
  lifeManager = new LifeManager();

  milestonesManager = new MilestonesManager();
  if (!preserveManagers) {
    storyManager = new StoryManager(progressData);  // Pass the progressData object
    storyManager.initializeStory();
    spaceManager = new SpaceManager(planetParameters);
  }

  // Regenerate UI elements to bind to new objects
  createResourceDisplay(resources); // Also need to update resource display
  createBuildingButtons(buildings);
  createColonyButtons(colonies);
  initializeColonySlidersUI();
  initializeResearchUI(); // Reinitialize research UI as well
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
}

function updateLogic(delta) {
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

  autoBuild(allStructures);

  projectManager.updateProjects(delta); 
  oreScanner.updateScan(delta);  // Update ore scanning progress

  goldenAsteroid.update(delta);

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
  renderProjects();                  // Render project information (handled in projects.js)
  updateResearchUI();
  updateTerraformingUI();
  updateWarnings();
  updateMilestonesUI();
}

function update(time, delta) {

  updateLogic(delta);   // Update game state
  updateRender();       // Render updated game state

  autosave(delta);      // Call the autosave function
}