
let defaultPlanet = 'mars';
let tabManager;
let currentPlanetParameters = planetParameters[defaultPlanet];
let resources = {};
let maintenanceFraction = currentPlanetParameters.buildingParameters.maintenanceFraction;
let dayNightCycle;
let buildings = {};
let colonies = {};
let structures = {};
let populationModule;
let oreScanner = {};
let projectManager;  // Use ProjectManager instead of individual projects
let storyStarted = false;  // Track if the story has been triggered
let terraforming;
let lifeDesigner;
let lifeManager;

let gameSettings = { useCelsius: false };

let colonySliderSettings = {
  workerRatio: 0.5,
  foodConsumption: 1,
  luxuryWater: 1
};

let globalEffects = new EffectableEntity({description : 'Manages global effects'});
