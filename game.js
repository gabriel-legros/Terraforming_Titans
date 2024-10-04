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
    target: 20,  // The game will run at 20 updates per second
    forceSetTimeOut: true  // Ensure that the tick rate is strictly followed
  }
};

const game = new Phaser.Game(config);

let defaultPlanet = 'mars';
let currentPlanetParameters = planetParameters[defaultPlanet];
let resources = {};
let maintenanceFraction = currentPlanetParameters.buildingParameters.maintenanceFraction;
let dayNightCycle;
let buildings = {};
let oreScanner = new OreScanning(currentPlanetParameters);

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
  buildings = initializeBuildings(buildingsParameters, maintenanceFraction);
  createBuildingButtons(buildings);

  // Initialize projects
  initializeProjects();

  colonies = initializeColonies(colonyParameters, maintenanceFraction);
  createColonyButtons(colonies);

  // Initialize research
  researchManager = new ResearchManager(researchParameters);
  initializeResearch();

  //Initialize funding
  const fundingRate = currentPlanetParameters.fundingRate || 0;
  fundingModule = new FundingModule(resources, fundingRate);

  //initialize population module
  populationModule = new PopulationModule(resources);

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

  populationModule.updatePopulation(delta);

  updateProjects(delta);  // Update project progress (handled in projects.js)
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