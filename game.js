const config = {
  type: Phaser.AUTO,
  width: 0,
  height: 0,
  parent: 'container',
  scene: {
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

let defaultPlanet = 'mars';
let currentPlanetParameters = planetParameters[defaultPlanet];
let resources = {};
let maintenanceFraction = currentPlanetParameters.buildingParameters.maintenanceFraction;
let dayNightCycle;
let buildings = {};
let colonies = {};
let structures = {};
let populationModule;
let oreScanner = new OreScanning(currentPlanetParameters);
let projectManager;  // Use ProjectManager instead of individual projects

function preload() {
  // Load assets (images, sounds, etc.) here
}

function create() {
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

  colonies = initializeColonies(colonyParameters);
  createColonyButtons(colonies);

  // Combine buildings and colonies into the structures object
  structures = { ...buildings, ...colonies };

  // Initialize research
  researchManager = new ResearchManager(researchParameters);
  initializeResearch();

  //Initialize funding
  const fundingRate = currentPlanetParameters.fundingRate || 0;
  fundingModule = new FundingModule(resources, fundingRate);

  //initialize population module
  populationModule = new PopulationModule(resources, currentPlanetParameters.populationParameters);

  initializeGameState();  // Handle initial game state (building counts, etc.)
}

function initializeGameState() {
  const initialState = currentPlanetParameters.initialGameState;

  if (initialState && initialState.buildings) {
    for (const buildingName in initialState.buildings) {
      const count = initialState.buildings[buildingName];
      const building = buildings[buildingName];

      if (building) {
        building.count = count;
        building.active = count;
        building.setStorage(resources);
      }
    }
  }
}

function updateLogic(delta) {
  dayNightCycle.update(delta);

  const allStructures = {...buildings, ...colonies};
  // Update funding
  fundingModule.update(delta);
  produceResources(delta, allStructures, resources);

  // Update happiness for each colony
  for (const colonyName in colonies) {
    const colony = colonies[colonyName];
    colony.updateHappiness(delta);
  }

  populationModule.updatePopulation(delta);

  projectManager.updateProjects(delta); 
  oreScanner.updateScan(delta);  // Update ore scanning progress
  
}

function updateRender() {
  updateDayNightDisplay();           // Update day/night display (handled in dayNightCycle)
  updateResourceDisplay(resources);
  updateResourceRatesDisplay(resources);
  updateBuildingDisplay(buildings);  // Render building information
  updateColonyDisplay(colonies);     // Render colony information
  renderProjects();                  // Render project information (handled in projects.js)
  updateAllResearchButtons(researchManager.researches); // Update research buttons display
}

function update(time, delta) {
  updateLogic(delta);   // Update game state
  updateRender();       // Render updated game state
}